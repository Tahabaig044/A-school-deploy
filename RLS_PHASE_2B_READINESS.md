# RLS Phase 2B — RLS Readiness Assessment
## Deliverable 8: `RLS_PHASE_2B_READINESS.md`

Decision states per model. "Required Before Phase 2C" = what must be true before broad RLS enablement.

## A. Direct-tenant models (have schoolId/branchId columns)

| Model | RLS Ready | Blocker | Required Before Phase 2C |
|---|---|---|---|
| School | READY | — | policy `id = auth_school_id()` |
| Branch | READY | — | policy `school_id = auth_school_id()` |
| Class | READY | — | branch policy |
| Student | READY | — | branch policy (+ teacher/own/parent policies) |
| Teacher | READY | — | branch policy |
| Staff | READY | — | branch policy |
| Subject | READY | — | branch policy |
| Timetable | READY | — | branch policy |
| FeeStructure | READY | — | branch policy |
| Expense | READY | — | branch policy |
| ExamType | READY | — | branch policy |
| Exam | READY | — | branch policy |
| Homework | READY | — | branch + teacher-own policy |
| Announcement | READY | — | branch + audience policy |
| LibraryBook | READY | — | branch policy |
| Vehicle | READY | — | branch policy |
| TransportRoute | READY | — | branch policy |
| Meeting | READY | — | branch + participant policy |
| Event | READY | — | branch policy |
| CalendarEvent | READY | — | branch policy |
| QuestionBank | READY | — | branch + role-aware (answers) policy |
| OnlineExam | READY | — | branch + role-aware policy |
| Alumni | READY | — | branch policy |
| AlumniEvent | READY | — | branch policy |
| SalaryStructure | READY | — | branch + admin/own policy |
| TeacherRating | READY | — | branch + teacher/self policy |
| IdCard | READY | — | branch policy |
| Admission | READY | — | branch policy |
| Settings | READY | — | school policy |
| AcademicSession | READY | school-keyed | school policy (branchId nullable, tolerable) |

## B. Semi-direct / nullable tenant

| Model | RLS Ready | Blocker | Required |
|---|---|---|---|
| Profile | **BLOCKED-BY-DATA** → READY | 25 PARENT rows `branch_id=NULL` (**backfilled this phase**) | after backfill: branch stays nullable but all row data clean; policies must still permit SUPER_ADMIN-by-role |
| AuditLog | READY (nullable by design) | none | school/superadmin scoped policy |
| Message | **BLOCKED-BY-SCHEMA** (no branchId) | no branch column | school-level policy only; branch isolation needs schema change (optional) |

## C. Relationship-derived models (Phase 2C EXISTS policies)

**READY for RLS** via relationship derivation (data verified consistent, 0 anomalies):
Section, StudentDocument, StudentParent, StudentEnrollment, AdmissionDocument, AdmissionGuardian, ClassSubject, TeacherAssignment, StudentAttendance, StaffAttendance, LeaveRequest, StudentFeePlan, FeeInvoice, FeeInvoiceItem, Payment, ExamSchedule, ExamResult, ReportCard, HomeworkSubmission, SubmissionAttachment, AnnouncementAttachment, AnnouncementRead, MessageAttachment, MeetingAttendee, MeetingNote, MeetingAttachment, EventRegistration, EventAttachment, OnlineExamQuestion, OnlineExamAttempt, AlumniEventRegistration, StaffSalary, SalarySlip, BookIssue, StudentTransport, Notification, UserPermission.

→ **READY** (no data/schema blocker); Phase 2C defines EXISTS policies.

## D. Platform / global

| Model | State |
|---|---|
| Permission, RolePermission | PLATFORM/GLOBAL (authenticated read for RBAC; superadmin write) |
| School metadata | PLATFORM (own-school read) |

## E. Special-policy models (Phase 2C tailoring, not blockers)

profiles (2FA secret hiding), student_parents (parent-scoped, NOT school-wide), notifications (user_id=uid), messages (sender/receiver + school), leave_requests (own/approver), report_cards (published only), online exam answers (role-aware), salary (admin/own), audit_logs (school/superadmin).

---

## Overall Gate

**RLS READY FOR PHASE 2C: conditional.**

- **Data integrity:** ✓ NO orphan profiles, 0 cross-tenant anomalies, parent branch backfilled this phase.
- **Schema gaps to schedule (Phase 2B/2C decision):** `Student.profileId` (stable identity), `parents.branch_id` (optional direct policy), `Message.branchId` (optional), notification sender attribution (optional).
- **Application guards (Phase 2A):** done.
- **Before Phase 2C enablement, HUMAN decisions required** (from Phase 1 §13): deny-all-direct-client-writes, portal identity migration (email→profileId), self-signup policy, teacher online-exam creation scope, teacher fee visibility, salary visibility, answer-retention, audit-log visibility.

**Conclusion:** The **data layer is RLS-ready** for every tenant-owning model. The remaining items before Phase 2C are **application/design decisions and (optional) schema additions**, not data-corruption blockers.
