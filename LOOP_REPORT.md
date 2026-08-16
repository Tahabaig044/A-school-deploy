# LOOP_REPORT.md - Priority 1 Core System Stabilization

**Date:** 2026-08-14
**Loops:** 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 (LOOP_007_PERFORMANCE)
**Status:** Loop 15 Complete

---

## Loop 15 — Performance & Instrumentation (Phase 3 Audit)

### Summary
Applied Phase 3 audit fixes: eliminated the post-hydration auth POST by passing the unread notification count from the RSC layouts to `NotificationsDropdown`, made notification mutations revalidate only the acting user's route, lowered the Prisma pool to `max: 5`, added the timetable conflict-join composite index (pushed to DB), branch-scoped the conflict self-join, and added `[PERF]` instrumentation (non-production).

### Files Modified (9)
| # | File | Change |
|---|------|--------|
| 1 | `components/layout/notifications-dropdown.tsx` | `initialCount` prop; removed mount `getUnreadNotificationCount` POST |
| 2 | `app/(dashboard)/layout.tsx` | Unread count in Promise.all; passes `initialCount`; `[PERF]` total timing |
| 3 | `app/portal/layout.tsx` | Unread count query; passes `initialCount` |
| 4 | `actions/notification.actions.ts` | `revalidateUserRoute(role)` replaces 4-path revalidation |
| 5 | `lib/prisma.ts` | Pool `max: 5`; `[PERF]` client-created log |
| 6 | `.env` | Direct-host `DIRECT_URL` preserved (commented); reverted to pooler for connectivity |
| 7 | `prisma/schema.prisma` | F18 `@@index([teacherId, academicSessionId, dayOfWeek, startTime])` on Timetable |
| 8 | `actions/reports.actions.ts` | Conflict self-join branch-scoped; `[PERF]` dashboardStats timing |
| 9 | `proxy.ts` | `[PERF]` middleware timing |

### Key Fixes
1. **F17 — no hydration auth POST** — badge count rendered server-side in layouts; removes +1 auth round trip + 2 DB queries per load.
2. **F20 — scoped revalidation** — notification mutations refresh only the acting user's route.
3. **F9 — pool `max: 5`** — lower per-instance connection footprint on Supabase.
4. **F18 — conflict query** — covering composite index added + branch-scoped raw self-join (tenant-consistent with other stats).
5. **F25 — instrumentation** — `[PERF]` logs (dev only) for middleware, dashboard layout, dashboardStats, prisma client creation.

### Notes / Deviations
- F8 (`DIRECT_URL` → direct host) not fully applied: direct host unreachable from this machine (IP not allowlisted in Supabase). Direct-host line preserved in `.env`; runtime unchanged on the session pooler.
- F25 first-query timing dropped (Prisma 7 removed `$use`; `$extends` breaks the singleton client type). Client-creation timing used instead.
- F19 (Suspense/unstable_cache) deferred per audit — "measure first" via F25 before caching.

### Verification
- `npx tsc --noEmit` -> 0 errors ✓
- `npx prisma generate` -> success ✓
- `npx prisma db push` -> database in sync ✓
- `npm run build` -> passes ✓

---

## Loop 14 — Middleware & API Auth Hardening (Phase 2 Audit)

### Summary
Applied Phase 2 audit fixes (F3, F4, F5, F7, F14): removed the Prisma query from `proxy.ts` middleware (role now comes from session `user_metadata.role`), stopped leaking `X-User-*` identity headers to the browser, made public routes skip `getUser()`, deleted the last `X-User-*` header read in `app/portal/page.tsx`, and added explicit `requireRole` (plus per-IP rate limiting on QR) to the two API routes that previously relied on middleware alone.

### Files Modified (5)
| # | File | Change |
|---|------|--------|
| 1 | `proxy.ts` | Removed Prisma query + dynamic supabase client; public routes skip auth; role from session metadata; deleted X-User-* response headers; reuses `updateSession` |
| 2 | `lib/supabase/middleware.ts` | `updateSession` returns `{ user, supabaseResponse }` |
| 3 | `app/portal/page.tsx` | Uses `getCurrentProfile()` instead of `X-User-Role` header |
| 4 | `app/api/qr/route.ts` | Added `requireRole` (admin/staff) + per-IP rate limiter (120 req/min) |
| 5 | `app/api/upload/homework/route.ts` | Added `requireRole` (incl. STUDENT) with 401/403 handling |

### Key Fixes
1. **F3 — middleware no longer touches the DB** — Removed `prisma.profile.findUnique` from `proxy.ts`; role redirects now use `user.user_metadata.role` (set at signup/invite). Removes ~120ms DB round trip per protected request. Real authorization stays in DB-backed `requireRole()` in pages/actions.
2. **F5 — no identity headers leak to the browser** — Deleted `X-User-Id/Role/SchoolId/BranchId/Email` response headers from `proxy.ts`.
3. **F4 — public routes skip auth** — Login/register/forgot/reset/setup-password and `/` return `NextResponse.next()` without creating a Supabase client or calling `getUser()`.
4. **F7 — last header read removed** — `app/portal/page.tsx` now calls `getCurrentProfile()`; grep confirms zero `X-User-*` reads remain.
5. **F14 — API routes enforce their own auth** — `requireRole` added inside `/api/qr` (admin/staff) and `/api/upload/homework` (SUPER_ADMIN, SCHOOL_ADMIN, BRANCH_ADMIN, TEACHER, STUDENT, matching `submitHomework`); QR additionally rate-limited per IP (120/min fixed window, in-memory).

### Notes / Deviations
- F3 used `user_metadata.role` (not `app_metadata.role` as the audit suggested) because the app stores role in `user_metadata` at creation. Users without metadata role skip role-redirects and remain gated by DB-backed `requireRole()`.
- F14 for `/api/upload/homework` includes STUDENT because the only caller is the student portal homework page; `requireRole("TEACHER")` alone would break student submission.

### Verification
- `npx tsc --noEmit` -> 0 errors ✓
- `npm run build` -> passes ✓ (compiled, all routes built)

---

## Loop 13 — System Hardening & Build Repair (Phase 1 Audit)

### Summary
Eliminated the module-global request-context pattern by migrating auth/profile getters to React `cache()`, removed it from all portal pages and layouts. Scoped reports aggregates to tenant, validated the `selected_branch` cookie, deduped auth/profile calls, and repaired 36 pre-existing build-blocking TypeScript errors across the ID card / PDF / QR modules. `npm run build` passes again.

### Files Modified (28)
| # | File | Change |
|---|------|--------|
| 1 | `lib/auth.ts` | getCurrentUser/getCurrentProfile wrapped in React `cache()`; deleted setRequestContext/getRequestContext/clearRequestContext; kept requireAuth/requireRole; profile select includes isActive+status |
| 2 | `lib/dashboard-validation.ts` | All 4 validators use cached getters |
| 3 | `app/(dashboard)/layout.tsx` | Cached getters; Role import + role cast; removed context |
| 4 | `app/portal/layout.tsx` | Cached getters; removed context + try/finally |
| 5-16 | `app/portal/teacher/*`, `app/portal/student/*`, `app/portal/parent/*` (12 pages) | Removed headers, context, try/finally, duplicate profile queries |
| 17 | `actions/reports.actions.ts` | F12: payment/feeInvoice aggregates + leaveRequest.count scoped by schoolId (+branchId) |
| 18 | `actions/parent-portal.actions.ts` | F16: removed unused import; getParentAuthContext uses getCurrentProfile |
| 19 | `app/(dashboard)/dashboard/page.tsx` | F13: selected_branch cookie validated (branch.id + schoolId + isActive) |
| 20 | `actions/id-card-generator.actions.ts` | Removed department/designation (not in schema) |
| 21 | `lib/pdf-utils.ts` | Removed jspdf-autotable import; deduped export; PdfOptions optional; avatarUrl->photoUrl; setFillColor args; rotate->angle; margin fix |
| 22 | `app/api/qr/route.ts` | Buffer -> BodyInit (new Uint8Array) |
| 23 | `app/(dashboard)/dashboard/students/id-card/[id]/page.tsx` | Removed invalid `profile` include (Student has no profile relation) |
| 24 | `app/(dashboard)/dashboard/students/id-card/[id]/id-card-view.tsx` | Buffer -> BlobPart |
| 25 | `app/(dashboard)/dashboard/students/id-cards/id-card-generator.tsx` | BlobPart + Select null-handling |
| 26 | `app/(dashboard)/dashboard/attendance/qr-cards/qr-card-generator.tsx` | Select null-handling |
| 27 | `app/(dashboard)/dashboard/attendance/scan/qr-scanner.tsx` | Select null-handling |
| 28 | `loops/LOOP_005_SYSTEM_HARDENING.md` | New loop report |

### Key Fixes
1. **Request context removal** — Module-global `setRequestContext`/`getRequestContext`/`clearRequestContext` fully deleted; auth/profile now use React `cache()` which is safe per-request.
2. **Tenant scoping (F12)** — Reports aggregates (`payment.aggregate`, `feeInvoice.aggregate`, `leaveRequest.count`) now filter via student/profile schoolId and branchId when set.
3. **Branch cookie validation (F13)** — `selected_branch` is verified against `branch.findFirst({ id, schoolId, isActive })` before use; falls back to `profile.branchId`.
4. **Auth dedup (F16)** — Dashboard validators and portal layouts call the cached getters once.
5. **Build repair** — 36 pre-existing TypeScript errors fixed (schema/code mismatches, missing module import, Buffer/Blob types, duplicate exports). No modules added/removed; schema untouched.

### Verification
- `npx tsc --noEmit` -> 0 errors ✓
- `npm run build` -> passes ✓ (TypeScript gate + 116 static pages + all routes)

---

## Loop 12 — Announcements Enhancement

## Loop 12 — Announcements Enhancement

### Summary
Enhanced the announcement system with scheduled publishing, file attachments, read/unread tracking, expanded audience targeting, and improved UI with detail view. Added 2 new Prisma models and 7 new server actions.

### Schema Changes (3 models)
| Model | Change |
|-------|--------|
| `Announcement` | Added `scheduledAt`, `sectionId`, `class` relation, `section` relation, `attachments` relation, `reads` relation |
| `AnnouncementAttachment` | New model: fileName, fileUrl, fileSize, fileType, announcementId FK |
| `AnnouncementRead` | New model: announcementId, profileId, readAt, unique(announcementId, profileId) |

### Server Actions (12 total, 7 new)
| Action | Purpose | New/Updated |
|--------|---------|-------------|
| `createAnnouncement` | Create with scheduled publish support | Updated |
| `updateAnnouncement` | Update with schedule/section support | Updated |
| `deleteAnnouncement` | Delete with school isolation | Existing |
| `getAnnouncements` | List with attachments/class/section | Updated |
| `getAnnouncementById` | Detail with attachments/reads | Updated |
| `getAnnouncementsForUser` | Role-based audience filtering with read status | New |
| `markAnnouncementAsRead` | Mark announcement as read | New |
| `getAnnouncementReadStats` | Get read/unread counts | New |
| `addAnnouncementAttachment` | Add file attachment | New |
| `deleteAnnouncementAttachment` | Remove attachment | New |
| `publishScheduledAnnouncements` | Publish past-due scheduled announcements | New |

### Audience Values
`ALL`, `SCHOOL`, `BRANCH`, `CLASS`, `SECTION`, `TEACHERS`, `STUDENTS`, `PARENTS`

### Key Features
1. **Scheduled publishing** — Set `scheduledAt` for future publish; announcement stays draft until the scheduled time
2. **File attachments** — Add/remove file attachments to announcements (metadata only, actual upload to storage pending)
3. **Read tracking** — Users can mark announcements as read; admins can view read/unread stats
4. **Expanded audience** — CLASS and SECTION targeting in addition to ALL/SCHOOL/BRANCH/role-based
5. **Detail view** — Click title to see full content, attachments, audience, schedule status, read status
6. **Improved form** — New fields for section, scheduled publish, improved layout

### Verification
- `npx tsc --noEmit` → 0 errors ✓
- `npm run build` → passes ✓

---

## Loop 11 — Student Portal

### Summary
Built a complete student portal with 9 pages: dashboard, attendance, fees, results, homework, timetable, leave requests, messages, and profile. Created student-specific server actions with email-based student lookup. All pages display the student's own data.

### Files Created (8)
| # | File | Purpose |
|---|------|---------|
| 1 | `actions/student-portal.actions.ts` | Student server actions: attendance, fees, results, homework, timetable, leave requests, profile, messages |
| 2 | `app/portal/student/attendance/page.tsx` | Monthly attendance with stats and records |
| 3 | `app/portal/student/fees/page.tsx` | Fee invoices with summary and expandable details |
| 4 | `app/portal/student/results/page.tsx` | Exam results grouped by exam type |
| 5 | `app/portal/student/homework/page.tsx` | Homework with submission status and grading |
| 6 | `app/portal/student/timetable/page.tsx` | Weekly timetable grouped by day |
| 7 | `app/portal/student/leave-requests/page.tsx` | Leave request form and history |
| 8 | `app/portal/student/messages/page.tsx` | Message inbox with unread highlighting |
| 9 | `app/portal/student/profile/page.tsx` | Student profile with personal/enrollment/contact info |

### Files Modified (1)
| # | File | Change |
|---|------|--------|
| 1 | `lib/portal-menu-items.ts` | Updated student menu: 9 items (Dashboard, My Attendance, My Results, My Fees, Homework, Timetable, Leave Requests, Messages, Profile) |

### Key Features
1. **Student lookup** — Uses `prisma.student.findFirst({ where: { email: user.email } })` pattern (email-based, no profileId)
2. **Month navigation** — Attendance page supports prev/next month with Link-based navigation
3. **Expandable invoices** — Fees page uses `<details>` elements for items and payment history
4. **Homework status** — SUBMITTED (blue), GRADED (green), OVERDUE (red), PENDING (gray)
5. **Timetable grouping** — Grouped by day with time/subject/teacher/room per slot
6. **Message highlighting** — Unread messages highlighted with accent border and background

### Student Menu Routes
| Route | Page | Icon |
|-------|------|------|
| `/portal/student` | Dashboard | LayoutDashboard |
| `/portal/student/attendance` | My Attendance | ClipboardCheck |
| `/portal/student/results` | My Results | Award |
| `/portal/student/fees` | My Fees | DollarSign |
| `/portal/student/homework` | Homework | CalendarClock |
| `/portal/student/timetable` | Timetable | Table |
| `/portal/student/leave-requests` | Leave Requests | UserCheck |
| `/portal/student/messages` | Messages | MessageSquare |
| `/portal/student/profile` | Profile | User |

### Verification
- `npx tsc --noEmit` → 0 errors ✓
- `npm run build` → passes ✓ (8 student portal routes built)

---

## Loop 10 — Teacher Portal

### Summary
Built a complete teacher portal with 8 pages: dashboard, assigned classes, attendance marking, exam results, homework management, timetable, leave requests, and profile. Created teacher-specific server actions with profileId-based teacher lookup. Attendance page supports bulk marking with status dropdowns per student.

### Files Created (8)
| # | File | Purpose |
|---|------|---------|
| 1 | `actions/teacher-portal.actions.ts` | Teacher server actions: classes, students, timetable, homework, exam results, leave requests, profile |
| 2 | `app/portal/teacher/classes/page.tsx` | Assigned classes grouped by class name |
| 3 | `app/portal/teacher/attendance/page.tsx` | Class selector + student list for attendance |
| 4 | `app/portal/teacher/attendance/attendance-form.tsx` | Client component for bulk attendance marking |
| 5 | `app/portal/teacher/marks/page.tsx` | Exam results grouped by exam with pass/fail |
| 6 | `app/portal/teacher/homework/page.tsx` | Homework list with submission counts |
| 7 | `app/portal/teacher/timetable/page.tsx` | Weekly timetable grouped by day |
| 8 | `app/portal/teacher/leave-requests/page.tsx` | Leave request form and history |
| 9 | `app/portal/teacher/profile/page.tsx` | Profile info and edit form |

### Files Modified (2)
| # | File | Change |
|---|------|--------|
| 1 | `lib/portal-menu-items.ts` | Updated teacher menu: 8 items (Dashboard, My Classes, Attendance, Marks, Homework, Timetable, Leave Requests, Profile) |
| 2 | `actions/teacher-portal.actions.ts` | Added academicSession include to getTeacherClasses |

### Key Features
1. **Teacher lookup** — Uses `prisma.teacher.findFirst({ where: { profileId: user.id } })` pattern
2. **Bulk attendance** — AttendanceForm component with per-student status dropdowns, submits via `bulkMarkAttendance` server action
3. **Class grouping** — Classes page groups assignments by class name to show multiple subjects
4. **Overdue detection** — Homework page highlights overdue assignments with red border
5. **Exam result grouping** — Results grouped by exam with student marks/grades table
6. **Weekly timetable** — Grouped by day of week with time slots

### Teacher Menu Routes
| Route | Page | Icon |
|-------|------|------|
| `/portal/teacher` | Dashboard | LayoutDashboard |
| `/portal/teacher/classes` | My Classes | GraduationCap |
| `/portal/teacher/attendance` | Attendance | ClipboardCheck |
| `/portal/teacher/marks` | Marks | Award |
| `/portal/teacher/homework` | Homework | CalendarClock |
| `/portal/teacher/timetable` | Timetable | Table |
| `/portal/teacher/leave-requests` | Leave Requests | UserCheck |
| `/portal/teacher/profile` | Profile | User |

### Verification
- `npx tsc --noEmit` → 0 errors ✓
- `npm run build` → passes ✓ (7 teacher portal routes built)

---

## Loop 9 — Parent Portal

### Summary
Built a complete parent portal with 8 pages: children overview, attendance, fees, results, homework, notices, leave requests, and profile. Created parent-specific server actions that verify email-based parent linkage and student-parent relationships. All pages include child selectors for multi-child parents, summary stats, and full data views.

### Files Created (9)
| # | File | Purpose |
|---|------|---------|
| 1 | `actions/parent-portal.actions.ts` | Parent server actions: children, attendance, fees, results, homework, announcements, leave requests, profile |
| 2 | `app/portal/parent/children/page.tsx` | Children overview with card grid |
| 3 | `app/portal/parent/attendance/page.tsx` | Attendance view with month navigation |
| 4 | `app/portal/parent/fees/page.tsx` | Fee status with invoice details |
| 5 | `app/portal/parent/results/page.tsx` | Exam results grouped by type |
| 6 | `app/portal/parent/homework/page.tsx` | Homework list with submission status |
| 7 | `app/portal/parent/notices/page.tsx` | Published announcements |
| 8 | `app/portal/parent/leave-requests/page.tsx` | Leave request form and history |
| 9 | `app/portal/parent/profile/page.tsx` | Profile info and edit form |

### Files Modified (3)
| # | File | Change |
|---|------|--------|
| 1 | `lib/portal-menu-items.ts` | Added 8 parent menu items: Attendance, Fee Status, Results, Homework, Notices, Leave Requests, Profile |
| 2 | `app/portal/parent/attendance/child-selector.tsx` | Client component for child selection |
| 3 | `app/portal/parent/page.tsx` | Enhanced dashboard (existing) |

### Key Features
1. **Child selector pattern** — All pages with `?student={id}` query param; shows child list when no param
2. **Email-based parent linkage** — Parent record found by matching `parent.email == user.email`
3. **Student-parent verification** — All actions verify the requested student belongs to the parent
4. **Month navigation** — Attendance page supports prev/next month with Link-based navigation
5. **Collapsible invoice details** — Fee page shows items and payment history in `<details>` elements
6. **Exam result grouping** — Results grouped by exam type with pass/fail indicators
7. **Homework overdue detection** — Highlights overdue homework with visual indicators
8. **Leave request form** — Client component with `useFormState` for create/view workflow

### Parent Menu Routes
| Route | Page | Icon |
|-------|------|------|
| `/portal/parent` | Dashboard | LayoutDashboard |
| `/portal/parent/children` | My Children | Users |
| `/portal/parent/attendance` | Attendance | ClipboardCheck |
| `/portal/parent/fees` | Fee Status | DollarSign |
| `/portal/parent/results` | Results | GraduationCap |
| `/portal/parent/homework` | Homework | CalendarClock |
| `/portal/parent/notices` | Notices | Bell |
| `/portal/parent/leave-requests` | Leave Requests | UserCheck |
| `/portal/parent/profile` | Profile | User |

### Verification
- `npx tsc --noEmit` → 0 errors ✓
- `npm run build` → passes ✓ (9 parent portal routes built)

---

## Loop 8 — Student Admission System

### Summary
Implemented a complete student admission system with admission number generation, guardian management, document tracking, approval/rejection workflow, and admission reports. Admission numbers follow `ADM-YYYY-NNNNN` format (year-based counter). When an admission is approved, the system automatically creates the Student record, enrollment, and links guardians as Parents.

### Files Created (9)
| # | File | Purpose |
|---|------|---------|
| 1 | `actions/admission.actions.ts` | Server actions: CRUD, review/approve workflow, guardian/document management, reports |
| 2 | `app/(dashboard)/dashboard/admissions/page.tsx` | Admission list server component |
| 3 | `app/(dashboard)/dashboard/admissions/admission-list.tsx` | Client component with search, filter, pagination |
| 4 | `app/(dashboard)/dashboard/admissions/new/page.tsx` | New admission page |
| 5 | `app/(dashboard)/dashboard/admissions/new/admission-form.tsx` | Multi-section admission form |
| 6 | `app/(dashboard)/dashboard/admissions/[id]/page.tsx` | Admission detail server component |
| 7 | `app/(dashboard)/dashboard/admissions/[id]/admission-detail.tsx` | Detail view with tabs, review actions |
| 8 | `components/ui/textarea.tsx` | Textarea UI component |
| 9 | `components/ui/alert-dialog.tsx` | AlertDialog UI component |

### Files Modified (4)
| # | File | Change |
|---|------|--------|
| 1 | `prisma/schema.prisma` | Added AdmissionStatus enum, Admission/AdmissionDocument/AdmissionGuardian models, Profile.reviewedAdmissions relation |
| 2 | `app/(dashboard)/dashboard/reports/admissions/page.tsx` | Admission reports: stats, status breakdown, by class, monthly trend |
| 3 | `lib/menu-items.ts` | Added Admissions menu item with UserPlus2 icon |
| 4 | `package.json` | (no change needed) |

### Key Features
1. **Admission workflow**: PENDING → UNDER_REVIEW → APPROVED/REJECTED/WAITLISTED → (on approval) Student created automatically
2. **Admission number generation**: `ADM-YYYY-NNNNN` format with year-based counter stored in AdmissionCounter table
3. **Guardian management**: Add/delete guardians linked to admission, auto-create Parent records on approval
4. **Document tracking**: Metadata for uploaded documents (name, type, URLs, verification status)
5. **Approval & enrollment**: approveAndEnroll creates Student, StudentEnrollment, and StudentParent records in one flow
6. **Reports**: Status breakdown, by class distribution, monthly trend data

### Verification
- `npx tsc --noEmit` → 0 errors ✓
- `npm run build` → passes ✓ (admission routes: /dashboard/admissions, /dashboard/admissions/[id], /dashboard/admissions/new, /dashboard/reports/admissions)

---

## Loop 7 — Input Validation & Error Handling

### Summary
Added Zod validation schemas to 9 action files (student, teacher, class, fees, staff, subject, branch, session, expenses), wrapped all Prisma operations in try/catch blocks for user-friendly error messages, strengthened password complexity requirements, and hardened cookie security.

### Files Modified (11)
| # | File | Change |
|---|------|--------|
| 1 | `actions/student.actions.ts` | Added studentSchema + enrollmentSchema + try/catch |
| 2 | `actions/teacher.actions.ts` | Added teacherSchema + try/catch |
| 3 | `actions/class.actions.ts` | Added classSchema + sectionSchema + try/catch |
| 4 | `actions/fees.actions.ts` | Added feeStructureSchema + assignFeePlanSchema + recordPaymentSchema + try/catch |
| 5 | `actions/staff.actions.ts` | Added staffSchema + try/catch |
| 6 | `actions/subject.actions.ts` | Added subjectSchema + classSubjectSchema + try/catch |
| 7 | `actions/branch.actions.ts` | Added branchSchema + try/catch |
| 8 | `actions/session.actions.ts` | Added sessionSchema + try/catch |
| 9 | `actions/expenses.actions.ts` | Added expenseSchema + try/catch |
| 10 | `actions/auth.actions.ts` | Added validatePassword() with complexity requirements |
| 11 | `lib/supabase/server.ts` | Hardened cookie security (httpOnly, secure, sameSite) |

### Improvements
1. **Input validation** — All create/update actions now validate inputs before database operations: required fields, string lengths, email format, UUID format, enum values, numeric ranges
2. **Error handling** — All Prisma operations wrapped in try/catch — returns user-friendly messages instead of raw DB errors
3. **Password complexity** — Now requires: 8+ chars, uppercase, lowercase, number (was: 8 chars only)
4. **Cookie security** — Auth cookies now: httpOnly, secure (production), sameSite: lax

### TypeScript: 0 errors (`npx tsc --noEmit`)
### Build: PASS (`npm run build`)

---

## Loop 6 — Security & Production Readiness

### Summary
Fixed critical security vulnerabilities across the codebase: added school isolation checks to 12 action files (30+ update/delete functions), implemented role-based route protection in middleware, added security headers, and sanitized error messages.

### Files Modified (14)
| # | File | Change |
|---|------|--------|
| 1 | `proxy.ts` | Added role-based route protection + security headers |
| 2 | `actions/student.actions.ts` | School isolation on update/delete |
| 3 | `actions/teacher.actions.ts` | School isolation on update/delete |
| 4 | `actions/class.actions.ts` | School isolation on update/delete |
| 5 | `actions/fees.actions.ts` | School isolation on update/delete |
| 6 | `actions/exam.actions.ts` | School isolation on update/delete |
| 7 | `actions/staff.actions.ts` | School isolation on update/delete |
| 8 | `actions/expenses.actions.ts` | School isolation on update/delete |
| 9 | `actions/subject.actions.ts` | School isolation on update/delete |
| 10 | `actions/branch.actions.ts` | School isolation on update/delete |
| 11 | `actions/session.actions.ts` | School isolation on setCurrent/delete |
| 12 | `actions/timetable.actions.ts` | School isolation on delete |
| 13 | `actions/leave.actions.ts` | School isolation on approve/reject |
| 14 | `actions/auth.actions.ts` | Sanitized Supabase error messages |

### Security Fixes
1. **School isolation** — Every update/delete action now verifies the entity belongs to the user's school before allowing modification. Prevents cross-tenant data access where School A user could modify School B data by passing arbitrary IDs.
2. **Role-based route protection** — Middleware now checks user role against allowed roles for each route prefix. STUDENT can no longer access admin routes; admin users can no longer access portal routes.
3. **Security headers** — Added X-Frame-Options (DENY), X-Content-Type-Options (nosniff), Referrer-Policy, X-XSS-Protection headers to all responses.
4. **Error message sanitization** — Supabase internal error messages no longer leak to users; generic messages shown instead.

### TypeScript: 0 errors (`npx tsc --noEmit`)
### Build: PASS (`npm run build`)

---

## Loop 5 — Performance Optimization

### Summary
Fixed 9 performance issues: eliminated double auth calls in requireRole, batched N+1 loops for bulk attendance and exam results, added pagination to 4 unbounded list pages, parallelized sequential queries in 3 pages, and configured Prisma connection pool.

### Files Modified (15)
| # | File | Change |
|---|------|--------|
| 1 | `lib/auth.ts` | Eliminated double getUser() in requireRole |
| 2 | `lib/prisma.ts` | Added pool configuration |
| 3 | `actions/attendance.actions.ts` | Batched bulk attendance with transaction |
| 4 | `actions/exam.actions.ts` | Batched bulk exam results with transaction |
| 5 | `app/(dashboard)/dashboard/teachers/page.tsx` | Added pagination |
| 6 | `app/(dashboard)/dashboard/teachers/teacher-list.tsx` | Added pagination UI |
| 7 | `app/(dashboard)/dashboard/messages/page.tsx` | Added pagination |
| 8 | `app/(dashboard)/dashboard/messages/message-list.tsx` | Added pagination UI |
| 9 | `app/(dashboard)/dashboard/classes/page.tsx` | Added pagination |
| 10 | `app/(dashboard)/dashboard/classes/class-list.tsx` | Added pagination UI |
| 11 | `app/(dashboard)/dashboard/staff/page.tsx` | Added pagination |
| 12 | `app/(dashboard)/dashboard/staff/staff-list.tsx` | Added pagination UI |
| 13 | `app/(dashboard)/dashboard/attendance/page.tsx` | Parallelized queries |
| 14 | `app/(dashboard)/dashboard/students/new/page.tsx` | Parallelized queries |
| 15 | `app/(dashboard)/dashboard/fees/invoices/page.tsx` | Parallelized queries |

### Performance Improvements
1. **Auth efficiency** — requireRole now makes 1 Supabase auth call instead of 2 (50% reduction)
2. **Bulk attendance** — 50 students: 100+ queries → 3 queries (97% reduction)
3. **Bulk exam results** — 30 students: 30 queries → 3 queries (90% reduction)
4. **List page loads** — Teachers/messages/classes/staff: unbounded → 20 records max
5. **Query parallelization** — Attendance, students/new, fees/invoices pages now run independent queries in parallel

### TypeScript: 0 errors (`npx tsc --noEmit`)

---

## Loop 4 — Complete CRUD Standardization

### Summary
Completed missing CRUD operations across 7 modules: added Edit/Delete to student and user lists, added update functions for sessions/sections/timetables, added invoice cancellation, and added school scoping to attendance actions.

---

## Loop 3 — Dashboard Stabilization

### Summary
Fixed 9 dashboard stability issues: missing loading state, broken mobile portal sidebar, hardcoded notifications, dead profile link, wrong dashboard permission, missing menu items, incomplete error handling on 10 delete handlers, and insecure branch cookie.

---

## Loop 2 — Permissions Audit

### Summary
Fixed 8 critical security issues in school/branch isolation, notification/message/announcement/homework action authorization, and page-level data scoping.

---

## Loop 1 — Core System Stabilization

### Summary
Fixed critical build errors, authentication issues, permission inconsistencies, missing CRUD operations, and added error handling across dashboard and portal pages.

---

## Build Status
- **TypeScript:** Passes (0 errors) — all 5 loops
- **Compilation:** Succeeds
