# PHASE 2D — FINAL END-TO-END SECURITY TEST

**Date:** 2026-09-02
**Status:** COMPLETE — GATE: NOT PASS (HIGH findings in server-action layer)
**Scope:** Full penetration test of multi-tenant RLS architecture across both the Supabase PostgREST client surface and the Prisma server-action layer.

---

## 1. OBJECTIVE

Perform end-to-end security testing of the multi-tenant RLS security architecture. Verify that an attacker authenticated as one user **cannot** access, modify, enumerate, or infer another user's, branch's, or school's protected data. Answer: **"Can an attacker authenticated as one user access/modify/enumerate/infer another user's, branch's, or school's protected data?"**

**Phase 2D is verification-first: test, audit, document; NO fixes or source changes.**

---

## 2. ARCHITECTURE UNDER TEST

| Component | Details |
|-----------|---------|
| PostgREST Client Surface | Supabase `authenticated` role, JWT-derived identity via `auth.uid()` |
| Server-Action Layer | Prisma as `postgres` (bypassrls=true), `requireRole` + `getSchoolId`/`getBranchId` helpers |
| RLS Policies | 62 SELECT-only policies on 62 tables, `authenticated` role, no INSERT/UPDATE/DELETE policies = full default-deny for writes |
| Server-Only Tables | 11 tables (exam_results, report_cards, homework_submissions, submission_attachments, online_exam_attempts, online_exam_questions, permissions, role_permissions, messages, message_attachments, audit_logs) — RLS enabled, 0 authenticated policies, client default-deny |
| SECURITY DEFINER Helpers | 8 functions: auth_profile, is_super_admin, auth_check_school, auth_check_branch, auth_role, auth_school_id, auth_branch_id, check_tenant_access |
| Key Helpers | `getSchoolId(profile, formData)` — forces `profile.schoolId` for non-SUPER_ADMIN; `getBranchId(profile, formData)` — forces `profile.branchId` for non-SUPER_ADMIN; `requireRole(...roles)` — resolves role from DB profile, not client claim |

---

## 3. BASELINE (Re-verified 2026-09-02)

| Table | Count | Notes |
|-------|-------|-------|
| profiles | 44 | All roles |
| students | 51 | All in Main Campus |
| parents | 27 | |
| teachers | 9 | |
| classes | 11 | Main Campus only |
| schools | 1 | `41f32895-01e6-495f-b36b-9c3ec584dea1` |
| branches | 2 | Main (`9324ce1b`) + North (`06966ac9`) |
| fee_invoices | 30 | |
| payments | 20 | |
| announcements | 7 | |
| library_books | 10 | |
| vehicles | 4 | |
| exams | 64 | |
| notifications | 15 | |
| permissions | 71 | Server-only |
| role_permissions | 276 | Server-only |
| messages | 18 | Server-only |

**RLS status:** 73 tables with RLS ENABLED, 0 disabled, 0 tables without RLS.
**Data distribution:** 100% of student/class/invoice/payment/exam data is in Main Campus (`9324ce1b`). North Campus (`06966ac9`) is empty (0 in all tables).

---

## 4. TEST IDENTITIES

| Role | User ID | Email | School | Branch | Status |
|------|---------|-------|--------|--------|--------|
| SUPER_ADMIN | `41c3b981-2e39-4539-b0b4-8b87bc9750ae` | — | `41f32895` | `9324ce1b` | ✅ Available |
| SCHOOL_ADMIN | `65f1862f-34b0-4f5b-a537-1cac0efb5f63` | tahabaig440@gmail.com | `41f32895` | `9324ce1b` | ✅ Available |
| PRINCIPAL | `593b4ea3-8821-4997-982c-49eb73f12aaa` | — | `41f32895` | `9324ce1b` | ✅ Available |
| TEACHER | `cf3226d6-fee0-4f13-9e4b-77bb596283ff` | — | `41f32895` | `9324ce1b` | ✅ Available |
| PARENT | `ab1408d2-45ac-46e3-a4bf-f463b34bf0ae` | — | `41f32895` | `9324ce1b` | ✅ Available |

**NOT TESTABLE (no live user / single-tenant data):**

| Identity | Reason |
|----------|--------|
| BRANCH_ADMIN | No live user exists |
| School B cross-school user | Only 1 school exists; fabricated foreign ID `00000000-0000-0000-0000-0000000000ff` used as negative test |
| North-branch user | No data in North Campus; no user assigned exclusively |
| STUDENT | No STUDENT uid available; STUDENT-path testing limited to source audit |

---

## 5. TEST METHOD

All SQL tests use `SET ROLE authenticated; SELECT set_config('request.jwt.claims','{"sub":"<uid>","role":"authenticated"}',false);` then execute queries as the authenticated PostgREST context. `RESET ROLE` after each test.

Anonymous tests use `SET ROLE anon`. Prisma server-action tests are source-code audits (read-only verification).

---

## 6. ANONYMOUS ACCESS ATTACKS

**Question:** Can an unauthenticated (anon) user read, insert, update, or delete protected data?

| Test | Result | Evidence |
|------|--------|----------|
| SELECT on anon-granted tables (classes, exams, fee_invoices, payments, messages, audit_logs, homework) | **PASS — 0 rows** | RLS default-deny blocks all reads (no policy for `anon` role) |
| SELECT on students/profiles (no anon grant) | **PASS — 42501 permission denied** | No SQL grant to anon for these tables |
| INSERT into classes (anon-granted, RLS-enabled) | **PASS — 42501 new row violates row-level security policy** | RLS INSERT default-deny prevents write |
| UPDATE on classes (anon-granted) | **PASS — 0 rows affected; data unchanged** | RLS SELECT blocks visibility → silent 0-row update |
| DELETE on exams (anon-granted) | **PASS — 0 rows affected** | Same mechanism |

**Verdict: ANONYMOUS ACCESS — PASS**

---

## 7. CROSS-SCHOOL READ ATTACKS

**Question:** Can a user from school A read data belonging to school B?

SCHOOL_ADMIN (`65f1862f`) tested against fabricated foreign school ID `00000000-0000-0000-0000-0000000000ff`:

| Table | Own-school count | Foreign school count | Result |
|-------|-----------------|---------------------|--------|
| students | 51 | 0 | PASS |
| exams | 64 | 0 | PASS |
| fee_invoices | 30 | 0 | PASS |
| payments | 20 | 0 | PASS |
| classes | 11 | 0 | PASS |
| announcements | 7 | 0 | PASS |
| library_books | 10 | 0 | PASS |
| vehicles | 4 | 0 | PASS |

**Nested JOIN traversal (foreign school → child → grandchild):**

| Path | Result |
|------|--------|
| sections → classes (foreign school) | 0 sections |
| exam_schedules → exams (foreign school) | 0 schedules |
| teacher_assignments → classes (foreign school) | 0 assignments |
| staff_salaries → staff (foreign school) | 0 salaries |
| fee_invoice_items → fee_invoices → students (foreign school) | 0 items |

**Verdict: CROSS-SCHOOL READ — PASS**

---

## 8. CROSS-SCHOOL AGGREGATION & JOIN LEAKAGE

**Question:** Can an attacker infer cross-tenant data via COUNT/SUM/AVG/GROUP BY on aggregated queries?

SCHOOL_ADMIN authenticated aggregation on own-school data:

| Aggregation | Result |
|-------------|--------|
| COUNT(students) | 51 (own school only) |
| SUM(fee_invoices.total_amount) | 225000 (own school only) |
| SUM(payments.amount) | 150000 (own school only) |
| GROUP BY on classes | 11 classes (own school only) |

No cross-tenant aggregation possible via PostgREST — RLS blocks row visibility before aggregation runs.

**Verdict: AGGREGATION/JOIN LEAKAGE — PASS**

---

## 9. ID ENUMERATION ATTACKS

**Question:** Can an attacker guess or enumerate IDs from other tenants?

| Test | Result |
|------|--------|
| Foreign student ID → students table | 0 rows |
| Foreign exam ID → exams table | 0 rows |
| Foreign exam ID → exam_results (server-only) | 0 rows |

**Verdict: ID ENUMERATION — PASS**

---

## 10. CROSS-USER PRIVATE DATA (SAME SCHOOL)

**Question:** Within the same school, can one user read another user's private data?

TEACHER (`cf3226d6`) tested against other users' private data:

| Table | Expected | Actual | Result |
|-------|----------|--------|--------|
| notifications (other users') | 0 | 0 | PASS |
| messages (server-only) | 0 | 0 | PASS |
| exam_results (server-only) | 0 | 0 | PASS |
| user_permissions | 0 | 0 | PASS |
| leave_requests (other users') | 0 | 0 | PASS |

**Positive control:** SUPER_ADMIN sees own notifications (15) and own meeting_attendees (4) — owner-scoped policies working.

**Verdict: CROSS-USER PRIVATE DATA — PASS**

---

## 11. SERVER-ONLY TABLE TESTS (11 Tables)

**Question:** Are the 11 server-only tables (RLS enabled, 0 authenticated policies) fully denied for all client operations?

These tables are served exclusively via Prisma (`postgres` role, bypassrls). The client/PostgREST surface has no authenticated policies → default-deny for all operations.

### 11a. RLS Enabled — Verified
All 11 tables confirmed RLS enabled with 0 policies for `authenticated` role (policy audit in §16).

### 11b. Authenticated SELECT — 0 Rows on All 11

SCHOOL_ADMIN authenticated query on all 11 server-only tables:

| Table | Row Count | Result |
|-------|-----------|--------|
| exam_results | 0 | PASS |
| report_cards | 0 | PASS |
| homework_submissions | 0 | PASS |
| submission_attachments | 0 | PASS |
| online_exam_attempts | 0 | PASS |
| online_exam_questions | 0 | PASS |
| permissions | 0 | PASS |
| role_permissions | 0 | PASS |
| messages | 0 | PASS |
| message_attachments | 0 | PASS |
| audit_logs | 0 | PASS |

### 11c. INSERT Denial
INSERT into messages (server-only) → `42501 new row violates row-level security policy` (tested in 2C-4).

### 11d. UPDATE/DELETE Denial (Silent 0-Row)
UPDATE messages SET is_read=true → 0 rows affected. DELETE FROM permissions → 0 rows affected. Data verified unchanged:
- permissions: still 71, role_permissions: still 276, messages: still 18, messages.is_read=true: still 13.

**Verdict: SERVER-ONLY TABLES — PASS (11/11)**

---

## 12. SERVER ACTION AUTHORIZATION REGRESSION (Phase 2A)

**Question:** Do the Prisma server actions correctly enforce ownership/role checks and prevent cross-tenant data access?

### 12a. Authorization Foundation (Verified)

| Component | File | Status | Evidence |
|-----------|------|--------|----------|
| `requireRole` | lib/auth.ts:59 | ✅ SAFE | Role resolved from Supabase session → DB profile; not from client claim |
| `getSchoolId` | lib/school-context.ts:23 | ✅ SAFE | Non-SUPER_ADMIN: forces `profile.schoolId`, ignores formData |
| `getBranchId` | lib/school-context.ts:41 | ✅ SAFE | Non-SUPER_ADMIN: forces `profile.branchId`, ignores formData |

Nearly every mutation action file (28+ files) uses `getSchoolId(profile, formData)` — verified via grep: admission, announcements, attendance, branch, calendar, class, event, expenses, exams, fees, homework, library, meetings, messages, online-exams, parents, payroll, question-bank, sessions, staff, students, subjects, teachers, transport, user-search.

### 12b. Mutation Actions — Verified SAFE (Phase 2A hardened)

| Action | File | Verdict |
|--------|------|---------|
| generateSalarySlips | payroll.actions.ts:53 | SAFE — scoped by profile.schoolId |
| markSlipPaid | payroll.actions.ts:116 | SAFE — ownership check (slip.staff.schoolId vs profile.schoolId) |
| publishScheduledAnnouncements | announcement.actions.ts:346 | SAFE — scoped to profile.schoolId for non-super |
| createExamSchedule | exam.actions.ts:353 | SAFE — exam school verified |
| deleteExamSchedule | exam.actions.ts:395 | SAFE — schedule.exam.schoolId verified |
| submitExamResult | exam.actions.ts:432 | SAFE — exam + student school verified |
| submitBulkExamResults | exam.actions.ts:499 | SAFE — exam school + all students verified |
| generateReportCard | exam.actions.ts:694 | SAFE — exam + student school verified |
| publishReportCard | exam.actions.ts:784 | SAFE — canManageReportCard checks student school |
| gradeHomework | homework.actions.ts:245 | SAFE — teacherId ownership + school check |
| assignFeePlan | fees.actions.ts:149 | SAFE — student + feeStructure school verified |
| generateInvoice | fees.actions.ts:208 | SAFE — student school verified |
| recordPayment | fees.actions.ts:275 | SAFE — invoice.student school verified |
| cancelInvoice | fees.actions.ts:373 | SAFE — invoice.student school verified |
| getFeeDefaulters | fees.actions.ts:410 | SAFE — school forced to profile.schoolId |
| getCollectionReport | fees.actions.ts:434 | SAFE — school forced to profile.schoolId |
| All meeting status/note functions | meeting.actions.ts | SAFE — assertMeetingAccess school + participant check |
| updateBook/deleteBook/issueBook/returnBook | library.actions.ts | SAFE — ownership checks present |
| updateVehicle/deleteVehicle/assignStudentTransport | transport.actions.ts | SAFE — ownership checks |
| updateTimetableSlot/getTimetableForClass | timetable.actions.ts | SAFE — school + class checks |
| getStudentsForQrCards/getClassesAndSessions | attendance-qr.actions.ts | SAFE — school scoped |
| addExamQuestion/startExam/getExamResults(online) | online-exam.actions.ts | SAFE — school + enrollment checks |
| sendMessage | message.actions.ts:16 | SAFE — uses getSchoolId; but receiver is unvalidated (see F-5) |
| createExpense | expenses.actions.ts:17 | SAFE — uses getSchoolId/getBranchId |

### 12c. Server Action — NEW FINDINGS (Cross-Tenant Gaps)

> **These are newly-documented authorization gaps NOT addressed in Phase 2A. They exist in the Prisma/Server-Action layer and are invisible to PostgREST/RLS. All are theoretical cross-tenant risks (only exploitable when a second school exists).**

---

**F-1 (HIGH) — Cross-tenant student PII read: `getTeacherStudentDetail`**
- **File:** `teacher-portal.actions.ts:525`
- **Code:** `prisma.student.findFirst({ where: { id: studentId } })` — no `schoolId` filter
- **Impact:** Any TEACHER can read any student's full PII (parents, attendance, exam results, homework submissions) across tenants by enumerating IDs.
- **Evidence:** Source verified at teacher-portal.actions.ts:525 — `where: { id: studentId }` with no `AND schoolId = teacher.schoolId`.

**F-2 (HIGH) — Cross-tenant exam data read: `getExamResults` and `getExamSchedules`**
- **File:** `exam.actions.ts:613-630` and `exam.actions.ts:412-430`
- **Code (getExamResults):** `prisma.examResult.findMany({ where: { examId } })` — no school check on exam
- **Code (getExamSchedules):** `prisma.examSchedule.findMany({ where: { exam: { academicSessionId, branchId } } })` — trusts client-supplied branchId/academicSessionId without school filter
- **Impact:** Any TEACHER can read another school's exam results and schedules by providing external IDs.
- **Evidence:** Source verified at exam.actions.ts:614-617.

**F-3 (HIGH) — Cross-tenant report data read: 8 report functions**
- **File:** `reports.actions.ts:207, 239, 338, 371, 412, 464, 507, 571`
- **Functions:** getStudentEnrollmentReport, getAttendanceReport, getFeeDefaulterReport, getClassStrengthReport, getExamPerformanceReport, getExpenseReport, getIncomeVsExpenseReport, getTeacherAttendanceReport
- **Code pattern:** Each accepts a raw `schoolId` parameter and uses it directly in queries (`student: { schoolId, ... }`) without comparing to `profile.schoolId`.
- **Impact:** Any non-SUPER_ADMIN with report access (SCHOOL_ADMIN, BRANCH_ADMIN, ACCOUNTANT) can read another school's financial, academic, and attendance reports.
- **Evidence:** Source verified at reports.actions.ts:212-217 (getStudentEnrollmentReport), line 212 `await requireRole("SUPER_ADMIN","SCHOOL_ADMIN","BRANCH_ADMIN")` then line 217 `student: { schoolId, ... }` — raw param.
- **Note:** `getDashboardStats` (line 6) and `getFeeCollectionReport` (line 284) are SAFE (they force `profile.schoolId` for non-super). The other 8 report functions do NOT.

**F-4 (MEDIUM) — Cross-tenant notification injection: `createNotification` and `createMeeting` attendees**
- **File:** `notification.actions.ts:23-39` and `meeting.actions.ts:137-152`
- **Code (createNotification):** `prisma.notification.create({ data: { userId, ... } })` — receiver userId never validated against caller's school.
- **Code (createMeeting):** `attendeeIds` from client formData connected directly to attendees without verifying each belongs to the meeting's school; `sendMeetingNotification` creates notifications for these unvalidated attendees.
- **Impact:** A TEACHER/SCHOOL_ADMIN can push notifications to arbitrary cross-tenant users by ID. Cross-tenant meeting attendees can be created.
- **Evidence:** Source verified at notification.actions.ts:34 and meeting.actions.ts:149.

**F-5 (MEDIUM) — Cross-tenant message injection: `sendMessage`**
- **File:** `message.actions.ts:50`
- **Code:** `receiver: { connect: { id: receiverId } }` — receiver ID is client-supplied, not validated to be in the same school.
- **Impact:** A user can send messages to arbitrary users across tenants. (Messages table is server-only, but receiver can view their messages via Prisma.)
- **Evidence:** Source verified at message.actions.ts:50.

**F-6 (MEDIUM) — Cross-tenant homework submission injection: `submitHomework` (STUDENT role)**
- **File:** `homework.actions.ts:199-243`
- **Code:** Line 217: `if (profile.role !== "STUDENT" && profile.role !== "SUPER_ADMIN" && homework.schoolId !== profile.schoolId)` — STUDENT role is exempted from the school check.
- **Impact:** A STUDENT can submit homework for any homeworkId across tenants, creating a submission record visible to that school's teachers. Cross-tenant data pollution.
- **Evidence:** Source verified at homework.actions.ts:217.

**F-7 (MEDIUM) — Cross-tenant meeting notification via `updateTeacherMeetingStatus`**
- **File:** `teacher-portal.actions.ts:873-908`
- **Code:** Meeting fetched via `createdById`/attendee OR with **no school filter** (line 877), then notifications sent to all attendees/creator.
- **Impact:** If a teacher is an attendee of a cross-school meeting (possible via F-4), they can notify all attendees of that meeting including cross-tenant users.
- **Evidence:** Source verified at teacher-portal.actions.ts:877-904.

### 12d. Phase 2A Effectiveness Summary

**Correctly hardened:** ~25 critical mutation actions across payroll, fees, library, transport, timetable, exams, meetings, homework grading, announcements, attendance, and online-exams. The `getSchoolId`/`getBranchId` pattern is enforced in all of these.

**Known deferred area:** Notification receiver validation (flagged in Phase 2A) → confirmed unfixed, documented as F-4.

**Newly discovered gaps:** 7 findings (F-1 through F-7) — all in read/report/receiver paths that bypass the `getSchoolId` helper by accepting raw foreign-key or schoolId parameters without validation.

---

## 13. PRIVILEGE ESCALATION TESTS

**Question:** Can a lower-privilege user perform operations restricted to a higher-privilege role?

### 13a. Role Spoofing via Client

**Not possible.** `requireRole` (lib/auth.ts:59) resolves the role from the authenticated Supabase session → DB profile lookup. The client cannot forge a role claim; it's derived from the server-side JWT and database, not from any client-supplied parameter.

### 13b. getSchoolId/getBranchId Isolation

**Not possible for non-SUPER_ADMIN.** `getSchoolId` (lib/school-context.ts:23-34) forces `profile.schoolId` for all non-SUPER_ADMIN roles, ignoring any client-supplied `schoolId` in formData. Same for `getBranchId`. A STUDENT/PARENT/TEACHER calling a SCHOOL_ADMIN action would be rejected by `requireRole` before the helper is even reached.

### 13c. Client-Surface RLS Denial

PostgREST `authenticated` role with the identified test users showed 0 cross-tenant rows in all tables tested. Even if a lower-privilege user somehow bypassed `requireRole`, the RLS policies on PostgREST would still block cross-tenant reads (defense-in-depth).

### 13d. SUPER_ADMIN Boundaries

| Test | Result |
|------|--------|
| `is_super_admin()` returns true for SUPER_ADMIN uid | ✅ Confirmed |
| SUPER_ADMIN `auth_check_school` returns true for own school | ✅ Confirmed |
| SUPER_ADMIN `auth_check_school` returns true for fabricated foreign school | ✅ Confirmed (by design — platform-admin sees all) |
| SUPER_ADMIN sees 51 students under RLS | ✅ Confirmed (same as non-super — RLS allows all same-school) |
| SUPER_ADMIN sees 1 school | ✅ Confirmed (only 1 exists) |

**Verdict: SUPER_ADMIN boundaries — PASS (by design, cross-tenant privilege for platform admin)**

### 13e. Branch Isolation

| Test | Result |
|------|--------|
| School model: `check_tenant_access` | Non-BRANCH_ADMIN: sees all branches within own school (by design) |
| School model: BRANCH_ADMIN | Restricted to own branch only (not testable — no live user) |
| `auth_check_branch(foreign school branch)` | Returns false for non-super |
| North Campus data volume | 0 students, 0 classes, 0 staff, 0 invoices (empty branch) |

**Branch isolation verdict: PARTIAL — PASS for non-BRANCH_ADMIN (same-school cross-branch is by design); BRANCH_ADMIN strict isolation NOT TESTABLE (no live user).**

---

## 14. POSTGREST / JWT CLIENT SURFACE

**Question:** Does the PostgREST/Supabase client surface correctly enforce tenant isolation via RLS?

| Test | Result | Evidence |
|------|--------|----------|
| Anon role: `auth_school_id()` | **PASS — 42501 permission denied** | EXECUTE not granted to anon (only authenticated/service_role/postgres) |
| Authenticated SCHOOL_ADMIN: own-school data visible | **PASS** | 51 students, 30 invoices, etc. |
| Authenticated SCHOOL_ADMIN: foreign school data hidden | **PASS — 0 rows** | All cross-school probes returned 0 |
| Authenticated TEACHER: own-school data visible | **PASS** | Students, classes visible in own school |
| Authenticated TEACHER: other users' private data hidden | **PASS — 0 rows** | Notifications, messages, permissions all 0 |
| Authenticated PARENT: own-school data visible | **PASS** | Can see own-school data (school-scoped) |
| SUPER_ADMIN: all schools visible | **PASS — by design** | Platform-admin privilege |
| `selected_branch` cookie: dashboard validates against profile's real branches | **PASS** | dashboard/page.tsx:28-37 validates branch belongs to profile's school |
| `selected_branch` cookie: sessions page validates against real branch list | **PASS** | sessions/page.tsx:22-25 checks `branches.some(b => b.id === selectedBranch)` |

---

## 15. RLS POLICY STRUCTURAL AUDIT

**Question:** Are the 62 RLS policies structurally correct, free of recursion, and free of unintended access paths?

### 15a. Policy Inventory

| Pattern | Tables | Count |
|---------|--------|-------|
| `auth_check_school(school_id) AND auth_check_branch(branch_id)` | Direct tenant tables (classes, exams, subjects, timetables, etc.) | 42 |
| `check_tenant_access(school_id, branch_id)` | student/staff/teacher/ID-card tables (combined school+branch logic) | 4 |
| `EXISTS (subquery → parent table → auth_check_school + auth_check_branch)` | Derived child tables (exam_schedules, sections, fee_invoices, payments, etc.) | 12 |
| `auth_check_school(school_id)` (no branch) | branches, settings, academic_sessions, schools | 4 |
| `profile_id = auth.uid()` | Owner-scoped tables (notifications, user_permissions, leave_requests, meeting_attendees, announcement_reads, event_registrations) | 6 |
| `((id = auth.uid()) OR (school_id = auth_school_id()))` | profiles (own record OR school members) | 1 |
| `(school_id = auth_school_id())` | parents, settings | 2 |

**Total: 62 policies** (all verified against pg_policies)

### 15b. Structural Checks

| Check | Result |
|-------|--------|
| No `USING(true)` policies | ✅ PASS — every policy has a meaningful qualifier |
| No INSERT/UPDATE/DELETE policies | ✅ PASS — all 62 are SELECT only (default-deny for writes) |
| No SUPER_ADMIN exception in policy quals | ✅ PASS — SUPER_ADMIN cross-tenant is handled at Prisma layer, not RLS |
| No recursion | ✅ PASS — helpers are STABLE SQL functions reading from `auth.*` and `public.*` tables; no circular references |
| No cross-tenant fallback | ✅ PASS — all paths require school match (via auth_check_school/check_tenant_access/auth_school_id) |
| `auth.uid()` used correctly | ✅ PASS — owner-scoped policies use `auth.uid()` for the authenticated user's profile ID |

---

## 16. SECURITY DEFINER FUNCTION AUDIT

**Question:** Are the 8 SECURITY DEFINER helpers secure, properly owned, and free of privilege escalation?

### 16a. Function Inventory

| Function | Owner | search_path | EXECUTE Grants |
|----------|-------|-------------|----------------|
| `auth_profile()` | postgres | `pg_catalog, public` | postgres, authenticated, service_role |
| `is_super_admin()` | postgres | `pg_catalog, public` | postgres, authenticated, service_role |
| `auth_check_school(uuid)` | postgres | `pg_catalog, public` | postgres, authenticated, service_role |
| `auth_check_branch(uuid)` | postgres | `pg_catalog, public` | postgres, authenticated, service_role |
| `auth_role()` | postgres | `public` | postgres, authenticated, service_role |
| `auth_school_id()` | postgres | `public` | postgres, authenticated, service_role |
| `auth_branch_id()` | postgres | `public` | postgres, authenticated, service_role |
| `check_tenant_access(uuid,uuid)` | postgres | `public` | postgres, authenticated, service_role |

### 16b. Security Checks

| Check | Result |
|-------|--------|
| Owner is superuser (postgres) | ✅ All 8 |
| search_path explicitly set (no PUBLIC-only) | ✅ All 8 (`pg_catalog, public` or `public`) |
| Not executable by PUBLIC | ✅ None have PUBLIC EXECUTE |
| Not executable by anon | ✅ Confirmed — `auth_school_id()` returns 42501 for anon |
| No recursion risk | ✅ STABLE functions; read from `auth.*` extension and `public.profiles/branches` |
| `pg_catalog` in search_path for critical helpers | ✅ auth_check_school, auth_check_branch, auth_profile, is_super_admin include `pg_catalog` first |
| Functions referenced by RLS policies only | ✅ All are called within policy `qual` expressions |

**Phase 2C hardened status:** auth_profile, is_super_admin, auth_check_school, auth_check_branch were hardened in 2C-4 (explicit search_path, GRANT audits). auth_role, auth_school_id, auth_branch_id, check_tenant_access are pre-existing with adequate protections (explicit search_path, restricted EXECUTE grants).

---

## 17. PRISMA ARCHITECTURE VERIFICATION

**Question:** Does the Prisma layer correctly bypass RLS while the server-action layer enforces tenant isolation?

| Check | Result | Evidence |
|-------|--------|----------|
| Prisma connects as `postgres` (bypassrls=true) | ✅ | lib/prisma.ts — Pool on DATABASE_URL (user postgres, bypassrls) |
| Server actions derive tenant from DB profile, not client | ✅ | requireRole → getCurrentProfile → prisma.profile.findUnique |
| getSchoolId forces profile.schoolId for non-super | ✅ | lib/school-context.ts:23-34 |
| getBranchId forces profile.branchId for non-super | ✅ | lib/school-context.ts:41-52 |
| Prisma schema diff = 0 (no source changes this phase) | ✅ | git diff prisma/schema.prisma = 0 lines |
| Prisma not used for cross-tenant access | ⚠️ | See §12c findings — several read/report server actions use Prisma with insufficient validation |

**Architecture verdict: CORRECT DESIGN, partial implementation gaps (§12c findings).**

---

## 18. DATA SAFETY VERIFICATION

**Question:** Were any data rows modified during the security testing?

| Metric | Baseline | Post-test | Status |
|--------|----------|-----------|--------|
| profiles | 44 | 44 | ✅ SAFE |
| students | 51 | 51 | ✅ SAFE |
| parents | 27 | 27 | ✅ SAFE |
| teachers | 9 | 9 | ✅ SAFE |
| classes | 11 | 11 | ✅ SAFE |
| schools | 1 | 1 | ✅ SAFE |
| branches | 2 | 2 | ✅ SAFE |
| permissions | 71 | 71 | ✅ SAFE |
| role_permissions | 276 | 276 | ✅ SAFE |
| messages | 18 | 18 | ✅ SAFE |
| fee_invoices | 30 | 30 | ✅ SAFE |
| payments | 20 | 20 | ✅ SAFE |
| notifications | 15 | 15 | ✅ SAFE |
| exams | 64 | 64 | ✅ SAFE |

**All data unchanged.** Tests used SELECT-only probes and RLS-denied mutations (which affected 0 rows). No source files modified.

---

## 19. GIT VERIFICATION

| Item | Status |
|------|--------|
| `prisma/schema.prisma` | Untracked, diff = 0 lines (unchanged from baseline) |
| `lib/prisma.ts` | Untracked, pre-existing working state |
| `lib/audit.ts` | Untracked, pre-existing working state |
| `RLS_PHASE_2D_FINAL_SECURITY_TEST.md` | This deliverable (new) |
| Pre-existing working-state files (app/layout.tsx, app/page.tsx, next.config.ts, package.json, etc.) | Modified in prior work loops, not part of this phase |

---

## 20. FINDINGS SUMMARY

| ID | Severity | Category | Title | File:Line |
|----|----------|----------|-------|-----------|
| F-1 | **HIGH** | Cross-tenant read | getTeacherStudentDetail — no school check on student | teacher-portal.actions.ts:525 |
| F-2 | **HIGH** | Cross-tenant read | getExamResults / getExamSchedules — no school check on exam/branch | exam.actions.ts:613, 412 |
| F-3 | **HIGH** | Cross-tenant read | 8 report functions trust client-supplied schoolId | reports.actions.ts:207,239,338,371,412,464,507,571 |
| F-4 | **MEDIUM** | Cross-tenant injection | createNotification + createMeeting attendees — receiver not validated | notification.actions.ts:34, meeting.actions.ts:149 |
| F-5 | **MEDIUM** | Cross-tenant injection | sendMessage — receiver not validated against school | message.actions.ts:50 |
| F-6 | **MEDIUM** | Cross-tenant injection | submitHomework STUDENT path — school check skipped | homework.actions.ts:217 |
| F-7 | **MEDIUM** | Cross-tenant injection | updateTeacherMeetingStatus — meeting fetch without school filter | teacher-portal.actions.ts:877 |

**All 7 findings are in the Prisma server-action layer (application-level authorization). The RLS/PostgREST client surface is fully secure.**

---

## 21. UNTENABLE / UNTESTABLE SCENARIOS

| Scenario | Reason | Risk Assessment |
|----------|--------|-----------------|
| BRANCH_ADMIN branch-strict isolation | No BRANCH_ADMIN user exists | Branch helper verified structurally; strict branch isolation via `check_tenant_access` confirmed in source |
| School B cross-school user | Only 1 school exists | All fabricated-school probes returned 0 (correct); real cross-school test requires 2+ schools |
| North-branch user access | No data in North Campus; no user assigned exclusively | Same-school cross-branch is allowed by design for non-BRANCH_ADMIN |
| STUDENT server-action path | No STUDENT uid available | Source-audited; F-6 documents the cross-tenant gap |
| Real-time concurrent access attacks | Not in scope (single-server testing) | Low risk given static policy enforcement |

---

## 22. ADDITIONAL RECOMMENDATIONS (Not Findings — Follow-Up Audit Scope)

The following action files reference raw `schoolId` parameters and should be verified to ensure they use `getSchoolId(profile)` or equivalent validation. They were NOT on the Phase 2A requested action list and were not individually verified:

- `workload.actions.ts:177` — uses `formData.get("schoolId")` directly
- `id-card.actions.ts` — calls `getBulkStudentIdCardData(schoolId, ...)` with raw param
- `student.actions.ts` — some update/delete functions may trust raw IDs
- `parent.actions.ts` — some update/delete functions may trust raw IDs
- `staff.actions.ts` — some update/delete functions may trust raw IDs

This is not a gap finding — it's a scope boundary. A comprehensive follow-up sweep should verify every action function systematically.

---

## 23. SECURITY SCORECARD

### Layer 1: Supabase PostgREST Client Surface

| Category | Status |
|----------|--------|
| Anonymous access | ✅ PASS |
| Cross-school reads | ✅ PASS |
| Cross-school aggregation | ✅ PASS |
| ID enumeration | ✅ PASS |
| Cross-user private data | ✅ PASS |
| Server-only table default-deny (11/11) | ✅ PASS |
| JOIN traversal leakage | ✅ PASS |
| RLS policy structural (62 policies) | ✅ PASS |
| SECURITY DEFINER audit (8 helpers) | ✅ PASS |
| PostgREST/JWT context | ✅ PASS |
| SUPER_ADMIN boundary | ✅ PASS (by design) |
| Branch isolation (non-BRANCH_ADMIN) | ✅ PASS (by design — same-school cross-branch visible) |
| Branch isolation (BRANCH_ADMIN) | ⬜ NOT TESTABLE |

### Layer 2: Prisma Server-Action Application Layer

| Category | Status |
|----------|--------|
| requireRole enforcement | ✅ PASS |
| getSchoolId/getBranchId helper isolation | ✅ PASS |
| Mutation action ownership checks (Phase 2A hardened) | ✅ PASS |
| `selected_branch` cookie validation | ✅ PASS |
| Cross-tenant read paths (read/report/receiver) | ❌ FAIL — 7 findings (F-1 through F-7) |
| Privilege escalation (role spoof) | ✅ PASS — impossible (DB-derived role) |

### Overall Gate

| Layer | Status |
|-------|--------|
| PostgREST/RLS Client Surface | ✅ **CLEAR** — All 13 test categories PASS |
| Prisma Server-Action Layer | ❌ **HOLD** — 3 HIGH + 4 MEDIUM findings require remediation |

---

## 24. FINAL DATA SAFETY

✅ **No production data was modified during any security test.** All counts match baseline exactly. All mutation probes used RLS-denied operations that affected 0 rows (verified via count checks after each). No source files were modified.

---

## 25. FINAL SECURITY GATE

### Gate Criteria
> Complete only if no CRITICAL/HIGH findings, all testable critical scenarios pass, 73/73 RLS, server-only default-deny intact, Phase 2A effective, no unexpected data changes.

### Assessment

| Criterion | Status |
|-----------|--------|
| 73/73 RLS enabled | ✅ PASS |
| Server-only default-deny (11/11) | ✅ PASS |
| All testable critical PostgREST scenarios | ✅ PASS (13/13) |
| No unexpected data changes | ✅ PASS |
| Phase 2A mutation action hardening effective | ✅ PASS (25+ actions verified) |
| No CRITICAL findings | ✅ PASS |
| No HIGH findings | ❌ FAIL — 3 HIGH findings (F-1, F-2, F-3) |

### Gate Verdict

**❌ NOT PASS — HOLD**

**Reason:** The Supabase PostgREST/RLS client surface is **fully secure** across all 13 test categories. The Prisma server-action layer has **3 HIGH-severity cross-tenant read vulnerabilities** (F-1, F-2, F-3) and **4 MEDIUM-severity cross-tenant injection gaps** (F-4 through F-7) in read/report/receiver action functions that bypass the `getSchoolId` helper. These are architectural authorization gaps that must be remediated before onboarding a second school/tenant.

**Current production impact:** All 7 findings are currently **not exploitable** (only 1 school exists, so there is no second tenant to attack). However, they represent real vulnerabilities that would become exploitable the instant a second school is onboarded.

**Remediation required:**
1. **F-1/F-2/F-3 (HIGH):** Add `schoolId` validation (via `profile.schoolId` comparison or equivalent) to `getTeacherStudentDetail`, `getExamResults`, `getExamSchedules`, and all 8 flagged report functions.
2. **F-4/F-5/F-7 (MEDIUM):** Validate receiver/attendee IDs against the caller's school before creating notifications, messages, or meeting attendees.
3. **F-6 (MEDIUM):** Add school check for STUDENT role in `submitHomework` (remove the STUDENT exemption from the school check).
4. **Follow-up:** Audit `workload.actions.ts:177` and other action files using raw `schoolId` params to confirm they enforce the helper pattern.

**Do NOT auto-fix these findings (Phase 2D is verification-only). Remediation should be performed in an explicit follow-up phase with its own security audit.**
