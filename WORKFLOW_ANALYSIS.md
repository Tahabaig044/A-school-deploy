# WORKFLOW_ANALYSIS.md

> School Management System - Complete Workflow Analysis
> Generated: 2026-07-09
> No code modifications. Read-only analysis.

---

## Table of Contents

1. [Authentication Workflow](#1-authentication-workflow)
2. [User Creation Workflow](#2-user-creation-workflow)
3. [Teacher Workflow](#3-teacher-workflow)
4. [Student Workflow](#4-student-workflow)
5. [Parent Workflow](#5-parent-workflow)
6. [Portal Workflow](#6-portal-workflow)
7. [Relationship Diagrams](#7-relationship-diagrams)
8. [Navigation Flow](#8-navigation-flow)
9. [Data Flow](#9-data-flow)
10. [Validation](#10-validation)
11. [Missing Links](#11-missing-links)
12. [Root Cause Analysis](#12-root-cause-analysis)

---

## 1. Authentication Workflow

### 1.1 Login

**Step-by-step flow:**

1. User navigates to `/login` (public route, bypasses auth check in `proxy.ts:39`)
2. `app/(auth)/login/page.tsx` renders `LoginForm`
3. `app/(auth)/login/login-form.tsx` calls `signin` server action via `useActionState`
4. `actions/auth.actions.ts:294-425` - `signin()` function executes:

   **a. Profile lookup & lockout check:**
   - Finds profile by email: `prisma.profile.findUnique({ where: { email } })` (line 308)
   - Checks `lockedUntil` timestamp - returns lockout message if still locked (line 323)
   - Checks `status !== "ACTIVE" || !isActive` - returns "account not active" (line 333)

   **b. Supabase authentication:**
   - Calls `supabase.auth.signInWithPassword({ email, password })` (line 338)

   **c. On failure:**
   - Increments `failedLoginAttempts` on profile (line 346-352)
   - After 5 failures: locks account for 30 minutes (`lockedUntil`) (line 350)
   - Audit-logs the failed attempt (line 360-374)
   - Returns `"Invalid email or password."`

   **d. On success:**
   - Fetches user: `supabase.auth.getUser()` (line 383)
   - Fetches profile: `prisma.profile.findUnique({ where: { id: user.id } })` (line 388)
   - Updates login activity: `lastLoginAt`, `lastLoginIp`, `lastLoginDevice`, resets `failedLoginAttempts` (line 395-404)
   - Audit-logs success (line 407-417)
   - Determines redirect: `getRedirectPath(loginProfile.role)` (line 419)
   - Redirects: `redirect(redirectPath)` (line 424)

**Redirect map (`lib/auth-helpers.ts:3-15`):**

| Role              | Redirect Path     |
| ----------------- | ----------------- |
| SUPER_ADMIN       | `/dashboard`      |
| SCHOOL_ADMIN      | `/dashboard`      |
| BRANCH_ADMIN      | `/dashboard`      |
| PRINCIPAL         | `/dashboard`      |
| ACCOUNTANT        | `/dashboard`      |
| ADMISSION_OFFICER | `/dashboard`      |
| LIBRARIAN         | `/dashboard`      |
| TRANSPORT_MANAGER | `/dashboard`      |
| TEACHER           | `/portal/teacher` |
| STUDENT           | `/portal/student` |
| PARENT            | `/portal/parent`  |

### 1.2 Logout

1. User clicks sign out in `components/layout/user-dropdown.tsx:73-79`
2. Form calls `signout` server action
3. `actions/auth.actions.ts:428-454` - `signout()`:
   - Gets current user via `supabase.auth.getUser()` (line 432)
   - Fetches profile for school/branch context (line 435)
   - Audit-logs the logout event (line 441-448)
   - Calls `supabase.auth.signOut()` (line 451)
   - Revalidates entire layout (line 452)
   - Redirects to `/login` (line 453)

### 1.3 Invitation Flow

**Step 1: Admin invites user**

- Page: `app/(dashboard)/dashboard/users/page.tsx` - requires `SUPER_ADMIN` or `SCHOOL_ADMIN` role
- Form: `app/(dashboard)/dashboard/users/invite-user-form.tsx`
- Action: `actions/auth.actions.ts:45-190` - `inviteUser()`

**Detailed flow:**

1. Calls `requireInvitePermission()` to verify caller is SUPER_ADMIN or SCHOOL_ADMIN (line 49)
2. Extracts: email, firstName, lastName, role, phone from formData (line 51-55)
3. Checks School Admin cannot invite SUPER_ADMIN or SCHOOL_ADMIN (line 62-64)
4. Checks email uniqueness across Profile table (line 67-77)
5. Also checks Supabase auth for existing users (line 80-84)
6. Generates cryptographically secure token: 32 random bytes (line 87)
7. Hashes token with SHA-256: `hashToken(rawToken)` (line 88)
8. Calculates 24-hour expiry (line 89)
9. Calls `serviceClient.auth.admin.inviteUserByEmail()` with `redirectTo` pointing to `/setup-password?token=${rawToken}` (line 93-103)
10. **Fallback:** If invite fails, creates user via `serviceClient.auth.admin.createUser()` with random unusable password and `email_confirm: true` (line 107-116)
11. Creates Profile record with:
    - `id` = Supabase auth user ID
    - `status: "INVITED"`
    - `invitationToken: hashedToken`
    - `invitationExpiresAt: expiresAt`
    - `invitedById: user.id`
    - `schoolId` and `branchId` from inviter's profile (line 122-138 / 157-173)
12. Builds invitation link: `${APP_URL}/setup-password?token=${rawToken}` (line 140/175)
13. Audit-logs the invitation creation (line 142-151 / 177-186)
14. Returns `{ success: true, invitationLink }`

**Step 2: Invited user sets password**

- Page: `app/(auth)/setup-password/page.tsx`
- Form: `app/(auth)/setup-password/setup-password-form.tsx`

**Detailed flow:**

1. Reads `token` from URL search params (line 15-16)
2. On mount, calls `getInvitationByToken(token)` to validate (line 25-39)
3. `getInvitationByToken()` (auth.actions.ts:193-225):
   - Hashes the raw token before lookup (line 195)
   - Finds profile by `invitationToken` hash (line 197-208)
   - Returns error if not found: "Invalid invitation link" (line 210-211)
   - Returns error if status is not "INVITED": "already been used" (one-time use) (line 214-217)
   - Returns error if token expired (line 219-222)
4. User fills form: password + confirmPassword
5. Form calls `acceptInvitation` server action
6. `acceptInvitation()` (auth.actions.ts:228-291):
   - Validates password (8+ chars, uppercase, lowercase, number) (line 240-243)
   - Validates passwords match (line 245-247)
   - Validates token via `getInvitationByToken()` (line 249-253)
   - Sets password via `serviceClient.auth.admin.updateUserById(profile.id, { password })` (line 259-262)
   - Updates profile: `status: "ACTIVE"`, `isActive: true`, clears `invitationToken`, `invitationExpiresAt`, resets `failedLoginAttempts` and `lockedUntil` (line 269-279)
   - Audit-logs "INVITATION_ACCEPTED" (line 282-288)
7. Shows "Password set successfully!" with "Sign In" button

### 1.4 Setup Password

See Section 1.3, Step 2 above. The setup password page is exclusively for accepting invitations.

### 1.5 Session Creation

- **Session management** is handled entirely by Supabase Auth
- **Server-side:** `lib/supabase/server.ts` creates Supabase server client with cookie-based auth
- **Client-side:** `lib/supabase/client.ts` creates browser Supabase client
- **Middleware:** `proxy.ts` (Next.js 16 middleware) calls `supabase.auth.getUser()` on every non-public request to refresh the session (line 71)
- **Request context caching:** `lib/auth.ts:19-31` - `setRequestContext()` / `getRequestContext()` / `clearRequestContext()` avoid redundant DB calls within a single request

### 1.6 Profile Creation

Profiles are created in two scenarios:

**A. During Invitation (primary flow):**

- `actions/auth.actions.ts:122-138` or `157-173`
- `prisma.profile.create()` with: id (Supabase user ID), email, firstName, lastName, role, phone, schoolId, branchId, status: "INVITED", invitationToken, invitationExpiresAt, invitedById

**B. During Self-Registration (legacy):**

- `actions/auth.actions.ts:571-574`
- `prisma.profile.create()` with: id (Supabase user ID), email, firstName, lastName, role, status: "ACTIVE", isActive: true
- Note: No schoolId/branchId assigned during self-registration

### 1.7 Role Assignment

- Role is assigned during invitation via the `role` formData field (auth.actions.ts:54)
- Stored in `Profile.role` field (schema.prisma:14)
- School Admin cannot assign SUPER_ADMIN or SCHOOL_ADMIN roles (auth.actions.ts:42, 62-64)
- Self-registration restricted to STUDENT, PARENT, TEACHER roles only (auth.actions.ts:39, 546)

### 1.8 Redirect Logic

- Post-login: `getRedirectPath(role)` maps role to path (`lib/auth-helpers.ts:17-18`)
- Dashboard layout redirect: `app/(dashboard)/layout.tsx:52-61` redirects portal roles to their portal
- Portal root redirect: `app/portal/page.tsx:4-21` reads `X-User-Role` header and redirects
- Middleware redirect: `proxy.ts:86-98` redirects non-portal roles from `/portal` to `/dashboard`

---

## 2. User Creation Workflow

### What happens when an Admin creates a new User:

| Step                           | Detail                                                                                                    |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| **1. Starting Page**           | `app/(dashboard)/dashboard/users/page.tsx` - Users list page (requires SUPER_ADMIN or SCHOOL_ADMIN)       |
| **2. Form**                    | `app/(dashboard)/dashboard/users/invite-user-form.tsx` - Collects firstName, lastName, email, role, phone |
| **3. Server Action**           | `actions/auth.actions.ts:45-190` - `inviteUser()`                                                         |
| **4. Supabase Auth API**       | `serviceClient.auth.admin.inviteUserByEmail(email, { redirectTo, data })` (line 93)                       |
| **4b. Fallback**               | `serviceClient.auth.admin.createUser({ email, password: random, email_confirm: true })` (line 107)        |
| **5. Prisma Models Updated**   | `Profile` - `prisma.profile.create()` (line 122 or 157)                                                   |
| **6. Database Tables Written** | `profiles` table                                                                                          |
| **7. Profile Created**         | Yes - Profile is created with status "INVITED", invitation token, expiry, and invitedBy reference         |
| **8. Role Assigned**           | From formData `role` field - stored in `Profile.role`                                                     |
| **9. schoolId Assigned**       | From inviter's `profile.schoolId` (line 131/166)                                                          |
| **10. branchId Assigned**      | From inviter's `profile.branchId` (line 132/167)                                                          |
| **11. Status Assigned**        | `"INVITED"` (line 133/168)                                                                                |
| **12. Audit Log**              | `logAuditEvent({ action: "CREATE", entityType: "INVITATION" })` (line 143/178)                            |
| **13. Invitation Link**        | Returned to admin: `${APP_URL}/setup-password?token=${rawToken}`                                          |

### Complete File Chain:

```
app/(dashboard)/dashboard/users/page.tsx          (Server Component - requires role)
  -> app/(dashboard)/dashboard/users/users-list.tsx    (Users list with edit/delete)
  -> app/(dashboard)/dashboard/users/invite-user-form.tsx  (Invite form)
       -> actions/auth.actions.ts:inviteUser()          (Server Action)
            -> lib/supabase/server.ts:createServiceClient()  (Supabase admin client)
            -> serviceClient.auth.admin.inviteUserByEmail()   (Supabase Auth API)
            -> lib/token.ts:generateToken()              (32-byte crypto token)
            -> lib/token.ts:hashToken()                  (SHA-256 hash)
            -> prisma.profile.create()                   (Database insert)
            -> lib/audit.ts:logAuditEvent()              (Audit trail)
            -> next/cache:revalidatePath()               (Cache invalidation)
```

---

## 3. Teacher Workflow

### 3.1 How does a Teacher get created?

**A Teacher is created from BOTH modules:**

#### Path 1: Teachers Module (creates Teacher record ONLY)

- Page: `app/(dashboard)/dashboard/teachers/page.tsx`
- Form: `app/(dashboard)/dashboard/teachers/teacher-form.tsx`
- Action: `actions/teacher.actions.ts:23-80` - `createTeacher()`
- Tables updated:
  - `teachers` - `prisma.teacher.create()` (line 50)
  - `audit_logs` - `logAuditEvent()` (line 66)
- **Does NOT create:**
  - Profile (no auth user)
  - Supabase auth user
  - Role mapping
- The `profileId` on Teacher is NOT set during creation (line 50-64)

#### Path 2: Users Module (creates Profile + invites user)

- Page: `app/(dashboard)/dashboard/users/page.tsx`
- Form: `app/(dashboard)/dashboard/users/invite-user-form.tsx`
- Action: `actions/auth.actions.ts:45-190` - `inviteUser()`
- Creates:
  - Supabase auth user (line 93 or 107)
  - Profile with role "TEACHER" (line 122 or 157)
- **Does NOT create:**
  - Teacher record
  - Teacher-Profile link

### 3.2 The Critical Gap: Teacher <-> Profile Linking

The Teacher model has an optional `profileId` field (schema.prisma:429):

```
profileId String? @unique @map("profile_id") @db.Uuid
```

**There is NO automatic mechanism that links a Teacher record to a Profile.** The two must be manually or externally linked. The `createTeacher` action does not set `profileId`. The `inviteUser` action does not create a Teacher record.

**Consequence:** After creating both a Teacher record and inviting a user with TEACHER role, the teacher portal dashboard cannot find the Teacher record (`teacher-portal.actions.ts:14-16`):

```typescript
const teacher = await prisma.teacher.findFirst({
  where: { profileId: user.id },
})
```

This returns `null` because `profileId` was never set.

### 3.3 Tables Updated When Teacher is Created

| Table                   | Action   | Created By                                     |
| ----------------------- | -------- | ---------------------------------------------- |
| `teachers`              | `INSERT` | `createTeacher()` in `teacher.actions.ts:50`   |
| `audit_logs`            | `INSERT` | `logAuditEvent()` in `teacher.actions.ts:66`   |
| `profiles`              | `INSERT` | `inviteUser()` in `auth.actions.ts:122/157`    |
| `auth.users` (Supabase) | `INSERT` | `inviteUser()` in `auth.actions.ts:93/107`     |
| `audit_logs`            | `INSERT` | `logAuditEvent()` in `auth.actions.ts:143/178` |

### 3.4 Relationship

```
auth.users (Supabase)
    |
    | id = Profile.id (1:1)
    v
Profile (role = "TEACHER")
    |
    | ??? profileId on Teacher is NOT automatically set
    v
Teacher (standalone record)
    |
    | teacherId on TeacherAssignment
    v
TeacherAssignment -> Class, Section, Subject, AcademicSession
    |
    | teacherId on Timetable
    v
Timetable -> Class, Section, Subject, DayOfWeek, Time
```

**The link between Profile and Teacher is BROKEN by default.**

---

## 4. Student Workflow

### 4.1 How does a Student get created?

**Two paths exist:**

#### Path 1: Direct Student Creation (Admin Dashboard)

- Page: `app/(dashboard)/dashboard/students/new/page.tsx`
- Form: `app/(dashboard)/dashboard/students/student-form.tsx`
- Action: `actions/student.actions.ts:36-129` - `createStudent()`
- Tables updated:
  - `students` - `prisma.student.create()` (line 79)
  - `student_enrollments` - `prisma.studentEnrollment.create()` (line 102) - if classId and academicSessionId provided
  - `audit_logs` - `logAuditEvent()` (line 115)

#### Path 2: Admission-Based Creation (Full Flow)

1. **Create Admission:** `actions/admission.actions.ts:50-136` - `createAdmission()`
   - Creates `admissions` record with auto-generated admission number (ADM-YYYY-NNNNN)
   - Tables: `admissions`, `audit_logs`

2. **Add Guardians:** `actions/admission.actions.ts:504-561` - `addGuardian()`
   - Creates `admission_guardians` records linked to admission

3. **Review:** `actions/admission.actions.ts:246-298` - `reviewAdmission()`
   - Updates admission status to APPROVED/REJECTED/WAITLISTED

4. **Approve and Enroll:** `actions/admission.actions.ts:300-415` - `approveAndEnroll()`
   - Creates `students` record from admission data (line 322-344)
   - Creates `student_enrollments` record (line 346-354)
   - Creates `parents` records from admission guardians (line 356-369)
   - Creates `student_parents` junction records (line 380-387)
   - Updates admission with `studentId` link (line 390-398)
   - Audit-logs (line 400-406)

### 4.2 Tables Updated

| Table                 | Action   | Created By                                |
| --------------------- | -------- | ----------------------------------------- |
| `students`            | `INSERT` | `createStudent()` or `approveAndEnroll()` |
| `student_enrollments` | `INSERT` | `createStudent()` or `approveAndEnroll()` |
| `parents`             | `INSERT` | `approveAndEnroll()` (from guardians)     |
| `student_parents`     | `INSERT` | `approveAndEnroll()` or `addParent()`     |
| `audit_logs`          | `INSERT` | All actions                               |

### 4.3 How Records are Linked

```
Student
  |
  |-- student_enrollments --> Class, Section, AcademicSession (1:many)
  |
  |-- student_parents --> Parent (many:many via junction)
  |
  |-- attendance --> StudentAttendance (1:many)
  |
  |-- examResults --> ExamResult (1:many)
  |
  |-- invoices --> FeeInvoice (1:many)
  |
  |-- homeworkSubmissions --> HomeworkSubmission (1:many)
  |
  |-- documents --> StudentDocument (1:many)
  |
  |-- transport --> StudentTransport (1:many)
```

### 4.4 Parent, Class, Section Connection

- **Parent <-> Student:** Connected via `StudentParent` junction table (many:many)
- **Class <-> Student:** Connected via `StudentEnrollment` (student enrolled in a class)
- **Section <-> Student:** Connected via `StudentEnrollment.sectionId` (optional, student in a section of a class)
- **AcademicSession:** Every enrollment is scoped to an academic session

---

## 5. Parent Workflow

### 5.1 How Parent accounts are created

**Two paths:**

#### Path 1: Direct Parent Addition (from Student Profile)

- Page: `app/(dashboard)/dashboard/students/[id]/student-profile.tsx` (Parents tab, lines 254-307)
- Form: Inline form in student profile
- Action: `actions/parent.actions.ts:8-53` - `addParent()`
- Tables updated:
  - `parents` - `prisma.parent.create()` (line 30)
  - `student_parents` - `prisma.studentParent.create()` (line 45) - if studentId provided

#### Path 2: Admission Enrollment (automatic)

- Action: `actions/admission.actions.ts:300-415` - `approveAndEnroll()`
- Converts `admission_guardians` to `parents` records (line 356-369)
- Creates `student_parents` links (line 380-387)

### 5.2 How Parent is linked with Student

- **During admission:** `approveAndEnroll()` automatically creates Parent records from AdmissionGuardian data and links them via StudentParent junction
- **Manually:** `addParent()` creates a Parent record and optionally links to a Student via StudentParent
- **Portal access:** Parent portal finds parent by matching `email: userEmail` against the `parents` table (`parent-portal.actions.ts:37-54`)

### 5.3 Important: Parent Portal Authentication

The parent portal uses **email matching** to find the parent record:

```typescript
parent = await prisma.parent.findFirst({
  where: { email: userEmail },
  include: { students: { include: { student: { include: { enrollments: ... } } } } },
})
```

This means:

- The Parent's email in the `parents` table MUST match the Profile email
- If emails don't match, the parent portal shows no children

---

## 6. Portal Workflow

### 6.1 Portal Router

`app/portal/page.tsx` - Reads `X-User-Role` header (set by `proxy.ts:101`) and redirects:

- STUDENT -> `/portal/student`
- PARENT -> `/portal/parent`
- TEACHER -> `/portal/teacher`
- Other -> `/dashboard`

### 6.2 Teacher Portal

**Dashboard:** `app/portal/teacher/page.tsx`

**Data flow chain:**

```
proxy.ts (middleware)
  |-> Sets X-User-Id, X-User-Role, X-User-Email headers
  v
app/portal/teacher/page.tsx
  |-> Reads headers (lines 13-15)
  |-> Validates role is TEACHER (line 18)
  |-> setRequestContext() (line 24-27)
  |-> prisma.profile.findUnique({ id: userId }) (line 30-33)
  |-> prisma.teacher.findFirst({ profileId: userId }) (line 37-39)
  |-> Counts: classes, students, homework, messages, leave requests (lines 44-89)
  |-> Renders dashboard cards (lines 91-97)
  v
Portal pages (via teacher-portal.actions.ts):
  |-> getTeacherClasses() -> teacherAssignment.findMany({ teacherId })
  |-> getTeacherStudents(classId) -> student.findMany({ enrollments: { classId } })
  |-> getTeacherTimetable() -> timetable.findMany({ teacherId })
  |-> getTeacherHomework() -> homework.findMany({ teacherId })
  |-> getTeacherExamResults() -> examResult.findMany({ exam: { classId: { in } } })
  |-> getTeacherLeaveRequests() -> leaveRequest.findMany({ profileId })
  |-> getTeacherProfile() -> profile.findUnique + teacher.findFirst
```

### 6.3 Student Portal

**Dashboard:** `app/portal/student/page.tsx`

**Data flow chain:**

```
proxy.ts (middleware)
  |-> Sets X-User-Id, X-User-Role, X-User-Email headers
  v
app/portal/student/page.tsx
  |-> Reads headers (lines 13-15)
  |-> Validates role is STUDENT (line 18)
  |-> setRequestContext() (line 24-27)
  |-> prisma.profile.findUnique({ id: userId }) (line 30-33)
  |-> prisma.student.findFirst({ email: userEmail }) (line 37-48)
  |    |-> includes enrollments with class and section
  |-> Counts: attendance, exams, fees, homework, messages (lines 51-78)
  |-> Renders dashboard cards (lines 82-88)
  v
Portal pages (via student-portal.actions.ts):
  |-> getStudentAttendance() -> studentAttendance.findMany({ studentId })
  |-> getStudentResults() -> examResult.findMany({ studentId })
  |-> getStudentFees() -> feeInvoice.findMany({ studentId })
  |-> getStudentHomework() -> homework.findMany({ classId })
  |-> getStudentTimetable() -> timetable.findMany({ classId, sectionId })
  |-> getStudentMessages() -> message.findMany({ receiverId: userId })
```

### 6.4 Parent Portal

**Dashboard:** `app/portal/parent/page.tsx`

**Data flow chain:**

```
proxy.ts (middleware)
  |-> Sets X-User-Id, X-User-Role, X-User-Email headers
  v
app/portal/parent/page.tsx
  |-> Reads headers (lines 13-15)
  |-> Validates role is PARENT (line 18)
  |-> setRequestContext() (line 24-27)
  |-> prisma.profile.findUnique({ id: userId }) (line 30-33)
  |-> prisma.parent.findFirst({ email: userEmail }) (line 37-54)
  |    |-> includes students -> student -> enrollments with class and section
  |-> Counts: fees, messages, announcements (lines 62-74)
  |-> Renders dashboard cards (lines 76-81)
  |-> Lists children with enrollment details (lines 105-130)
  v
Portal pages (via parent-portal.actions.ts):
  |-> getParentChildren() -> parent.findFirst({ email }) with students -> student -> enrollments
  |-> getChildAttendance(studentId) -> studentAttendance.findMany({ studentId })
  |-> getChildFees(studentId) -> feeInvoice.findMany({ studentId })
  |-> getChildResults(studentId) -> examResult.findMany({ studentId })
  |-> getChildHomework(studentId) -> homework.findMany({ classId })
  |-> getParentAnnouncements() -> announcement.findMany({ schoolId, isPublished })
```

---

## 7. Relationship Diagrams

### 7.1 Complete Entity Relationships

```
Supabase Auth User (auth.users)
    |
    | id = Profile.id (1:1)
    v
Profile (profiles)
    |-- role (Role enum)
    |-- schoolId -> School
    |-- branchId -> Branch
    |-- staff (1:1 optional) -> Staff
    |-- teacher (1:1 optional) -> Teacher
    |-- userPermissions -> UserPermission[] -> Permission[]
    |
    +-- For TEACHER role:
    |       |
    |       v
    |   Teacher (teachers)
    |       |-- profileId -> Profile (1:1 optional)
    |       |-- schoolId -> School
    |       |-- branchId -> Branch
    |       |-- assignments -> TeacherAssignment[] -> Class, Section, Subject, AcademicSession
    |       |-- timetableSlots -> Timetable[] -> Class, Section, Subject, DayOfWeek
    |       |-- homework -> Homework[] -> Class, Section, Subject, Student, HomeworkSubmission[]
    |
    +-- For STUDENT role:
    |       |
    |       v
    |   Student (students)
    |       |-- schoolId -> School
    |       |-- branchId -> Branch
    |       |-- enrollments -> StudentEnrollment[] -> Class, Section, AcademicSession
    |       |-- parents -> StudentParent[] -> Parent[]
    |       |-- attendance -> StudentAttendance[] -> Class, Section, AcademicSession
    |       |-- examResults -> ExamResult[] -> Exam -> Subject, ExamType
    |       |-- reportCards -> ReportCard[] -> Exam, AcademicSession
    |       |-- invoices -> FeeInvoice[] -> Payment[]
    |       |-- feePlans -> StudentFeePlan[] -> FeeStructure, AcademicSession
    |       |-- homeworkSubmissions -> HomeworkSubmission[] -> Homework
    |       |-- documents -> StudentDocument[]
    |       |-- transport -> StudentTransport[] -> TransportRoute, Vehicle
    |       |-- bookIssues -> BookIssue[] -> LibraryBook
    |
    +-- For PARENT role:
    |       |
    |       v
    |   Parent (parents)
    |       |-- schoolId -> School
    |       |-- students -> StudentParent[] -> Student[]
    |
    +-- For STAFF role:
    |       |
    |       v
    |   Staff (staff)
    |       |-- profileId -> Profile (1:1 optional)
    |       |-- schoolId -> School
    |       |-- branchId -> Branch
    |       |-- attendance -> StaffAttendance[]
    |
    +-- For all roles:
            |-- authoredAnnouncements -> Announcement[]
            |-- auditLogs -> AuditLog[]
            |-- expenses -> Expense[]
            |-- leaveRequests -> LeaveRequest[]
            |-- sentMessages -> Message[]
            |-- receivedMessages -> Message[]
            |-- notifications -> Notification[]
            |-- payments -> Payment[]
            |-- reviewedAdmissions -> Admission[]
            |-- announcementReads -> AnnouncementRead[]
```

### 7.2 School Admin Flow

```
Supabase Auth User
    |
    v
Profile (role = "SCHOOL_ADMIN")
    |-- schoolId -> School
    |-- branchId -> Branch
    |
    v
Admin Dashboard (/dashboard)
    |-- Manages: Teachers, Students, Staff, Classes, Subjects
    |-- Invites users via Users module
    |-- Views reports, fees, exams
```

### 7.3 Teacher Flow

```
Supabase Auth User
    |
    v
Profile (role = "TEACHER")
    |-- schoolId, branchId
    |
    | (NEEDS LINKING - profileId on Teacher must be set)
    v
Teacher (teachers)
    |-- profileId -> Profile
    |-- assignments -> TeacherAssignment[]
    |-- timetableSlots -> Timetable[]
    |
    v
Teacher Portal (/portal/teacher)
    |-- My Classes (from TeacherAssignment)
    |-- Attendance (mark for enrolled students)
    |-- Homework (create and manage)
    |-- Timetable (view schedule)
    |-- Marks (enter exam results)
```

### 7.4 Student Flow

```
Supabase Auth User
    |
    v
Profile (role = "STUDENT")
    |-- schoolId, branchId
    |
    | (NEEDS LINKING - student found by email matching)
    v
Student (students)
    |-- email matches Profile.email
    |-- enrollments -> StudentEnrollment[]
    |-- parents -> StudentParent[] -> Parent[]
    |
    v
Student Portal (/portal/student)
    |-- Attendance (view own)
    |-- Results (view own)
    |-- Fees (view own)
    |-- Homework (view assigned)
    |-- Timetable (view class schedule)
```

### 7.5 Parent Flow

```
Supabase Auth User
    |
    v
Profile (role = "PARENT")
    |-- schoolId, branchId
    |
    | (NEEDS LINKING - parent found by email matching)
    v
Parent (parents)
    |-- email matches Profile.email
    |-- students -> StudentParent[] -> Student[]
    |       |-- student -> enrollments -> Class, Section
    |
    v
Parent Portal (/portal/parent)
    |-- My Children (list linked students)
    |-- Attendance (per child)
    |-- Fees (per child)
    |-- Results (per child)
    |-- Homework (per child)
    |-- Notices (announcements)
```

---

## 8. Navigation Flow

### 8.1 Complete Navigation Chain

```
Create User (Admin Dashboard)
    |
    | actions/auth.actions.ts:inviteUser()
    | Creates: Supabase auth user + Profile (status: INVITED)
    v
Invitation Link Generated
    |
    | ${APP_URL}/setup-password?token=${rawToken}
    v
Invited User Opens Link
    |
    | app/(auth)/setup-password/setup-password-form.tsx
    | Validates token, shows email/role, password form
    v
Password Setup
    |
    | actions/auth.actions.ts:acceptInvitation()
    | Sets password, status -> ACTIVE
    v
Login
    |
    | actions/auth.actions.ts:signin()
    | Authenticates via Supabase
    v
Redirect Based on Role
    |
    | lib/auth-helpers.ts:getRedirectPath()
    |
    |--> Admin roles -> /dashboard
    |--> TEACHER -> /portal/teacher
    |--> STUDENT -> /portal/student
    |--> PARENT -> /portal/parent
    v
Portal / Dashboard
    |
    | proxy.ts middleware sets X-User-* headers
    | Pages read headers, load data from Prisma
    v
Functional Portal
```

### 8.2 Middleware Protection Chain

```
Request
    |
    v
proxy.ts (Next.js 16 middleware)
    |
    |-- Public route? (/login, /register, etc.)
    |   |-- Yes: updateSession() only, pass through
    |   |-- No: continue
    v
Supabase Auth Check
    |-- No user: redirect to /login
    |-- User found: continue
    v
Profile Lookup
    |-- No profile: redirect to /login
    |-- Profile found: continue
    v
Role-Based Route Protection
    |-- /portal/* + non-portal role: redirect to /dashboard
    |-- /dashboard/* + wrong role for specific route: redirect to /dashboard
    v
Header Injection
    |-- X-User-Id
    |-- X-User-Role
    |-- X-User-SchoolId
    |-- X-User-BranchId
    |-- X-User-Email
    v
Security Headers
    |-- X-Frame-Options: DENY
    |-- X-Content-Type-Options: nosniff
    |-- Referrer-Policy: strict-origin-when-cross-origin
    |-- X-XSS-Protection: 1; mode=block
    v
Response to Page
```

---

## 9. Data Flow

### 9.1 Create Teacher -> Database -> Login -> Teacher Portal

```
Step 1: Admin creates Teacher
    |
    | Page: app/(dashboard)/dashboard/teachers/page.tsx
    | Form: app/(dashboard)/dashboard/teachers/teacher-form.tsx
    | Action: actions/teacher.actions.ts:createTeacher()
    |
    | Database writes:
    |   teachers INSERT (schoolId, branchId, firstName, lastName, employeeCode, ...)
    |   audit_logs INSERT (action: CREATE, entityType: Teacher)
    v
Step 2: Admin invites Teacher user
    |
    | Page: app/(dashboard)/dashboard/users/page.tsx
    | Form: app/(dashboard)/dashboard/users/invite-user-form.tsx
    | Action: actions/auth.actions.ts:inviteUser()
    |
    | Database writes:
    |   auth.users INSERT (Supabase)
    |   profiles INSERT (role: TEACHER, status: INVITED, invitationToken)
    |   audit_logs INSERT (action: CREATE, entityType: INVITATION)
    v
Step 3: Teacher sets password
    |
    | Page: app/(auth)/setup-password/page.tsx
    | Action: actions/auth.actions.ts:acceptInvitation()
    |
    | Database writes:
    |   profiles UPDATE (status: ACTIVE, invitationToken: null)
    |   audit_logs INSERT (action: UPDATE, entityType: USER)
    v
Step 4: Teacher logs in
    |
    | Page: app/(auth)/login/page.tsx
    | Action: actions/auth.actions.ts:signin()
    |
    | Supabase: signInWithPassword()
    | Database writes:
    |   profiles UPDATE (lastLoginAt, failedLoginAttempts: 0)
    |   audit_logs INSERT (action: LOGIN, entityType: USER)
    |
    | Redirect: /portal/teacher
    v
Step 5: Teacher Portal loads
    |
    | proxy.ts sets X-User-* headers
    | app/portal/teacher/page.tsx reads headers
    |
    | prisma.teacher.findFirst({ where: { profileId: userId } })
    |
    | *** CRITICAL: profileId is NULL - Teacher record not linked ***
    | *** Result: teacher = null, all counts = 0 ***
    v
Step 6: Dashboard shows empty data
    |
    | My Classes: 0
    | My Students: 0
    | Homework: 0
    | Messages: 0
    | Leave Requests: 0
```

### 9.2 Missing Link Identified

**The Teacher record and Profile are never linked.** The `createTeacher()` action creates a standalone Teacher record. The `inviteUser()` action creates a standalone Profile. There is no code that:

1. Finds the existing Teacher record by name/employeeCode
2. Updates it with `profileId: userId`

**Result:** Teacher portal shows empty dashboard.

### 9.3 Student Data Flow (Working)

```
Create Student
    |
    | prisma.student.create() -> students table
    | prisma.studentEnrollment.create() -> student_enrollments table
    v
Student Portal
    |
    | prisma.student.findFirst({ email: userEmail })
    | Finds student by matching email
    | (This works because student.email matches profile.email)
    v
Dashboard loads with data
```

### 9.4 Parent Data Flow (Working if email matches)

```
Create Parent (via admission)
    |
    | prisma.parent.create() -> parents table (email from admission form)
    | prisma.studentParent.create() -> student_parents table
    v
Parent Portal
    |
    | prisma.parent.findFirst({ email: userEmail })
    | Finds parent by matching email
    | (This works ONLY if parent.email matches profile.email)
    v
Dashboard loads with children data
```

---

## 10. Validation

### 10.1 Teacher Creation Validation

When a Teacher is created via `createTeacher()`:

- **Profile:** NOT created (only creates `teachers` record)
- **Teacher:** Created in `teachers` table
- **User:** NOT created (no Supabase auth user)
- **Role Mapping:** NOT created
- **profileId:** NOT set (remains null)

**Manual steps required:**

1. Admin must separately invite the teacher via Users module
2. Teacher must accept invitation and set password
3. **Someone must manually link the Teacher record to the Profile** by updating `teacher.profileId` - but there is NO UI for this

### 10.2 Student Creation Validation

When a Student is created via `createStudent()`:

- **Student:** Created in `students` table
- **Enrollment:** Created in `student_enrollments` table (if classId + academicSessionId provided)
- **Profile:** NOT created (no auth user for student portal)
- **User:** NOT created

**For student portal access:**

1. Admin must separately invite the student via Users module (role: STUDENT)
2. Student must accept invitation
3. Student portal finds student by email matching: `prisma.student.findFirst({ email: userEmail })`

**This works IF the student's email in `students` table matches the Profile email.**

### 10.3 Parent Creation Validation

When a Parent is created via `addParent()`:

- **Parent:** Created in `parents` table
- **StudentParent:** Created in `student_parents` table (if studentId provided)
- **Profile:** NOT created (no auth user for parent portal)

**For parent portal access:**

1. Admin must separately invite the parent via Users module (role: PARENT)
2. Parent must accept invitation
3. Parent portal finds parent by email matching: `prisma.parent.findFirst({ email: userEmail })`

**This works IF the parent's email in `parents` table matches the Profile email.**

---

## 11. Missing Links

### 11.1 Broken Relationships

| Issue                    | Severity     | Description                                                                                                                                                              |
| ------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Teacher-Profile Link** | **CRITICAL** | `teacher.profileId` is never set by any action. Teacher record and Profile are created independently with no linking mechanism. Teacher portal cannot find teacher data. |
| **Student-Profile Link** | **HIGH**     | Student portal relies on email matching (`student.email == profile.email`). If emails don't match, portal shows no data. No foreign key exists.                          |
| **Parent-Profile Link**  | **HIGH**     | Parent portal relies on email matching (`parent.email == profile.email`). If emails don't match, portal shows no children. No foreign key exists.                        |

### 11.2 Missing Inserts

| Missing Insert                   | Table                 | Description                                                                          |
| -------------------------------- | --------------------- | ------------------------------------------------------------------------------------ |
| Teacher-Profile link             | `teachers.profileId`  | No action sets this field after both Teacher and Profile are created                 |
| Student Profile creation         | `profiles`            | When student is created directly, no Profile/auth user is created                    |
| Parent Profile creation          | `profiles`            | When parent is created directly, no Profile/auth user is created                     |
| TeacherAssignment from Timetable | `teacher_assignments` | Timetable creates slots but TeacherAssignment table is never populated by any action |

### 11.3 Missing Updates

| Missing Update                 | Description                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Teacher.profileId after invite | After inviting a user with TEACHER role, no code updates existing Teacher record with the new profileId |
| Student.email sync             | If student email is updated, there's no mechanism to sync with Profile email                            |
| Parent.email sync              | If parent email is updated, there's no mechanism to sync with Profile email                             |

### 11.4 Missing Foreign Keys

| Missing FK         | From             | To               | Impact                                           |
| ------------------ | ---------------- | ---------------- | ------------------------------------------------ |
| Student -> Profile | `students.email` | `profiles.email` | Portal relies on email matching, not a proper FK |
| Parent -> Profile  | `parents.email`  | `profiles.email` | Portal relies on email matching, not a proper FK |

### 11.5 Missing Redirects

| Missing Redirect       | Description                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| After teacher creation | `createTeacher()` revalidates `/dashboard/teachers` but doesn't redirect to teacher detail page |
| After student creation | `createStudent()` revalidates `/dashboard/students` but doesn't redirect to student detail page |
| After parent creation  | `addParent()` revalidates student detail page but no redirect confirmation                      |

### 11.6 Missing Profile Creation

| Scenario                | Issue                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| Direct student creation | `createStudent()` creates student record but no Profile. Student cannot log in or access portal. |
| Direct parent creation  | `addParent()` creates parent record but no Profile. Parent cannot log in or access portal.       |
| Direct teacher creation | `createTeacher()` creates teacher record but no Profile. Teacher cannot log in or access portal. |

### 11.7 Missing Teacher Creation

| Scenario                      | Issue                                                                               |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| Invite user with TEACHER role | Creates Profile but no Teacher record. Portal cannot find teacher data.             |
| No auto-linking               | Even if both exist, there's no code to match them by name/email and set `profileId` |

### 11.8 Missing Student Creation

| Scenario                      | Issue                                                                    |
| ----------------------------- | ------------------------------------------------------------------------ |
| Invite user with STUDENT role | Creates Profile but no Student record. Portal cannot find student data.  |
| No auto-linking               | Even if both exist, there's no code to match them by email and link them |

---

## 12. Root Cause Analysis

### 12.1 The Core Architectural Problem

The system has **two independent identity systems** that are not properly integrated:

1. **Supabase Auth + Profile** (authentication layer)
   - Created via `inviteUser()` or `signup()`
   - Stores: auth credentials, role, school assignment

2. **Domain Records** (business layer)
   - `Teacher`, `Student`, `Parent` records
   - Created via separate CRUD actions
   - Stores: domain-specific data (qualifications, enrollment, relationships)

**The bridge between them is incomplete:**

| Entity  | Auth Layer              | Domain Layer   | Bridge                          |
| ------- | ----------------------- | -------------- | ------------------------------- |
| Teacher | Profile (role: TEACHER) | Teacher record | `teacher.profileId` - NEVER SET |
| Student | Profile (role: STUDENT) | Student record | Email matching - NO FK          |
| Parent  | Profile (role: PARENT)  | Parent record  | Email matching - NO FK          |

### 12.2 Why Teacher Portal is Empty

1. `createTeacher()` creates Teacher record without `profileId`
2. `inviteUser()` creates Profile without creating/linking Teacher record
3. `app/portal/teacher/page.tsx:37-39` queries `prisma.teacher.findFirst({ where: { profileId: userId } })`
4. Since `profileId` is null, query returns `null`
5. All counts default to 0
6. Dashboard shows empty cards

### 12.3 Why Student Portal Works (conditionally)

1. `createStudent()` creates Student record with `email` field
2. `inviteUser()` creates Profile with same `email`
3. `app/portal/student/page.tsx:37-39` queries `prisma.student.findFirst({ where: { email: userEmail } })`
4. If emails match, query returns Student record
5. Dashboard shows data

**Fragile:** Works only if emails are identical. No referential integrity.

### 12.4 Why Parent Portal Works (conditionally)

Same pattern as Student portal - relies on email matching between `parents.email` and Profile email.

### 12.5 TeacherAssignment Table is Unused

The `TeacherAssignment` model exists (schema.prisma:516-535) and is referenced by:

- `getTeacherClasses()` in `teacher-portal.actions.ts:31-44`
- `getTeacherExamResults()` in `teacher-portal.actions.ts:133-136`

**But no action creates TeacherAssignment records.** The only way data gets there is via:

1. Manual database insertion
2. The seed script (`scripts/seed.ts`)
3. Timetable creation (but timetable creates `Timetable` records, not `TeacherAssignment`)

---

## Summary of Critical Findings

### Files Involved in Each Workflow

| Workflow       | Key Files                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------ |
| Login          | `app/(auth)/login/login-form.tsx`, `actions/auth.actions.ts:signin()`, `lib/auth-helpers.ts`           |
| Logout         | `components/layout/user-dropdown.tsx`, `actions/auth.actions.ts:signout()`                             |
| Invitation     | `app/(dashboard)/dashboard/users/invite-user-form.tsx`, `actions/auth.actions.ts:inviteUser()`         |
| Password Setup | `app/(auth)/setup-password/setup-password-form.tsx`, `actions/auth.actions.ts:acceptInvitation()`      |
| Middleware     | `proxy.ts`, `lib/supabase/middleware.ts`, `lib/auth.ts`                                                |
| Create Teacher | `app/(dashboard)/dashboard/teachers/teacher-form.tsx`, `actions/teacher.actions.ts:createTeacher()`    |
| Create Student | `app/(dashboard)/dashboard/students/student-form.tsx`, `actions/student.actions.ts:createStudent()`    |
| Create Parent  | `app/(dashboard)/dashboard/students/[id]/student-profile.tsx`, `actions/parent.actions.ts:addParent()` |
| Admission      | `app/(dashboard)/dashboard/admissions/new/admission-form.tsx`, `actions/admission.actions.ts`          |
| Teacher Portal | `app/portal/teacher/page.tsx`, `actions/teacher-portal.actions.ts`                                     |
| Student Portal | `app/portal/student/page.tsx`, `actions/student-portal.actions.ts`                                     |
| Parent Portal  | `app/portal/parent/page.tsx`, `actions/parent-portal.actions.ts`                                       |
| Auth Context   | `lib/auth.ts`, `lib/supabase/server.ts`, `lib/supabase/client.ts`                                      |
| Permissions    | `lib/permissions.ts`, `scripts/seed-permissions.ts`                                                    |
| Schema         | `prisma/schema.prisma` (1311 lines, 37 models, 14 enums)                                               |
