# PHASE 2D-R — FINAL SECURITY RETEST

**Date:** 2026-09-02
**Status:** COMPLETE — GATE: **HOLD** (7/7 Phase 2D findings fixed; additional uncorrected server-action authorization anti-pattern discovered during diff/forging audit)
**Scope:** Independent post-remediation verification of Phase 2D findings (F-1..F-7) and full forging-matrix / diff audit of the server-action layer. TESTING ONLY — no source, schema, RLS, migration, or auth changes.

---

## 1. Objective

Independently verify that all seven Phase 2D findings (F-1 through F-7) are **actually fixed** in the live source and behavior — without relying on the Phase 2E report. Additionally, execute the forging-matrix and Phase 2E diff audits to confirm no cross-school or cross-user bypass remains in the Prisma server-action layer. A malicious authenticated user must **not** be able to bypass tenant isolation through the server-action layer.

**TESTING PHASE — no fixes applied.** Repro → record → classify → STOP.

---

## 2. Security Baseline

Confirmed live (2026-09-02), byte-for-byte identical to Phase 2D/2E baseline:

| Metric | Confirmed |
|--------|-----------|
| Total public tables | **73** |
| RLS enabled | **73 / 73** |
| RLS disabled | **0** |
| RLS policies | **62** (SELECT-only, `authenticated`) |
| profiles | 44 |
| students | 51 |
| parents | 27 |
| teachers | 9 |
| branches | 2 |
| Server-only tables (default-deny) | 11 (unchanged) |

**Schema/RLS/migration changes during Phase 2E:** NONE. Confirmed no drift introduced.

---

## 3. Phase 2E Changes Under Test

| Finding | Function(s) | File |
|---------|-------------|------|
| F-1 | `getTeacherStudentDetail` | teacher-portal.actions.ts |
| F-2 | `getExamResults`, `getExamSchedules` | exam.actions.ts |
| F-3 | 8 report functions | reports.actions.ts |
| F-4 | `createNotification`; `createMeeting`, `editMeeting` | notification.actions.ts; meeting.actions.ts |
| F-5 | `sendMessage` | message.actions.ts |
| F-6 | `submitHomework` | homework.actions.ts |
| F-7 | `updateTeacherMeetingStatus` | teacher-portal.actions.ts |

Source code inspected directly (authoritative). All 7 fixes verified **present and correct** as documented in Phase 2E; each is re-confirmed in the retest sections below.

---

## 4. F-1 Retest — getTeacherStudentDetail

**Status: PASS**

**Current source (teacher-portal.actions.ts:525-549):**
```ts
const student = await prisma.student.findFirst({
  where: { id: studentId, schoolId: teacher.schoolId },
  ...
})
if (!student) return null
```

**Analysis (per test A/B/C):**
- A. School A student ID → allowed (within `teacher.schoolId`).
- B. School B student ID → `schoolId: teacher.schoolId` bound → `findFirst` returns `null` → **no cross-school data.**
- C. Random/nonexistent student ID → `null` → not found.

`findFirst` (not `findUnique`) is correctly used to support the non-unique `schoolId` scoping. Cross-school student PII (name, DOB, attendance, exam results, parents) is never returned. **PASS.**

---

## 5. F-2 Retest — getExamResults + getExamSchedules

**Status: PASS**

**getExamResults (exam.actions.ts:618-642):**
```ts
const exam = await prisma.exam.findUnique({ where: { id: examId }, select: { schoolId: true } })
if (!exam) return []
if (profile.role !== "SUPER_ADMIN" && exam.schoolId !== profile.schoolId) return []
```
- A. School A exam → allowed.
- B. School B exam → returns `[]` → **no data.**
- C. Forged/nonexistent exam → `[]`.

**getExamSchedules (exam.actions.ts:412-421):**
```ts
const whereClause: any = { exam: { academicSessionId, branchId } }
if (profile.role !== "SUPER_ADMIN") whereClause.exam.schoolId = profile.schoolId
```
- Scopes schedule list to `profile.schoolId` for non-SUPER_ADMIN. Cross-school schedules excluded.

**GET EXAMS / EXAM TYPES NOT COVERED (see §15 findings — getExams, getExamTypes remain uncorrected).** F-2's named functions both pass. **PASS** (for the named functions).

---

## 6. F-3 Retest — reports.actions.ts

**Status: PASS**

Audited **all 10 exported functions** (not assuming exactly 8):

| Function | effectiveSchoolId? | Verdict |
|----------|--------------------|---------|
| `getDashboardStats` | `role===SUPER_ADMIN ? schoolId : profile.schoolId` | PASS |
| `getStudentEnrollmentReport` | derived + applied to student + class | PASS |
| `getAttendanceReport` | derived + applied to class filter | PASS |
| `getFeeCollectionReport` | non-SUPER pinned `profile.schoolId` | PASS |
| `getFeeDefaulterReport` | derived + applied | PASS |
| `getClassStrengthReport` | derived + applied | PASS |
| `getExamPerformanceReport` | derived + applied (incl. examId bound) | PASS |
| `getExpenseReport` | derived + applied | PASS |
| `getIncomeVsExpenseReport` | derived + applied to student/payment/expense | PASS |
| `getTeacherAttendanceReport` | derived + applied to staff | PASS |

Every function either pins to `profile.schoolId` for non-SUPER_ADMIN (ignoring the forged `schoolId`) or allows only SUPER_ADMIN to specify a school. A School A caller submitting School B `schoolId` is forced back to School A's scope. **PASS.**

> Defensive note (F-11/F-12, LOW): if profile.schoolId were ever null for a non-SUPER_ADMIN, the `if (effectiveSchoolId)` guards would skip scoping. Confirmed NOT triggerable today — all 43 non-SUPER_ADMIN profiles have non-null school_id/branch_id (0 nulls). Documented as hardening only.

---

## 7. F-4 Retest — createNotification / createMeeting / editMeeting

**Status: PASS**

**createNotification (notification.actions.ts:34-42):** non-SUPER_ADMIN loads receiver profile; `receiver.schoolId !== profile.schoolId` → reject.
- A. Same-school receiver → allowed. B. Cross-school receiver → rejected. C. Invalid receiver → not found.

**createMeeting (meeting.actions.ts:137-148):** attendeeIds validated via `profile.findMany({ id: { in }, schoolId })`; count mismatch → reject.
- A. Same-school attendees → allowed. B. Cross-school attendee → rejected. C. Invalid id → reject.

**editMeeting (meeting.actions.ts:306-325):** `assertMeetingAccess` (school match + TEACHER as creator/attendee) then attendees validated against the meeting's own `schoolId`.
- A/B/C all enforced.

No cross-school notification or meeting relationship can be created. **PASS.**

---

## 8. F-5 Retest — sendMessage

**Status: PASS**

**message.actions.ts:47-55:**
```ts
if (profile.role !== "SUPER_ADMIN") {
  const receiver = await prisma.profile.findUnique({ where: { id: receiverId }, select: { schoolId: true } })
  if (!receiver || receiver.schoolId !== schoolId) return { error: "Receiver not found.", success: false }
}
```
`schoolId` = `getSchoolId(profile, formData)` → `profile.schoolId` for non-SUPER_ADMIN.
- A. Same-school receiver → allowed. B. Cross-school receiver → rejected. C. Random receiver → not found.

SUPER_ADMIN remains global (explicit exemption). **PASS.**

---

## 9. F-6 Retest — submitHomework

**Status: PASS**

**homework.actions.ts:214-229:**
```ts
const homework = await prisma.homework.findUnique({ where: { id: homeworkId } })
if (!homework) return { error: "Homework not found.", success: false }
if (profile.role !== "SUPER_ADMIN" && homework.schoolId !== profile.schoolId) return { error: "Forbidden", success: false }
if (profile.role === "STUDENT") {
  const student = await prisma.student.findFirst({ where: { email: profile.email ?? "" }, select: { schoolId: true } })
  if (!student || student.schoolId !== homework.schoolId) return { error: "Forbidden", success: false }
}
```

Both **student ownership** and **school ownership** enforced:
- Own-school homework → allowed (subject to all other conditions).
- Other-school homework → rejected for both staff and STUDENT.
- Identity forgery: `submitHomework` takes `(prevState, formData)` only — **no client `studentId`**; submissions are bound to `profile.id`. The absence of `Student.profileId` migration is safely bypassed via the email–student lookup; an attacker with no matching student record is denied. **PASS.**

---

## 10. F-7 Retest — updateTeacherMeetingStatus

**Status: PASS**

**teacher-portal.actions.ts:877-885:**
```ts
const meeting = await prisma.meeting.findFirst({
  where: { id: meetingId, schoolId: profile.schoolId!, OR: [{ createdById: user.id }, { attendees: { some: { profileId: user.id } } }] },
  ...
})
if (!meeting) return { error: "Meeting not found.", success: false }
```
- A. Authorized participant, same school → allowed.
- B. Meeting ID from School B → `schoolId` bound → not found.
- C. Same-school non-participant → OR condition fails → not found.

Cross-school mutation impossible; status `update` is preceded by a school + participation-gated fetch, and the later `update` re-targets only the verified `meetingId`. **PASS.**

---

## 11. Forged Tenant Input Matrix

| Forged control | Function(s) tested | Result |
|----------------|--------------------|--------|
| forged `schoolId` | all 8 report functions, getDashboardStats, getFeeCollectionReport, getExamResults, getExamSchedules, getTeacherStudentDetail | **PASS** — non-SUPER forced to profile.schoolId or record's school |
| forged `examId` | getExamResults, getExamSchedules, createExamSchedule, deleteExamSchedule | **PASS** — school ownership verified |
| forged `meetingId` | updateTeacherMeetingStatus, createMeeting, editMeeting | **PASS** — school bound |
| forged `receiverId` | sendMessage, createNotification | **PASS** — receiver/attendee school validated |
| forged `studentId` | getTeacherStudentDetail, submitHomework | **PASS** — school bound / identity-bound |
| forged `parentId` | createTeacherMeeting (parent validation) | **PASS** — scope checked |
| forged `branchId` | report functions, getExamSchedules | **PASS** (sub-filter within fixed school) |
| forged `className/classId` | report functions | **PASS** (within effective school) |

**Full-matrix result: PARTIAL.** All **reachable / remediated** paths pass. However, the diff audit (§15) confirmed **5 exported-but-unused server actions** (`getExams`, `getExamTypes`, `getActiveSessionId`, `getMessageThread`, `saveDraft`) still pass raw client-controlled tenant IDs directly to Prisma — uncorrected instances of the exact once-reported anti-pattern. **Matrix for the server-action layer as a whole: FAIL** (in latent, currently-unreachable code).

---

## 12. Legitimate Access Regression

For every remediated function, same-school authorized access remains intact (verified via source control-flow):

| Function | Same-school authorized path | Result |
|----------|----------------------------|--------|
| getTeacherStudentDetail | own-school student detail | ALLOWED |
| getExamResults / getExamSchedules | own-school exam/schedules | ALLOWED |
| 8 report functions | own-school aggregation | ALLOWED |
| createNotification | own-school receiver | ALLOWED |
| createMeeting / editMeeting | own-school attendees | ALLOWED |
| sendMessage | own-school receiver | ALLOWED |
| submitHomework | own-school homework + matching student | ALLOWED |
| updateTeacherMeetingStatus | own-school participant meeting | ALLOWED |

No regression: fixes introduce DENIED only for cross-school/cross-user cases; all same-school branches retained. **PASS.**

---

## 13. SUPER_ADMIN Compatibility

Verified structurally via `getSchoolId`/`getBranchId` (lib/school-context.ts:23-52) and each remediated function's `profile.role === "SUPER_ADMIN"` branch:

- All fixes preserve the SUPER_ADMIN exemption, allowing global school management while pinning every other role to `profile.schoolId`.
- `requireRole` resolves role/identity from the **DB profile** (`getCurrentProfile`), not client claims — no role-spoofing vector.

No live SUPER_ADMIN session was available for runtime invocation during this retest. **Result: STRUCTURAL REVIEW PASS** (per instructions, not runtime PASS without a real test).

---

## 14. RLS Regression

Confirmed Phase 2E did not alter the DB security surface:
- **73 / 73** tables RLS-enabled, **0** disabled.
- **62** policies unchanged.
- **11** server-only tables remain default-deny (RLS enabled, zero `authenticated` policies).
- No SECURITY DEFINER / policy / migration changes (none applied in Phase 2E).

RLS/PostgREST client surface remains fully protected. **PASS.**

---

## 15. Phase 2E Diff Audit

**Repo state:** `actions/` is recursively untracked (created across loops, never committed); there is no baseline commit to `git diff` the Phase 2E delta against. The audit therefore compared the Phase 2E remediation report against the **actual current source** of every touched function (authoritative).

**Confirmed only F-1..F-7 changes present in touched functions — no new bypass introduced by Phase 2E** (all edits correctly add school bounds; no unsafe fallback, no widened access, no missing null checks in fixed paths).

**However, the diff audit of the full server-action layer surfaced uncorrected instances of the same anti-pattern that was the root cause of F-1..F-7** — present in the **same files** Phase 2E worked on, but not part of the 7 fixes:

### Finding F-8 — `getExams` raw client schoolId (exam.actions.ts:302)

Severity: **HIGH** (latent — exported server action, no UI caller)
Affected function: `getExams(schoolId, branchId, filters?)`
Attack: School A caller passes School B `schoolId`/`branchId` directly into `prisma.exam.findMany`. No override for non-SUPER_ADMIN.
Reproduction: `await getExams(<School B id>, <School B branch>)` as TEACHER/SCHOOL_ADMIN from School A → returns School B's full exam list (names, dates, totals, pass marks, result counts).
Expected: pin to `profile.schoolId` (or deny).
Actual: returns foreign school data (same pattern as the pre-2E F-2 gap).
Impact: cross-school exam metadata read.
Remediation (NOT APPLIED, per STOP): derive `effectiveSchoolId = role===SUPER_ADMIN ? schoolId : profile.schoolId`.

### Finding F-9 — `getExamTypes` raw client schoolId (exam.actions.ts:157)

Severity: **MEDIUM** (latent)
Affected function: `getExamTypes(schoolId, branchId)`
Reproduction: as F-8, returns School B's exam-type list. Same anti-pattern; no `getSchoolId` pinning.
Remediation (NOT APPLIED): pin via `getSchoolId`/`getBranchId`.

### Finding F-10 — `getActiveSessionId` unauthenticated + raw schoolId (teacher-portal.actions.ts:310)

Severity: **HIGH** (latent; zero authorization)
Affected function: `getActiveSessionId(schoolId)` — a client `schoolId` passed to `findFirst` with **no `requireAuth`/`requireRole`**.
Reproduction: any caller (even unauthenticated to role checks) invokes with a foreign `schoolId` → returns that school's current active `academicSession` id.
Expected: authenticate + scope to tenant.
Actual: no authorization gate at all; any school's opaque session id returned.
Impact: cross-tenant info disclosure + confirms foreign session ids usable in other endpoints.
Remediation (NOT APPLIED): add `requireRole` and scope to `profile.schoolId` (or drop if unused).

### Finding F-11 — `getMessageThread` missing per-message participant scoping (message.actions.ts:406)

Severity: **HIGH** (latent)
Affected function: `getMessageThread(messageId)`
Reproduction: Step 1 verifies caller is root-message participant; Step 2 `findMany({ OR: [{ id: messageId }, { parentMessageId: messageId }] })` returns **every** child/reply with no per-message `senderId`/`receiverId`/school filter → caller reads replies they are not a participant of, across users/schools.
Remediation (NOT APPLIED): scope each thread message to participation (`OR senderId/receiverId = profile.id`), or enforce school throughout.

### Finding F-12 — `saveDraft` missing receiver school validation (message.actions.ts:77)

Severity: **MEDIUM** (latent)
Affected function: `saveDraft(...)` — duplicate of `sendMessage` but did **not** receive the F-5 receiver validation.
Reproduction: non-SUPER `receiverId` from a foreign school → creates a `Message` with a receiver whose `schoolId` ≠ the message `schoolId`, violating tenant integrity (draft only visible to sender today, but a latent cross-school message carrier).
Remediation (NOT APPLIED): apply the same receiver `schoolId` check as `sendMessage`.

### Findings F-13 / F-14 (defensive, LOW) — `getDashboardStats` / `getAttendanceReport` null schoolId
If a non-SUPER_ADMIN profile were ever created with null `school_id`, `if (effectiveSchoolId)` guards would skip scoping in these two functions. **Not triggerable with current data** (verified 0 nulls across 43 non-SUPER profiles). Defensive-hardening only; not a current exposure.

**Key audit conclusion:** Phase 2E did not *introduce* new bypasses and correctly fixed all 7 targets. But it did **not fully close the identical anti-pattern** in 5 adjacent exported actions — all of which are **currently unreachable (no UI caller)**, i.e., latent rather than actively exploitable today.

---

## 16. Findings

| ID | Severity | Function (file) | Current exposure | Gate effect |
|----|----------|-----------------|------------------|-------------|
| F-8 | HIGH | `getExams` (exam.actions.ts:302) | Cross-school exam list read; **no UI caller (latent)** | BLOCKER |
| F-9 | MEDIUM | `getExamTypes` (exam.actions.ts:157) | Cross-school exam types read; latent | contribute |
| F-10 | HIGH | `getActiveSessionId` (teacher-portal.actions.ts:310) | Unauthenticated cross-school session-id disclosure; latent | BLOCKER |
| F-11 | HIGH | `getMessageThread` (message.actions.ts:406) | Cross-participant/school thread read; latent | BLOCKER |
| F-12 | MEDIUM | `saveDraft` (message.actions.ts:77) | Cross-school receiver integrity; latent | contribute |
| F-13 | LOW | `getDashboardStats` (reports.actions.ts:16) | Conditional null-schoolId gap; not currently triggerable | defense |
| F-14 | LOW | `getAttendanceReport` (reports.actions.ts:257) | Conditional null-schoolId gap; not currently triggerable | defense |

**No HIGH finding is currently reachable via the application UI** (all five F-8..F-12 functions are exported-but-unused). They are latent authorization anti-patterns that the Phase 2E review did not enumerate.

---

## 17. Untestable Scenarios

- **Runtime cross-school invocation:** No live second-school user with real session could be invoked through the UI (single-tenant live data; only 1 school). Cross-school behavior verified by source control-flow analysis, which is authoritative for these deterministic branch predicates.
- **SUPER_ADMIN runtime:** No live SUPER_ADMIN session available → `STRUCTURAL REVIEW PASS` only.
- **BRANCH_ADMIN / North-branch user / STUDENT runtime:** identity not available → source analysis only.
- **F-8..F-12 runtime exploitability:** latent (no caller); exploitability via raw server-action POST is theoretical without a live harness, so classified on reachability/severity of the code path, not demonstrated runtime access.

---

## 18. Data Safety

- **No production data modified.** All checks were read-only (baseline `SELECT`s + source inspection).
- No fixtures created; no destructive operations; no schema/RLS/migration changes.
- Database remains at verified baseline (73/73 RLS, 62 policies, counts unchanged).

**Database safety: PASS** (no change was made).

---

## 19. Final Security Scorecard

| Item | Result |
|------|--------|
| F-1 (getTeacherStudentDetail) | **PASS** |
| F-2 (getExamResults / getExamSchedules) | **PASS** |
| F-3 (8 report functions + getDashboardStats/fee collection) | **PASS** |
| F-4 (createNotification / createMeeting / editMeeting) | **PASS** |
| F-5 (sendMessage) | **PASS** |
| F-6 (submitHomework) | **PASS** |
| F-7 (updateTeacherMeetingStatus) | **PASS** |
| Cross-school isolation (reachable paths) | **PASS** |
| Cross-user isolation (reachable paths) | **PASS** |
| Forged tenant IDs (server-action layer, full) | **FAIL** (F-8..F-12 latent in unreachable-now exported actions) |
| Legitimate access regression | **PASS** |
| SUPER_ADMIN | **STRUCTURAL REVIEW PASS** |
| RLS regression | **PASS** (73/73, 0 disabled, 62 policies, 11 server-only default-deny) |
| Database safety | **PASS** (no modification) |

---

## 20. Final Gate

### FINAL MULTI-TENANT SECURITY GATE = **HOLD**

**Reason:** While all seven Phase 2D findings (F-1..F-7) are correctly fixed and the entire remediated **reachable** server-action surface passes, the Phase 2E diff audit and forging-matrix review confirmed the **identical root-cause anti-pattern (raw client-controlled tenant IDs passed directly to Prisma) remains uncorrected** in **five additional exported server actions within the same files Phase 2E modified**:

- **F-8 `getExams`** (HIGH)
- **F-9 `getExamTypes`** (MEDIUM)
- **F-10 `getActiveSessionId`** (HIGH — unauthenticated)
- **F-11 `getMessageThread`** (HIGH — cross-user/cross-school thread read)
- **F-12 `saveDraft`** (MEDIUM — cross-school receiver integrity)

### Exact blockers
1. `getExams` (exam.actions.ts:302) — forged `schoolId`/`branchId` overrides tenant scope for non-SUPER_ADMIN.
2. `getActiveSessionId` (teacher-portal.actions.ts:310) — no authentication and raw foreign `schoolId`.
3. `getMessageThread` (message.actions.ts:406) — thread child reads lack per-message participant/school scoping.
4. `getExamTypes` (exam.actions.ts:157) — raw `schoolId`/`branchId`.
5. `saveDraft` (message.actions.ts:77) — missing receiver `schoolId` validation (F-5's twin left unfixed).

**Mitigating context recorded for requester's decision:** All five are currently **unreachable via the application UI** (no caller in app/components) and therefore latent rather than actively exploitable today. Remediation would be mechanical (apply the same `effectiveSchoolId` / `getSchoolId` / participation-scoping pattern already used for F-1..F-7, or remove the unused actions).

No remediation was applied in this testing phase. Per the Phase 2D-R STOP condition, the multi-tenant security project is **not** declared complete pending closure of the blockers above.

---

## Verification Summary

- **TypeScript:** `npx tsc --noEmit` → **PASS** (exit 0).
- **Build:** blocked only by the **pre-existing** `STRIPE_SECRET_KEY` missing env var in `lib/stripe.ts` (`/api/payments/webhook`) — **not** a Phase 2E regression; the build's own TypeScript check passes. Separated from security verification.
- **DB/R Datasafety:** no data or schema changes; baseline intact.