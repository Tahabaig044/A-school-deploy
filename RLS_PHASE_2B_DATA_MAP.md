# RLS Phase 2B — Data & Schema Integrity
## Deliverable 1: Complete Data Model / Tenant Map (`RLS_PHASE_2B_DATA_MAP.md`)

**Source of truth:** `prisma/schema.prisma` (read in full) + live DB row counts.
**Date:** 2026-08-31 · **Project:** `gzhumudgucfqbqpuznek` (Supabase)

Legend:
- **Tenant Level:** **S** = School-level, **B** = Branch-level, **R** = Relationship-derived (path shown), **P** = Platform/Global, **U** = User-owned.
- **Direct/Derived:** D = has own `schoolId`/`branchId` columns; R = resolves via relations only.
- **RLS Ready:** READY = direct tenant cols populated, non-null, consistent; BLOCKED-BY-SCHEMA = needs schema change; BLOCKED-BY-DATA = has NULL/ambiguous tenant rows; DERIVED = relies on relationship policies (Phase 2C); PLATFORM = global.

Tenant anchor values in the live DB (single school, single active branch):
- School: `41f32895-01e6-495f-b36b-9c3ec584dea1`
- Branch: `9324ce1b-916e-402a-ba57-131169ef99e6` (Main Campus). North Campus `06966ac9` has **no** students/data.

| Model | schoolId | branchId | Direct/Derived | Ownership Path | Nullable | Data Fix Needed | RLS Ready |
|------|----------|----------|---------------|----------------|----------|-----------------|-----------|
| School | root | — | D (root) | n/a — root of tenant | — | none | READY (global metadata) |
| Branch | ✓ (not null) | n/a | D | → School | — | none | READY (S) |
| Profile | ✓ nullable | ✓ nullable | D | → School / Branch | **schoolId ✓ / branchId ✓ NULL** | **25 PARENT rows branch NULL → backfill** | **BLOCKED-BY-DATA** |
| AcademicSession | ✓ not null | ✓ nullable | D | → School / Branch | branchId NULL | none (school-keyed) | READY (S) |
| Setting | ✓ not null | — | D | → School | — | none | READY (S) |
| Class | ✓ not null | ✓ not null | D | → School → Branch | — | none | READY (B) |
| Section | — | — | R | → Class → Branch | — | none | DERIVED |
| Student | ✓ not null | ✓ not null | D | → School → Branch | — | none | READY (B) |
| StudentDocument | — | — | R | → Student | — | none | DERIVED |
| StudentParent | — | — | R | → Parent(S)/Student(B) | — | none | DERIVED |
| IdCard | ✓ not null | ✓ nullable | D | → Profile → School/Branch | branchId NULL | none | READY (B) |
| Admission | ✓ not null | ✓ not null | D | → School → Branch | — | none | READY (B) |
| AdmissionDocument | — | — | R | → Admission | — | none | DERIVED |
| AdmissionGuardian | — | — | R | → Admission | — | none | DERIVED |
| StudentEnrollment | — | — | R | → Student / Class | — | none | DERIVED |
| Teacher | ✓ not null | ✓ not null | D | → School → Branch | — | none | READY (B) |
| Staff | ✓ not null | ✓ not null | D | → School → Branch | — | none | READY (B) |
| Subject | ✓ not null | ✓ not null | D | → School → Branch | — | none | READY (B) |
| ClassSubject | — | — | R | → Class / Subject | — | none | DERIVED |
| TeacherAssignment | — | — | R | → Class / Subject / Teacher | — | none | DERIVED |
| Timetable | ✓ not null | ✓ not null | D | → School → Branch / Class | — | none | READY (B) |
| StudentAttendance | — | — | R | → Student / Class | — | none | DERIVED |
| StaffAttendance | — | — | R | → Staff | — | none | DERIVED |
| LeaveRequest | — | — | R | → Profile (user-owned) | — | none | DERIVED (U) |
| FeeStructure | ✓ not null | ✓ not null | D | → School → Branch | — | none | READY (B) |
| StudentFeePlan | — | — | R | → Student / FeeStructure | — | none | DERIVED |
| FeeInvoice | — | — | R | → Student | — | none | DERIVED |
| FeeInvoiceItem | — | — | R | → Invoice → Student | — | none | DERIVED |
| Payment | — | — | R | → Invoice → Student | — | none | DERIVED |
| Expense | ✓ not null | ✓ not null | D | → School → Branch | — | none | READY (B) |
| ExamType | ✓ not null | ✓ not null | D | → School → Branch | — | none | READY (B) |
| Exam | ✓ not null | ✓ not null | D | → School → Branch / Class / Subject | — | none | READY (B) |
| ExamSchedule | — | — | R | → Exam | — | none | DERIVED |
| ExamResult | — | — | R | → Exam / Student | — | none | DERIVED |
| ReportCard | — | — | R | → Student / Exam / Session | — | none | DERIVED |
| Homework | ✓ not null | ✓ not null | D | → School → Branch / Class | — | none | READY (B) |
| HomeworkSubmission | — | — | R | → Homework / Student | — | none | DERIVED |
| SubmissionAttachment | — | — | R | → Submission | — | none | DERIVED |
| Announcement | ✓ not null | ✓ not null | D | → School → Branch / Class | — | none | READY (B) |
| AnnouncementAttachment | — | — | R | → Announcement | — | none | DERIVED |
| AnnouncementRead | — | — | R | → Announcement / Profile | — | none | DERIVED (U) |
| Message | ✓ not null | **— (no branchId)** | D | → School / Profiles | no branch column | none | READY (S) / branch not isolable |
| MessageAttachment | — | — | R | → Message | — | none | DERIVED |
| Notification | **— (no schoolId)** | **— (no branchId)** | R | → Profile (receiver, user-owned) | receiver user_id not null | receiver school-validity (app) | DERIVED (U) — app-side validation |
| LibraryBook | ✓ not null | ✓ not null | D | → School → Branch | — | none | READY (B) |
| BookIssue | — | — | R | → Book / Student | — | none | DERIVED |
| Vehicle | ✓ not null | ✓ not null | D | → School → Branch | — | none | READY (B) |
| TransportRoute | ✓ not null | ✓ not null | D | → School → Branch | — | none | READY (B) |
| StudentTransport | — | — | R | → Student / Route / Vehicle | — | none | DERIVED |
| AuditLog | ✓ nullable | ✓ nullable | D | → Profile (user) + school | schoolId/branchId NULL | none (defaults logged) | READY (P/S) |
| Permission | — | — | P | n/a | — | none | PLATFORM |
| RolePermission | — | — | R/P | → Permission | — | none | PLATFORM |
| UserPermission | — | — | U | → Profile | — | none | DERIVED (U) |
| Meeting | ✓ not null | ✓ not null | D | → School → Branch | — | none | READY (B) |
| MeetingAttendee | — | — | R | → Meeting / Profile | — | none | DERIVED (U) |
| MeetingNote | — | — | R | → Meeting | — | none | DERIVED |
| MeetingAttachment | — | — | R | → Meeting | — | none | DERIVED |
| Event | ✓ not null | ✓ not null | D | → School → Branch / Class | — | none | READY (B) |
| EventRegistration | — | — | R | → Event / Profile | — | none | DERIVED (U) |
| EventAttachment | — | — | R | → Event | — | none | DERIVED |
| CalendarEvent | ✓ not null | ✓ not null | D | → School → Branch / Session | — | none | READY (B) |
| QuestionBank | ✓ not null | ✓ not null | D | → School → Branch / Subject / Class | — | none | READY (B) |
| OnlineExam | ✓ not null | ✓ not null | D | → School → Branch / Class / Subject | — | none | READY (B) |
| OnlineExamQuestion | — | — | R | → OnlineExam | — | none | DERIVED |
| OnlineExamAttempt | — | — | R | → OnlineExam / Student | — | none | DERIVED |
| Alumni | ✓ not null | ✓ not null | D | → School → Branch | — | none | READY (B) |
| AlumniEvent | ✓ not null | ✓ not null | D | → School → Branch | — | none | READY (B) |
| AlumniEventRegistration | — | — | R | → AlumniEvent / Alumni | — | none | DERIVED |
| SalaryStructure | ✓ not null | ✓ not null | D | → School → Branch | — | none | READY (B) |
| StaffSalary | — | — | R | → Staff / SalaryStructure | — | none | DERIVED |
| SalarySlip | — | — | R | → Staff / SalaryStructure | — | none | DERIVED |
| TeacherRating | ✓ not null | ✓ not null | D | → School → Branch / Teacher | — | none | READY (B) |

## Summary

- **~74 tables** total. **35 with direct tenant columns** (schoolId and/or branchId). **~39 tenant/derived** require relationship derivation.
- **Direct tenant columns are all NOT NULL** except: `Profile.schoolId/branchId`, `AcademicSession.branchId`, `IdCard.branchId`, `AuditLog.schoolId/branchId`. The **only live data gap is `Profile.branchId` for 25 PARENT rows**.
- **No tables have orphaned/cross-tenant rows** — verified 0 anomalies across all derived tables (single-school, single-branch dataset).
- **Schema gaps to be documented for migration** (not executed):
  1. `Parent` has **no `branch_id` column** → branch isolation for parents must resolve via `Parent → children → Student.branch_id` (or add the column).
  2. `Message` has `schoolId` but **no `branchId`** → branch-level message isolation impossible without schema change.
  3. `Notification` has no `schoolId`/`branchId` → tenant derives from receiver `Profile`.
- **No destructive operations performed.** All determinations are from the actual schema + live read-only queries.
