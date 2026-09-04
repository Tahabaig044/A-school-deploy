# RLS Phase 2B — Derived / Child Table Tenant Relationships
## Deliverable 7: `DERIVED_TENANT_RELATIONSHIPS.md`

**Principle applied (per brief §7):** Do NOT add `schoolId`/`branchId` columns everywhere. Relationship-based RLS (via `EXISTS` on the tenant-anchor parent) is sufficient for all derived tables.

Verified tenant anchors in current data: School `41f32895…`, Branch `9324ce1b…`. **0 cross-tenant anomalies** detected across all derived tables (single-school, single-branch dataset).

| Child Table | Tenant Path | Direct schoolId? | Direct branchId? | RLS Strategy Later (Phase 2C) |
|-------------|-------------|------------------|------------------|--------------------------------|
| Section | → Class → Branch → School | ❌ | ❌ | EXISTS `class_id IN (classes of tenant)` |
| StudentDocument | → Student → Branch | ❌ | ❌ | EXISTS `student_id` in tenant classes |
| StudentParent | → Parent(school_id) / Student(branch) | ❌ | ❌ | Parent-scoped: EXISTS parent.profile_id = uid **OR** student in tenant |
| StudentEnrollment | → Student / Class → Branch | ❌ | ❌ | EXISTS `student_id` OR `class_id` in tenant |
| AdmissionDocument | → Admission → Branch | ❌ | ❌ | EXISTS admission_id in tenant |
| AdmissionGuardian | → Admission → Branch | ❌ | ❌ | EXISTS admission_id in tenant |
| ClassSubject | → Class / Subject → Branch | ❌ | ❌ | EXISTS class_id/subject_id in tenant |
| TeacherAssignment | → Class / Subject / Teacher → Branch | ❌ | ❌ | EXISTS class/subject in tenant; teacher-own via profile |
| StudentAttendance | → Student / Class → Branch | ❌ | ❌ | EXISTS student_id or class_id in tenant |
| StaffAttendance | → Staff → Branch | ❌ | ❌ | EXISTS staff_id in tenant |
| LeaveRequest | → Profile (requester) | ❌ | ❌ | profile_id = uid OR approver OR school-admin |
| StudentFeePlan | → Student / FeeStructure → Branch | ❌ | ❌ | EXISTS student_id or fee_structure_id in tenant |
| FeeInvoice | → Student → Branch | ❌ | ❌ | OWN (student) / school via student |
| FeeInvoiceItem | → Invoice → Student → Branch | ❌ | ❌ | EXISTS invoice_id → student |
| Payment | → Invoice → Student → Branch | ❌ | ❌ | EXISTS invoice_id → student |
| ExamSchedule | → Exam → Branch | ❌ | ❌ | EXISTS exam_id in tenant |
| ExamResult | → Exam / Student → Branch | ❌ | ❌ | OWN (student) / teacher via exam-class |
| ReportCard | → Student / Exam / Session → Branch | ❌ | ❌ | OWN (student) / published-only |
| HomeworkSubmission | → Homework / Student → Branch | ❌ | ❌ | OWN (student) / teacher via homework |
| SubmissionAttachment | → Submission → Homework → Branch | ❌ | ❌ | EXISTS submission_id → homework |
| AnnouncementAttachment | → Announcement → Branch | ❌ | ❌ | EXISTS announcement_id in tenant |
| AnnouncementRead | → Announcement / Profile | ❌ | ❌ | profile_id = uid OR announcement in tenant |
| MessageAttachment | → Message (school_id) | ❌ | ❌ | EXISTS message_id; sender/receiver uid |
| MeetingAttendee | → Meeting → Branch / Profile | ❌ | ❌ | profile_id = uid OR meeting in tenant |
| MeetingNote | → Meeting → Branch | ❌ | ❌ | EXISTS meeting_id in tenant |
| MeetingAttachment | → Meeting → Branch | ❌ | ❌ | EXISTS meeting_id in tenant |
| EventRegistration | → Event → Branch / Profile | ❌ | ❌ | profile_id = uid OR event in tenant |
| EventAttachment | → Event → Branch | ❌ | ❌ | EXISTS event_id in tenant |
| OnlineExamQuestion | → OnlineExam → Branch | ❌ | ❌ | EXISTS exam_id in tenant |
| OnlineExamAttempt | → OnlineExam / Student → Branch | ❌ | ❌ | OWN (student) / teacher via exam |
| AlumniEventRegistration | → AlumniEvent / Alumni → Branch | ❌ | ❌ | EXISTS event/alumni in tenant |
| StaffSalary | → Staff / SalaryStructure → Branch | ❌ | ❌ | EXISTS staff_id in tenant; admin/own |
| SalarySlip | → Staff / SalaryStructure → Branch | ❌ | ❌ | EXISTS staff_id in tenant; admin/own |
| BookIssue | → LibraryBook / Student → Branch | ❌ | ❌ | EXISTS book/student in tenant |
| StudentTransport | → Student / Route / Vehicle → Branch | ❌ | ❌ | EXISTS student/route/vehicle in tenant |
| Notification | → Profile (receiver, user-owned) | ❌ | ❌ | user_id = auth.uid() |
| UserPermission | → Profile (user-owned) | ❌ | ❌ | profile_id = auth.uid() |
| RolePermission | → Permission (platform) | ❌ | ❌ | authenticated read only |

## Notes
- Every derived table resolves to a tenant anchor through **existing foreign keys** (all FKs to School/Branch/Class/Student/Staff/Exam/etc. are present in the schema).
- **No redundant `schoolId`/`branchId` columns are proposed** for these 39 tables; relationship-derived `EXISTS` policies in Phase 2C will suffice.
- Direct-tenant tables (Section's parent Class, and the ~35 with columns) remain the RLS anchors.
- **Live data is consistent:** all derived rows join back to the single school/branch with zero mismatches.
