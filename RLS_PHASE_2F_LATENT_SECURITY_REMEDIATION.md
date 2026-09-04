# PHASE 2F — LATENT SERVER-ACTION SECURITY REMEDIATION

**Date:** 2026-09-02
**Status:** COMPLETE — Phase 2F: **PASS** (F-8..F-12 remediated; no regressions; DB/RLS surface untouched)
**Scope:** Remediate ONLY F-8, F-9, F-10, F-11, F-12 — the five latent (exported-but-unused) server-action authorization anti-patterns identified in Phase 2D-R. Fixed in `exam.actions.ts`, `teacher-portal.actions.ts`, `message.actions.ts`.

---

## 1. Objective

Secure the five latent server-action authorization gaps discovered during Phase 2D-R (FINAL gate = HOLD). These functions were exported but unused by UI callers, so they posed no *current* exploitable path — but they carried the identical root-cause anti-pattern (raw client-controlled tenant IDs → direct Prisma access) that Phase 2E fixed for F-1..F-7. Phase 2F applies the established authorization pattern to close them forever, before future code can expose them.

**Rule applied throughout:** `AUTHENTICATED PROFILE → EFFECTIVE TENANT → VERIFIED RESOURCE OWNERSHIP`, never `CLIENT INPUT → DATABASE ACCESS`.

---

## 2. Scope

**Files modified (exactly 3):**
- `actions/exam.actions.ts` → F-8 (`getExams`), F-9 (`getExamTypes`)
- `actions/teacher-portal.actions.ts` → F-10 (`getActiveSessionId`)
- `actions/message.actions.ts` → F-11 (`getMessageThread`), F-12 (`saveDraft`)

**Explicitly NOT modified:** `prisma/schema.prisma`, database schema, RLS policies, Supabase migrations, authentication architecture, middleware, unrelated actions, UI components.

**Reused established patterns (no new authorization architecture):**
- `requireRole(...)` — authenticates and returns `{ profile }` resolved from the **DB profile** (lib/auth.ts), not client claims.
- `effectiveSchoolId = profile.role === "SUPER_ADMIN" ? <client> : profile.schoolId!` — the identical derivation used in `reports.actions.ts` (F-3) and `getSchoolId()`/`getBranchId()` (lib/school-context.ts).
- `sendMessage`'s receiver-school validation (F-5) reused for `saveDraft` (F-12).
- `getMessageThread` participant scoping mirrors the existing `senderId`/`receiverId` participation pattern used across `message.actions.ts`.

---

## 3. Findings Fixed

### F-8 — HIGH — `getExams` (actions/exam.actions.ts:305)

**Original vulnerability:** Client-supplied `schoolId` and `branchId` were passed directly into `prisma.exam.findMany`, so a non-SUPER_ADMIN from School A could read School B's entire exam list.

**Remediation:**
```ts
const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")
const effectiveSchoolId = profile.role === "SUPER_ADMIN" ? schoolId : profile.schoolId!
const effectiveBranchId = profile.role === "SUPER_ADMIN" ? branchId : profile.branchId!
return prisma.exam.findMany({ where: { schoolId: effectiveSchoolId, branchId: effectiveBranchId, ... } })
```

**Authorization logic:** For non-SUPER_ADMIN, both school and branch are pinned to the authenticated profile's `schoolId`/`branchId`. Since `Branch.schoolId` is a verified FK (a branch belongs to exactly one school), the effective branch is inherently within the effective school — a forged foreign `branchId` cannot escape the caller's school. SUPER_ADMIN may explicitly query any school/branch (intentional platform behavior preserved).

### F-9 — MEDIUM/HIGH — `getExamTypes` (actions/exam.actions.ts:157)

**Original vulnerability:** Raw client `schoolId`/`branchId` trusted in `prisma.examType.findMany`.

**Remediation:** Same `effectiveSchoolId`/`effectiveBranchId` derivation as F-8.

**Authorization logic:** Non-SUPER_ADMIN always scopes to `profile.schoolId`/`profile.branchId`; client values ignored. SUPER_ADMIN explicit override retained.

### F-10 — HIGH — `getActiveSessionId` (actions/teacher-portal.actions.ts:310)

**Original vulnerability:** No authentication at all, and raw foreign `schoolId` accepted.

**Remediation:**
```ts
export async function getActiveSessionId(schoolId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PARENT")
  const effectiveSchoolId = profile.role === "SUPER_ADMIN" ? schoolId : profile.schoolId
  const session = await prisma.academicSession.findFirst({
    where: { schoolId: effectiveSchoolId!, isCurrent: true },
    select: { id: true },
  })
  return session?.id
}
```

**Authorization logic:** Added mandatory `requireRole` (authenticates via `requireAuth` + DB profile). Unauthenticated callers are denied. Non-SUPER_ADMIN can only resolve the active session for their **own** school, ignoring any supplied foreign `schoolId`. SUPER_ADMIN may query any school's active session (explicit). Added the `requireRole` import to `teacher-portal.actions.ts` (the file previously imported only `requireAuth`).

### F-11 — HIGH — `getMessageThread` (actions/message.actions.ts:416)

**Original vulnerability:** Step 1 verified the caller is a participant of the root message, but Step 2 fetched **all** child/reply messages (`parentMessageId = messageId`) with no per-message participant or school scope — letting a caller read replies they are not a party to, across users/schools.

**Remediation:**
```ts
// Step 1 (unchanged): root must involve caller
if (!message) return null
// NEW Step 2: root's school must match caller's school (non-SUPER_ADMIN)
const rootMessage = await prisma.message.findUnique({ where: { id: messageId }, select: { schoolId: true } })
if (profile.role !== "SUPER_ADMIN" && (!rootMessage || rootMessage.schoolId !== profile.schoolId)) return null
// NEW Step 3: only return edges where the caller is a participant
const edges = await prisma.message.findMany({ where: { OR: [{ id: messageId }, { parentMessageId: messageId }] }, select: { id, senderId, receiverId } })
const allowedIds = new Set(edges.filter((m) => m.senderId === profile.id || m.receiverId === profile.id).map((m) => m.id))
const thread = await prisma.message.findMany({ where: { id: { in: [...allowedIds] } }, ... })
```

**Authorization logic:** Every returned message must be one the caller is a `senderId` or `receiverId` of. For non-SUPER_ADMIN the root message's school must also equal the caller's school. This closes both the cross-user read (unrelated replies hidden) and cross-school read, while preserving sender's and receiver's legitimate access to their own conversation. SUPER_ADMIN retains full participant access (no bypass introduced).

### F-12 — MEDIUM — `saveDraft` (actions/message.actions.ts:77)

**Original vulnerability:** `sendMessage` (F-5) validated the receiver's school; its twin `saveDraft` did not — a non-SUPER_ADMIN could save a draft referencing a cross-school receiver, breaking tenant integrity.

**Remediation (reuses the F-5 pattern):**
```ts
if (profile.role !== "SUPER_ADMIN" && receiverId !== profile.id) {
  const receiver = await prisma.profile.findUnique({ where: { id: receiverId }, select: { schoolId: true } })
  if (!receiver || receiver.schoolId !== schoolId) return { error: "Receiver not found.", success: false }
}
```

**Authorization logic:** For non-SUPER_ADMIN, a non-self receiver must exist and belong to the effective school (`schoolId` = `getSchoolId(...)` → `profile.schoolId`). Self-drafts (`receiverId === profile.id`) are exempt (sender == receiver, trivially same school). SUPER_ADMIN exempted (global). No duplicated logic — mirrors `sendMessage` exactly.

---

## 4. Forged Tenant Input Protection

| Forged control | Gate | Protected by |
|----------------|------|--------------|
| `schoolId` (getExams, getExamTypes, getActiveSessionId) | PASS | `effectiveSchoolId = profile.role===SUPER_ADMIN ? client : profile.schoolId` |
| `branchId` (getExams, getExamTypes) | PASS | `effectiveBranchId` pinned to `profile.branchId` (FK-subset of `profile.schoolId`) |
| `receiverId` (saveDraft) | PASS | receiver `schoolId` verified against effective school |
| `messageId` (getMessageThread) | PASS | root must involve caller + same school; children must involve caller |

Client-controlled identifiers can no longer override authenticated tenant identity in any of the five remediated functions.

---

## 5. Authentication Fix

- **F-10 `getActiveSessionId`** was previously **unauthenticated**; now requires `requireRole(...)` → `requireAuth` throws for unauthenticated callers (denied). Identity/role resolved from the DB profile, not client claims.
- **F-8 / F-9 / F-11 / F-12** all already called `requireRole(...)` (authenticated); each now also captures the returned `{ profile }` to derive tenant scope instead of trusting client input.

---

## 6. Message Participant Protection

`getMessageThread` now enforces, per returned record, that the caller is an actual participant (`senderId` or `receiverId`), with the root additionally school-bound for non-SUPER_ADMIN. A caller authorized for one message no longer inherits access to unrelated messages. `saveDraft` ensures a draft cannot target a cross-school receiver.

---

## 7. SUPER_ADMIN Compatibility

Every fix preserves the `profile.role === "SUPER_ADMIN"` branch, allowing the platform admin to:
- Query exams / exam types / active sessions for any school/branch explicitly (F-8, F-9, F-10).
- Read threads and target any receiver globally (F-11, F-12).

No SUPER_ADMIN capability was removed; all non-admin behavior is now strictly tenant-scoped. **STRUCTURAL PASS** (no live SUPER_ADMIN session available for runtime invocation — consistent with prior phases).

---

## 8. Verification

**TypeScript:** `npx tsc --noEmit` → **PASS** (exit 0). All five edits compile cleanly (correct `requireRole` usage, `Set` spread into `id: { in: [...] }`, non-null assertions consistent with prior patterns).

**Focused security tests (source-control-flow; deterministic branches):**
| Finding | Attack | Expected | Actual | Result |
|---------|--------|----------|--------|--------|
| F-8 | School A caller → own exams | own data | own data (pinned) | PASS |
| F-8 | School A caller + School B schoolId | no School B data | pinned to profile.schoolId | PASS |
| F-8 | School A caller + School B branchId | no School B data | pinned to profile.branchId (in-school) | PASS |
| F-8 | Random schoolId / branchId | no unauthorized data | enforced scope | PASS |
| F-9 | School A caller → own exam types | own data | own data (pinned) | PASS |
| F-9 | School A caller + School B / random schoolId | no foreign data | pinned | PASS |
| F-10 | Unauthenticated | denied | requireRole throws | PASS |
| F-10 | School A caller → own active session | own session | profile.schoolId scope | PASS |
| F-10 | School A caller + School B / random schoolId | no foreign session | pinned | PASS |
| F-11 | Sender reads own thread | own conversation | participant-filtered | PASS |
| F-11 | Receiver reads own thread | own conversation | participant-filtered | PASS |
| F-11 | Same-school unrelated user | denied | Step 1 (not participant) fails | PASS |
| F-11 | Cross-school user | denied | Step 1 / Step 2 fails | PASS |
| F-11 | Random messageId | denied | not found | PASS |
| F-12 | Same-school receiver | allowed | receiver school == schoolId | PASS |
| F-12 | Cross-school receiver | denied | "Receiver not found" | PASS |
| F-12 | Random / forged receiver | denied | not found / school mismatch | PASS |
| F-12 | Self-draft | allowed | receiverId === profile.id exempt | PASS |

**Full regression (F-1..F-7):** Re-verified all prior protections remain present and un-weakened:
- F-1 `getTeacherStudentDetail`: `schoolId: teacher.schoolId` ✓
- F-2 `getExamResults`: `exam.schoolId !== profile.schoolId` ✓ / `getExamSchedules`: schoolId in whereClause ✓
- F-3 all 8 report functions: `effectiveSchoolId` derivation ✓ (lines 213/247/342/380/422/476/520/590)
- F-4 `createNotification`: receiver school check ✓; meeting createMeeting/editMeeting attendee validation unmodified ✓
- F-5 `sendMessage`: receiver school check ✓
- F-6 `submitHomework`: homework + student school checks ✓
- F-7 `updateTeacherMeetingStatus`: `schoolId: profile.schoolId!` ✓

No Phase 2F function overlaps any F-1..F-7 function.

**git diff / file audit:** Only the 3 intended files (inside the untracked `actions/` dir) were edited. Tracked-file modifications (`.gitignore`, `AGENTS.md`, `package.json`, `tsconfig.json`, etc.) are pre-existing from prior loops and were NOT touched by Phase 2F. `prisma/schema.prisma` and all migrations show **no** modification. No RLS/migration/auth-middleware change.

**RLS regression:** Live query confirms **73/73 RLS enabled, 0 disabled, 62 policies**, profiles=44, students=51, teachers=9, branches=2 — unchanged. 11 server-only default-deny tables unaffected.

---

## 9. Data Safety

- **No production data modified.** All fixes are application-layer source changes.
- No destructive SQL, no fixtures, no schema/RLS/migration operations.
- Mutation-path tests (saveDraft, getMessageThread) verify **authorization denial before any write/read** of unwanted records; the only writes require a validated same-school receiver/participant, and legitimate-access verification is structural (functions are currently UI-unused).
- Database remains at the verified baseline.

---

## 10. Final Phase 2F Scorecard

| Item | Result |
|------|--------|
| F-8 (getExams) | **PASS** |
| F-9 (getExamTypes) | **PASS** |
| F-10 (getActiveSessionId) | **PASS** |
| F-11 (getMessageThread) | **PASS** |
| F-12 (saveDraft) | **PASS** |
| Forged schoolId protection | **PASS** |
| Forged branchId protection | **PASS** |
| Unauthenticated access | **PASS** |
| Cross-school message access | **PASS** |
| Cross-school draft receiver | **PASS** |
| SUPER_ADMIN compatibility | **STRUCTURAL PASS** |
| TypeScript | **PASS** |
| RLS regression | **PASS** |
| Data safety | **PASS** |

---

## Outcome

Phase 2F **PASS**: all five latent findings (F-8..F-12) remediated using the established Phase 2E authorization patterns (`requireRole` + `effectiveSchoolId`/`effectiveBranchId` derivation + participant/receiver verification). No regressions to F-1..F-7, no DB/RLS/schema changes, TypeScript clean. Per the mandate, this document does **not** claim `FINAL MULTI-TENANT SECURITY GATE = PASS` — that decision belongs to the next independent retest phase after human review.
