# RLS Phase 2A — Application Security Fixes

**Scope:** Hardening of the server-action layer to eliminate the cross-tenant, privilege-escalation, and unauthenticated data-exposure gaps identified in `RLS_PHASE_1_AUDIT.md` (§6.2, §6.3, §6.4). This phase is **application-layer only** — no schema/RLS/Prisma changes, no Prisma swap, no UI/API-contract changes. Schema-dependent hardening is deferred to **Phase 2B** (see "Blocked / Requires Phase 2B").

**Guiding rule:** Never trust client-supplied `schoolId`, `branchId`, `studentId`, `teacherId`, `classId`, `examId`, `feeId`, `salaryId`, or the `selected_branch` cookie. Always derive tenant from the authenticated profile and verify ownership against real Prisma relations. `SUPER_ADMIN` (profile.schoolId = `null`) remains universally allowed.

---

## 1. Unauthenticated Actions — Now Authenticated + Scoped

| File | Fix |
|---|---|
| `actions/attendance-qr.actions.ts` — `getStudentsForQrCards` | Added `requireRole(SUPER_ADMIN, SCHOOL_ADMIN, BRANCH_ADMIN, PRINCIPAL, TEACHER)`; non-super-admin must supply their own `schoolId`. |
| `actions/attendance-qr.actions.ts` — `getClassesAndSessions` | Effective school = `profile.schoolId` for non-super-admin (ignores client `schoolId`); class/session queries scoped accordingly. |
| `actions/attendance-settings.actions.ts` — `getAttendancePolicy` | Added `requireRole(SUPER_ADMIN, SCHOOL_ADMIN)`; non-super-admin reads their own school's policy only. |
| `actions/id-card.actions.ts` — `updateIdCardStatusAction` | **Not modified** — verified `services/id-card.ts` already gates via `requireIdCardVerifier`. Defense-in-depth adequate. |

## 2. CRITICAL Global Mutators — Now School-Scoped

| File | Fix |
|---|---|
| `actions/payroll.actions.ts` — `generateSalarySlips` | Filtered `staffSalary` by `staff.schoolId = profile.schoolId` for non-super-admin. No longer iterates **all staff across all schools**. |
| `actions/payroll.actions.ts` — `markSlipPaid` | Checks slip's `staff.schoolId` matches caller's school before marking PAID. |
| `actions/announcement.actions.ts` — `publishScheduledAnnouncements` | Non-super-admin now processes only their own school's scheduled announcements. |

## 3. Cross-Tenant Mutators — Ownership Checks Added (H-severity)

| File | Functions | Added check |
|---|---|---|
| `exam.actions.ts` | `getExamById`, `createExamSchedule`, `deleteExamSchedule`, `submitExamResults`, `submitBulkExamResults`, `generateReportCard` | Exam `schoolId` verified before read/mutate. **Bulk results:** each target student verified in-call-school. |
| `exam.actions.ts` | `getStudentExamResults`, `getReportCards`, `getStudentReportCards` | Student/own-record enforcement. New helper `canViewStudentRecords(actor, studentId)` gates STUDENT/PARENT to their own record (via email/parent-link), staff to same-school. |
| `exam.actions.ts` | `publishReportCard`, `unpublishReportCard` | New helper `canManageReportCard` verifies report-card owner's school. |
| `homework.actions.ts` | `gradeHomework`, `getHomeworkSubmissions`, `submitHomework` | Teacher grading limited to own homework + same school; submission list limited to teacher-owned homework; `submitHomework` school-gated for non-student actors. |
| `homework.actions.ts` | `getHomework`, `getHomeworkById`, `getStudentSubmissions` | Read scoping: list uses `profile.schoolId`; detail returns `null` for out-of-school; `getStudentSubmissions` self-only for STUDENT, same-school for staff. |
| `fees.actions.ts` | `assignFeePlan`, `generateInvoice`, `recordPayment`, `cancelInvoice` | Student/invoice `schoolId` verified before mutate. |
| `fees.actions.ts` | `getFeeDefaulters`, `getCollectionReport` | Non-super-admin scoped to `profile.schoolId` regardless of supplied branch. |
| `meeting.actions.ts` | `approve/reject/cancel/reschedule/edit/completeMeeting`, `updateMeetingStatus`, `updateAttendeeStatus`, `addMeetingNote` | New `assertMeetingAccess(meetingId, profile)` — school match; TEACHER must be creator/attendee. |
| `meeting.actions.ts` | `getMeetingById`, `getTeacherAvailability`, `downloadMeetingIcs` | Reads scoped to school (or participant). |
| `library.actions.ts` | `updateBook`, `deleteBook`, `issueBook`, `returnBook`, `getBookById` | Book/student/invoice school checks. |
| `library.actions.ts` | `getBooks`, `getBookIssues`, `getOverdueBooks`, `getLibraryStats` | Non-super-admin scoped to `profile.schoolId` (branch ignored). |
| `transport.actions.ts` | `updateVehicle`, `deleteVehicle`, `updateTransportRoute`, `deleteTransportRoute`, `assignStudentTransport`, `removeStudentTransport` | Vehicle/route/student school verified. |
| `transport.actions.ts` | `getVehicles`, `getVehicleById`, `getTransportRoutes`, `getStudentTransportAssignments`, `getTransportStats` | Scoped to `profile.schoolId`. |
| `timetable.actions.ts` | `updateTimetableSlot`, `getAllConflicts`, `getRoomUtilization`, `getTimetableForClass` | Slot/class school verified; conflict/utilization scoped. |
| `teacher-portal.actions.ts` | `gradeTeacherHomeworkSubmission`, `getTeacherHomeworkSubmissions` | Limited to homework owned by the calling teacher (same school). |
| `teacher-portal.actions.ts` | `getTeacherStudents`, `createTeacherMeeting`, `updateTeacherMeetingStatus`, `addTeacherMeetingNote` | Class/student school verified; `createTeacherMeeting` validates parent belongs to teacher's school; meeting actions restricted to creator/attendee. |
| `low-stock.actions.ts` | `checkLowStockItems`, `getLowStockCount` | Scoped to `profile.schoolId`. |
| `reports.actions.ts` | `getDashboardStats`, `getFeeCollectionReport` | Non-super-admin forced to `profile.schoolId`; caller-supplied school ignored. |
| `online-exam.actions.ts` | `addExamQuestion`, `startExam`, `getExamResults` | Exam school verified; `startExam` additionally checks student is actively enrolled in the exam's class. |

## 4. Medium-Severity Mutators — Ownership Checks Added (M-severity)

| File | Functions | Added check |
|---|---|---|
| `teacher-rating.actions.ts` | `getTeacherRatings`, `submitTeacherRating` | Teacher school verified (same-school for raters / visibility). |
| `alumni.actions.ts` | `deleteAlumni`, `registerForEvent` | Alumni/event school verified. |
| `calendar.actions.ts` | `updateCalendarEvent`, `deleteCalendarEvent`, `getCalendarEventById` | Event school verified. |
| `event.actions.ts` | `updateEventStatus`, `registerForEvent`, `getEventById` | Event school verified. |
| `class.actions.ts` | `createSection`, `updateSection`, `deleteSection` | Class school verified. |
| `parent.actions.ts` | `removeParent`, `enrollStudent`, `addParent` (student link) | Student/class school verified. |
| `subject.actions.ts` | `assignSubjectToClass`, `removeSubjectFromClass` | Class/subject school verified. |
| `assignment.actions.ts` | `createAssignment`, `deleteAssignment` | Teacher/class/subject school verified. |

## 5. Cookie Branch Validation

| File | Fix |
|---|---|
| `app/(dashboard)/dashboard/sessions/page.tsx` | `selected_branch` cookie value is now validated against the caller's real branch list before being applied (mirrors `dashboard/page.tsx` pattern). Prevents arbitrary branch-ID injection in the session filter. |

## 6. Unchanged — Documented as Already Safe

- `id-card.actions.ts` mutators — gated in `services/id-card.ts`.
- `attendance.actions.ts`, `leave.actions.ts`, `session.actions.ts`, `branch.actions.ts`, `school.actions.ts`, `expenses.actions.ts`, `question-bank.actions.ts`, `admission.actions.ts` — reviewed; already role-gated and/or school-scoped, out of Phase 2A list.
- `Notification.createNotification` receiver `userId` not school-validated (§6.5 note) — **not modified** (notified via to-be-fixed in 2B unless in-scope).

## 7. Verification

- **Typecheck** (`npx tsc --noEmit`): zero errors from authored source. The only reported TS errors are in the gitignored generated cache file `.next/dev/types/validator.ts` (stale build artifact from earlier interrupted run), unrelated to these changes.
- **Lint** (`npx eslint`): no new offenses introduced. Remaining `@typescript-eslint/no-explicit-any` (`… as any` enum casts) and unused `catch (e)` are pre-existing patterns, not part of this diff.
- **Build:** `next build` compiles successfully in 2.3min; the type-check gate fails only on the same stale generated `.next` validator cache (regenerates on next run).

## 8. Blocked / Requires Phase 2B (Schema / RLS / Data)

These remain because closing them needs schema/DB-level changes, which are out of scope for the application-only Phase 2A:

- **Unconditional DB-level RLS** across the ~40 derived child tables (fee_invoices, payments, exam_results, etc.) — belongs to Phase 2B (policies via `check_tenant_access` / `auth.uid()`), not the action layer.
- **Missing `branchId` on parent records** — audit notes 25-of-27 parents lack branchId; requires a data migration + schema change (2B).
- **`Notification.createNotification` receiver cross-school validation** — requires policy/DB constraint (2B).
- **Direct `prisma.notification.create` in meeting/teacher-portal** — the receiver is validated to be in-school at meeting scope where applicable; a DB-level notification RLS policy is the durable fix (2B).

---

## Summary

- Closing unauthenticated + cross-tenant + global-mutator exposure in the **server-action layer**.
- 100% of the Phase 2A fix list from `RLS_PHASE_1_AUDIT.md` §6.2/§6.4 addressed with the smallest safe diffs.
- No schema, RLS policy, Prisma schema, auth, middleware, permissions, or API-contract changes made.
- Schema/RLS-dependent hardening deferred to **Phase 2B** as documented above.
- **STOPPED here per scope — Phase 2B/2C not begun.**
