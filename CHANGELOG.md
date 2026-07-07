# CHANGELOG.md - School Management System

All notable changes to this project will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased] - 2026-07-06

### Student Admission System (Loop 8)
- **prisma/schema.prisma** — Added `AdmissionStatus` enum (PENDING, UNDER_REVIEW, APPROVED, REJECTED, WAITLISTED), `Admission` model (admission number, student details, previous school, applied class/session, financial info, status tracking), `AdmissionDocument` model, `AdmissionGuardian` model; added `reviewedBy` Profile relation; added admission relations to School, Branch, AcademicSession, Class, Student models
- **actions/admission.actions.ts** — Full admission workflow: createAdmission, updateAdmission, deleteAdmission, reviewAdmission, approveAndEnroll (creates Student + StudentEnrollment + Parent + StudentParent from approved admission), getAdmissions (search, filter, paginate), getAdmissionById, addGuardian, deleteGuardian, uploadAdmissionDocument, deleteAdmissionDocument, getAdmissionStats (status counts), getAdmissionsByClass, getAdmissionsByMonth; admission number format: `ADM-YYYY-NNNNN`
- **app/(dashboard)/dashboard/admissions/page.tsx** — Admission list server component
- **app/(dashboard)/dashboard/admissions/admission-list.tsx** — Client component with search, status filter, pagination
- **app/(dashboard)/dashboard/admissions/new/page.tsx** — New admission page
- **app/(dashboard)/dashboard/admissions/new/admission-form.tsx** — Multi-section form: student info, contact details, admission details, financial info, additional notes
- **app/(dashboard)/dashboard/admissions/[id]/page.tsx** — Admission detail server component
- **app/(dashboard)/dashboard/admissions/[id]/admission-detail.tsx** — Detail view with tabs (details, guardians, documents), review actions, approve/enroll workflow
- **app/(dashboard)/dashboard/reports/admissions/page.tsx** — Admission reports: stats cards, status breakdown, by class, monthly trend charts
- **lib/menu-items.ts** — Added Admissions menu item with UserPlus2 icon
- **components/ui/textarea.tsx** — Created textarea component
- **components/ui/alert-dialog.tsx** — Created alert dialog component

### Announcements Enhancement (Loop 12)
- **prisma/schema.prisma** — Added `AnnouncementAttachment` model (fileName, fileUrl, fileSize, fileType), `AnnouncementRead` model (announcementId, profileId, readAt with unique constraint), `scheduledAt` field to Announcement, `sectionId` field to Announcement, `class` and `section` relations to Announcement, `announcementReads` relation to Profile, `attachments` and `reads` relations to Announcement
- **actions/announcement.actions.ts** — Enhanced with: updated audience enum (ALL, SCHOOL, BRANCH, CLASS, SECTION, TEACHERS, STUDENTS, PARENTS), scheduled publishing support (scheduledAt field, publishScheduledAnnouncements function), read tracking (markAnnouncementAsRead, getAnnouncementReadStats), attachment management (addAnnouncementAttachment, deleteAnnouncementAttachment), getAnnouncementsForUser (role-based audience filtering with read status)
- **app/(dashboard)/dashboard/announcements/announcement-list.tsx** — Enhanced: view detail dialog with full content, attachments display, read status, audience/class/section info, schedule publish field, section field, attachment column, improved form with section support

### Student Portal (Loop 11)
- **actions/student-portal.actions.ts** — Student-specific server actions: getStudentAttendance (month-filtered), getStudentFees (invoices + payments + summary), getStudentResults (exam results by session), getStudentHomework (class-scoped with submissions), getStudentTimetable (weekly schedule), getStudentReportCards, getStudentLeaveRequests, createStudentLeaveRequest, getStudentProfile, getStudentMessages; all actions verify student email linkage
- **app/portal/student/page.tsx** — Enhanced dashboard: welcome header with class/section, stat cards (attendance, exams, fees, homework, messages)
- **app/portal/student/attendance/page.tsx** — Attendance view: month navigation, stats cards (total/present/absent/late/leave with percentages), attendance records table
- **app/portal/student/fees/page.tsx** — Fee status: summary cards (total due/paid/count), invoice list with expandable items and payment history
- **app/portal/student/results/page.tsx** — Exam results: summary stats (total exams, pass rate, average %), results grouped by exam type with marks/grades
- **app/portal/student/homework/page.tsx** — Homework list: subject, teacher, due date, submission status badges, overdue highlighting, graded feedback
- **app/portal/student/timetable/page.tsx** — Weekly timetable: grouped by day (MON-SAT), time/subject/teacher/room per slot
- **app/portal/student/leave-requests/page.tsx** — Leave requests: create form (type/dates/reason), history with status badges
- **app/portal/student/messages/page.tsx** — Messages: inbox with unread highlighting, sender info, content preview
- **app/portal/student/profile/page.tsx** — Profile: personal details, enrollment info, contact info, address
- **lib/portal-menu-items.ts** — Updated student menu: 9 items (Dashboard, My Attendance, My Results, My Fees, Homework, Timetable, Leave Requests, Messages, Profile)

### Teacher Portal (Loop 10)
- **actions/teacher-portal.actions.ts** — Teacher-specific server actions: getTeacherClasses (assignments with class/section/subject), getTeacherStudents (by class), getTeacherTimetable (weekly schedule), getTeacherHomework (with submission counts), getTeacherExamResults (by session), getTeacherLeaveRequests, createTeacherLeaveRequest, getTeacherProfile, updateTeacherProfile; all actions verify teacher profileId linkage
- **app/portal/teacher/page.tsx** — Enhanced dashboard: welcome header, stat cards (classes, students, homework, messages, leave requests)
- **app/portal/teacher/classes/page.tsx** — Assigned classes: grouped by class name, shows subjects and sections per class
- **app/portal/teacher/attendance/page.tsx** — Mark attendance: class selector, student list with status dropdowns (PRESENT/ABSENT/LATE/LEAVE), bulk submit
- **app/portal/teacher/attendance/attendance-form.tsx** — Client component for attendance form with useFormState and bulkMarkAttendance
- **app/portal/teacher/marks/page.tsx** — Exam results: grouped by exam, shows student marks/grades/pass-fail with summary stats
- **app/portal/teacher/homework/page.tsx** — Homework list: title, subject, class/section, due date, submission count, overdue highlighting
- **app/portal/teacher/timetable/page.tsx** — Weekly timetable: grouped by day (MON-SAT), shows time/subject/class/room per slot
- **app/portal/teacher/leave-requests/page.tsx** — Leave requests: create form (type/dates/reason), history with status badges
- **app/portal/teacher/profile/page.tsx** — Profile: info card (email, role, employee code, specialization, qualification) and edit form
- **lib/portal-menu-items.ts** — Updated teacher menu: Dashboard, My Classes, Attendance, Marks, Homework, Timetable, Leave Requests, Profile

### Parent Portal (Loop 9)
- **actions/parent-portal.actions.ts** — Parent-specific server actions: getParentChildren (with full enrollment, attendance, fees, results, homework data), getChildAttendance (month-filtered), getChildFees (invoices + payments + summary), getChildResults (exam results by session), getChildHomework (class-scoped with submissions), getParentAnnouncements, getParentLeaveRequests, createParentLeaveRequest, getParentProfile, updateParentProfile; all actions verify parent email match and student-parent linkage
- **app/portal/parent/page.tsx** — Enhanced parent dashboard: welcome header, stat cards (children, pending fees, announcements, messages), children list with class/section and quick links
- **app/portal/parent/children/page.tsx** — Children overview: card grid with name, admission number, class/section, enrollment status, gender; links to attendance, fees, results per child
- **app/portal/parent/attendance/page.tsx** — Attendance view: child selector, month navigation, stats cards (total/present/absent/late/leave with percentages), attendance records table with date, status badge, class, remarks
- **app/portal/parent/fees/page.tsx** — Fee status: child selector, summary cards (total due/paid/invoices), invoice list with collapsible details showing items and payment history, status badges
- **app/portal/parent/results/page.tsx** — Exam results: child selector, summary stats (total exams, pass rate, passed, average %), results grouped by exam type with marks, grade, pass/fail indicators
- **app/portal/parent/homework/page.tsx** — Homework: child selector, homework list with subject, teacher, due date, submission status, marks, overdue highlighting, feedback display
- **app/portal/parent/notices/page.tsx** — Notices/announcements: published announcements with title, audience, content preview, author, date
- **app/portal/parent/leave-requests/page.tsx** — Leave requests: create form (type, dates, reason), request history with status badges (PENDING/APPROVED/REJECTED)
- **app/portal/parent/profile/page.tsx** — Profile: email, role, member since info; edit form for firstName, lastName, phone with success/error feedback
- **lib/portal-menu-items.ts** — Updated parent menu: Dashboard, My Children, Attendance, Fee Status, Results, Homework, Notices, Leave Requests, Profile

### Input Validation & Error Handling (Loop 7)
- **package.json** — Fixed Vercel build: added `prisma generate` before `next build` in build script
- **9 action files** — Added Zod schemas to student, teacher, class, fees, staff, subject, branch, session, expenses actions — validates required fields, types, enums, email format, UUID format before database operations
- **student.actions.ts** — Added `studentSchema` and `enrollmentSchema` with Gender/StudentStatus enum validation
- **teacher.actions.ts** — Added `teacherSchema` with EmployeeStatus enum validation
- **class.actions.ts** — Added `classSchema` and `sectionSchema` with numeric validation
- **fees.actions.ts** — Added `feeStructureSchema`, `assignFeePlanSchema`, `recordPaymentSchema` with FeeFrequency/FeeCategory/PaymentMode enum validation
- **staff.actions.ts** — Added `staffSchema` with EmployeeStatus enum validation
- **subject.actions.ts** — Added `subjectSchema` and `classSubjectSchema` with SubjectType enum validation
- **branch.actions.ts** — Added `branchSchema` with email validation
- **session.actions.ts** — Added `sessionSchema` with date validation
- **expenses.actions.ts** — Added `expenseSchema` with amount positivity check
- **All 9 action files** — Wrapped all Prisma operations in try/catch blocks — returns user-friendly error messages instead of raw database errors
- **auth.actions.ts** — Added `validatePassword()` function enforcing: 8+ characters, uppercase, lowercase, number
- **lib/supabase/server.ts** — Hardened cookie security: httpOnly, secure (production), sameSite: lax, path: /

### Security & Production Readiness (Loop 6)
- **CRITICAL: School isolation on update/delete actions** — Added schoolId ownership verification to 12 action files (student, teacher, class, fees, exam, staff, expenses, subject, branch, session, timetable, leave) — prevents cross-tenant data access where a user from School A could modify/delete School B's data by passing arbitrary IDs
- **CRITICAL: Role-based route protection** — Added role-route mapping to `proxy.ts` — STUDENT can no longer access `/dashboard/schools`, `/dashboard/fees/fee-structures`, etc.; admin users can no longer access `/portal/*` routes; redirects unauthorized users to `/dashboard`
- **Security headers** — Added X-Frame-Options (DENY), X-Content-Type-Options (nosniff), Referrer-Policy (strict-origin-when-cross-origin), X-XSS-Protection (1; mode=block) to all responses via proxy middleware
- **auth.actions.ts** — Sanitized all Supabase error messages — `fallbackError.message`, `updateError.message`, `error.message` now return generic user-friendly messages instead of leaking internal details
- **student.actions.ts** — Added school isolation check to `updateStudent` and `deleteStudent`
- **teacher.actions.ts** — Added school isolation check to `updateTeacher` and `deleteTeacher`
- **class.actions.ts** — Added school isolation check to `updateClass` and `deleteClass`
- **fees.actions.ts** — Added school isolation check to `updateFeeStructure` and `deleteFeeStructure`
- **exam.actions.ts** — Added school isolation check to `updateExamType`, `deleteExamType`, `updateExam`, `deleteExam`
- **staff.actions.ts** — Added school isolation check to `updateStaff` and `deleteStaff`
- **expenses.actions.ts** — Added school isolation check to `updateExpense` and `deleteExpense`
- **subject.actions.ts** — Added school isolation check to `updateSubject` and `deleteSubject`
- **branch.actions.ts** — Added school isolation check to `updateBranch` and `deleteBranch`
- **session.actions.ts** — Added school isolation check to `setCurrentSession` and `deleteSession`
- **timetable.actions.ts** — Added school isolation check to `deleteTimetableSlot`
- **leave.actions.ts** — Added school isolation check to `approveLeave` and `rejectLeave`

### Performance Optimization (Loop 5)
- **lib/auth.ts** - Fixed requireRole double Supabase getUser() call — now makes 1 auth request instead of 2
- **lib/prisma.ts** - Added connection pool configuration (max: 10, idleTimeout: 30s, connectionTimeout: 5s)
- **actions/attendance.actions.ts** - Batched bulkMarkAttendance with prisma.$transaction — reduced N+1 queries (50 students: 100+ queries → 3 queries)
- **actions/exam.actions.ts** - Batched submitBulkExamResults with prisma.$transaction — reduced N+1 queries (30 students: 30 queries → 3 queries); added Grade enum import
- **app/(dashboard)/dashboard/teachers/page.tsx** - Added pagination (PAGE_SIZE=20) with parallel count query
- **app/(dashboard)/dashboard/teachers/teacher-list.tsx** - Added pagination UI (Previous/Next buttons)
- **app/(dashboard)/dashboard/messages/page.tsx** - Added pagination (PAGE_SIZE=20) with tab-aware queries and parallel counts
- **app/(dashboard)/dashboard/messages/message-list.tsx** - Added pagination UI and URL-based tab navigation
- **app/(dashboard)/dashboard/classes/page.tsx** - Added pagination (PAGE_SIZE=20) with parallel count query
- **app/(dashboard)/dashboard/classes/class-list.tsx** - Added pagination UI
- **app/(dashboard)/dashboard/staff/page.tsx** - Added pagination (PAGE_SIZE=20) with parallel count query
- **app/(dashboard)/dashboard/staff/staff-list.tsx** - Added pagination UI
- **app/(dashboard)/dashboard/attendance/page.tsx** - Parallelized classes + sessions queries with Promise.all
- **app/(dashboard)/dashboard/students/new/page.tsx** - Parallelized classes + sessions queries with Promise.all
- **app/(dashboard)/dashboard/fees/invoices/page.tsx** - Moved academicSessions into existing Promise.all for full parallelization

### Complete CRUD Standardization (Loop 4)
- **actions/session.actions.ts** - Added `updateSession` function for editing session name/dates
- **actions/class.actions.ts** - Added `updateSection` function for editing section name/capacity
- **actions/timetable.actions.ts** - Added `updateTimetableSlot` function with conflict checking
- **actions/fees.actions.ts** - Added `cancelInvoice` function with audit logging
- **actions/auth.actions.ts** - Added `updateUser` (role, name, phone, isActive) and `deleteUser` (with Supabase auth cleanup) functions
- **actions/attendance.actions.ts** - Added school scoping to `markAttendance`, `bulkMarkAttendance`, `markStaffAttendance` — now verifies class/staff belongs to user's school
- **app/(dashboard)/dashboard/students/student-list.tsx** - Added Actions column with Edit/Delete buttons
- **app/(dashboard)/dashboard/sessions/session-list.tsx** - Converted to client component, added edit dialog
- **app/(dashboard)/dashboard/classes/[id]/section-list.tsx** - Converted to client component, added edit dialog
- **app/(dashboard)/dashboard/fees/invoices/invoice-list.tsx** - Added Cancel button for unpaid invoices
- **app/(dashboard)/dashboard/users/users-list.tsx** - Added Edit/Delete buttons with edit dialog
- **lib/audit.ts** - Added "CANCEL" to AuditAction type

### Dashboard Stabilization (Loop 3)
- **app/(dashboard)/loading.tsx** - Added loading skeleton for dashboard Suspense boundary
- **components/layout/portal-mobile-sidebar.tsx** - Fixed: mobile sidebar was embedding PortalSidebar (hidden md:flex) inside Sheet, making nav invisible on mobile
- **components/layout/portal-sidebar.tsx** - Extracted PortalNavList as reusable component; fixed nested route active state (strict === → startsWith)
- **components/layout/notifications-dropdown.tsx** - Wired to getUnreadNotificationCount server action (was hardcoded "0")
- **components/layout/user-dropdown.tsx** - Added Settings link, formatted role display, fixed asChild pattern for MenuItem
- **components/layout/branch-selector.tsx** - Added SameSite=Lax to branch cookie
- **lib/menu-items.ts** - Fixed Dashboard permission (students.view → settings.view) so LIBRARIAN/TRANSPORT_MANAGER can see it; added Exams, Library, Transport, Announcements, Reports menu items
- **10 list components** - Added try/catch error handling to all delete handlers (exam-list, expense-list, homework-list, book-list, announcement-list, fee-structure-list, schedule-list, exam-type-list, vehicle-list, route-list)

### Security (Permission Audit - Loop 2)
- **lib/school-context.ts** - CRITICAL: Prevented client-controlled school/branch isolation. `getSchoolId()`/`getBranchId()` now only allow formData override for SUPER_ADMIN role. All other roles always use profile's schoolId/branchId.
- **notification.actions.ts** - CRITICAL: Added auth checks to `createNotification`, `markAllNotificationsAsRead`, `getNotifications`, `getUnreadNotificationCount`. Removed client-supplied userId parameters.
- **message.actions.ts** - CRITICAL: Added auth to `getUnreadMessageCount`. Removed `senderId` from formData (prevents impersonation). Removed client userId from `getInboxMessages`/`getSentMessages`. Added ownership check on `getMessageById`.
- **announcement.actions.ts** - Removed `authorId` from formData (prevents impersonation). Added ownership checks to `updateAnnouncement` and `deleteAnnouncement`.
- **homework.actions.ts** - Removed `studentId` from formData in `submitHomework` (prevents impersonation). Added ownership checks to `updateHomework` and `deleteHomework`.
- **students/[id]/page.tsx** - Added school scoping to prevent cross-school student access.
- **students/[id]/edit/page.tsx** - Added school scoping to student fetch.
- **classes/[id]/page.tsx** - Added school scoping to prevent cross-school class access.
- **leaves/page.tsx** - Added school filter for admin queries (prevents cross-school leave visibility).
- **homework/check/page.tsx** - Added school scoping to homework and submissions fetch.
- **homework/submissions/page.tsx** - Fixed admin filter to scope by school instead of using admin's own studentId.
- **fees/defaulters/page.tsx** - Added schoolId filter to overdue invoices query.
- **fees/collection-report/page.tsx** - Added schoolId filter to payments query.
- **exams/schedule/page.tsx** - Added schoolId filter to exam schedule query.
- **exams/results/page.tsx** - Added schoolId filter to exam results query.
- **exams/report-cards/page.tsx** - Added schoolId filter to report cards query.

### Fixed
- **attendance.actions.ts** - TypeScript error: `teacher?.id ?? undefined` changed to `teacher?.id || ""` to match Prisma's `string` requirement
- **setup-password-form.tsx** - Password `minLength` changed from 6 to 8 to match server-side validation
- **auth.actions.ts** - Self-registration now includes `email`, `status: "ACTIVE"`, and `isActive: true` in Profile creation
- **sidebar.tsx** - Nested route highlighting now works with `pathname.startsWith(item.href + "/")`
- **mobile-sidebar.tsx** - Same nested route highlighting fix applied
- **dashboard/page.tsx** - Added error handling for `getDashboardStats()` and null profile guard
- **portal/student/page.tsx** - Added try/catch for all Prisma queries
- **portal/parent/page.tsx** - Added try/catch for all Prisma queries
- **portal/teacher/page.tsx** - Added try/catch for all Prisma queries
- **dashboard-cards.tsx** - Replaced `any` types with proper `DashboardStats` and `DashboardProfile` interfaces
- **dashboard/layout.tsx** - Fixed PORTAL_ROLES type compatibility with `Role` type
- **portal/layout.tsx** - Fixed PORTAL_ROLES type compatibility with `Role` type

### Added
- **teacher-list.tsx** - Edit dialog and delete button with confirmation
- **staff-list.tsx** - Edit dialog and delete button with confirmation
- **class-list.tsx** - Edit dialog and delete button with confirmation
- **subject-list.tsx** - Edit dialog and delete button with confirmation
- **branch-list.tsx** - Edit dialog and delete button with confirmation
- **school-list.tsx** - Edit dialog and delete button with confirmation

### Changed
- **lib/constants.ts** - Added `PORTAL_ROLES` constant and `PortalRole` type
- **dashboard/layout.tsx** - Refactored to use shared `PORTAL_ROLES` from constants
- **portal/layout.tsx** - Refactored to use shared `PORTAL_ROLES` from constants
- **portal/teacher/page.tsx** - Updated leave requests card description text

---

## [0.1.0] - Initial Development

### Core System
- Next.js 16 with TypeScript
- Tailwind CSS 4 with shadcn/ui
- Prisma 7 with PostgreSQL (Supabase)
- Supabase Auth with multi-tenant RBAC
- Server Actions (24 action files)
- 11 user roles with 48 granular permissions

### Authentication
- Login/Logout with Supabase Auth
- Forgot Password / Reset Password flow
- Invitation flow with token-based setup
- Session refresh via proxy middleware
- Account lockout after 5 failed attempts

### Dashboard
- Admin dashboard with 8 stat widgets
- Role-based sidebar with permission filtering
- Branch selector for multi-branch schools
- Notifications dropdown (placeholder)
- User dropdown with role display

### Modules (31 CRUD modules)
- Students (C/R/U/D/V with enrollment, documents, fees)
- Teachers (C/R with assignments)
- Staff (C/R with department tracking)
- Classes & Sections (C/R with detail view)
- Subjects (C/R with class assignment)
- Exams (C/R/U/D with types, schedules, results, report cards)
- Fees (C/R/U/D with structures, invoices, payments, defaulters)
- Expenses (C/R/U/D)
- Homework (C/R/U/D with submissions and grading)
- Library (C/R/U/D with book issues)
- Transport (C/R/U/D with vehicles, routes, assignments)
- Announcements (C/R/U/D)
- Messages (C/R with inbox/sent)
- Leaves (C/R with approve/reject workflow)
- Attendance (C/R with history)
- Timetable (C/R/U/D with weekly grid)
- Sessions (C/R/D with active session toggle)
- Branches (C/R with school association)
- Schools (C/R)
- Reports (7 report types)
- Audit Logs (R)
- Settings

### Portals
- Student portal with attendance, exams, fees, homework, messages
- Parent portal with children, fees, announcements, messages
- Teacher portal with classes, students, homework, messages, leaves
