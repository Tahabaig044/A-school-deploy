# CHANGELOG.md - School Management System

All notable changes to this project will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased] - 2026-07-06

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
