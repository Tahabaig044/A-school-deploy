# BUG_REPORT.md - School Management System

**Date:** 2026-07-06
**Priority:** 1 - Core System Stabilization

---

## Fixed Bugs

### BUG-001: TypeScript Build Error (CRITICAL)
- **File:** `actions/attendance.actions.ts:109`
- **Error:** `Type 'string | undefined' is not assignable to type 'string'`
- **Cause:** `teacher?.id ?? undefined` produces `string | undefined`, but Prisma expects `string`
- **Fix:** Changed to `teacher?.id || ""` (matches the pattern on line 98)

### BUG-002: Password Length Inconsistency (HIGH)
- **File:** `app/(auth)/setup-password/setup-password-form.tsx:145,168`
- **Issue:** Form `minLength={6}` but server requires 8 characters
- **Impact:** Users typing 6-7 characters see confusing server error despite form accepting input
- **Fix:** Changed both password fields to `minLength={8}`

### BUG-003: Signup Profile Missing Required Fields (HIGH)
- **File:** `actions/auth.actions.ts:552-555`
- **Issue:** Profile created without `email`, `status`, or `isActive` fields
- **Impact:** `findUnique({ where: { email } })` lookups fail for self-registered users
- **Fix:** Added `email`, `status: "ACTIVE"`, and `isActive: true` to profile creation

### BUG-004: Sidebar Nested Route Not Highlighted (MEDIUM)
- **File:** `components/layout/sidebar.tsx:26`, `components/layout/mobile-sidebar.tsx:37`
- **Issue:** Exact match `pathname === item.href` doesn't highlight parent for child routes
- **Impact:** User on `/dashboard/students/abc123` sees no sidebar highlight
- **Fix:** Changed to `pathname === item.href || pathname.startsWith(item.href + "/")`

### BUG-005: Dashboard Page Crash on DB Error (MEDIUM)
- **File:** `app/(dashboard)/dashboard/page.tsx`
- **Issue:** No try/catch around `getDashboardStats()` or profile query
- **Impact:** Any DB error crashes the entire dashboard with unhandled error
- **Fix:** Added try/catch with zero-value fallback stats

### BUG-006: Portal Pages Crash on DB Error (MEDIUM)
- **File:** `app/portal/student/page.tsx`, `app/portal/parent/page.tsx`, `app/portal/teacher/page.tsx`
- **Issue:** No try/catch around Prisma queries
- **Impact:** Any DB error crashes the portal page
- **Fix:** Added try/catch with safe fallbacks for all queries

### BUG-007: Dashboard Cards Untyped (LOW)
- **File:** `app/(dashboard)/dashboard/dashboard-cards.tsx:11-12`
- **Issue:** `stats` and `profile` typed as `any`
- **Impact:** No type safety, potential runtime errors from wrong property access
- **Fix:** Added `DashboardStats` and `DashboardProfile` type interfaces

### BUG-008: PORTAL_ROLES Duplicated (LOW)
- **Files:** `app/(dashboard)/layout.tsx:12`, `app/portal/layout.tsx:9`
- **Issue:** Same constant defined independently in two files
- **Impact:** Maintenance hazard - changes must be synchronized manually
- **Fix:** Extracted to `lib/constants.ts` as shared `PORTAL_ROLES`

---

## Known Issues (Not Fixed - Outside Scope)

### KNOWN-001: No Root Middleware
- **File:** `proxy.ts` (project root)
- **Issue:** Next.js 16 uses `proxy.ts` instead of `middleware.ts`, but this needs verification
- **Impact:** If `proxy.ts` is not auto-detected, all route protection is broken
- **Status:** Needs Next.js 16 documentation verification

### KNOWN-002: Portal Subpages Missing
- **Issue:** 14 portal subpage routes referenced in sidebar menu don't exist
- **Impact:** Clicking menu items in student/parent/teacher portals returns 404
- **Status:** Needs portal subpage implementation

### KNOWN-003: `can()` and `canAny()` Never Used
- **File:** `lib/permissions.ts`
- **Issue:** Fine-grained permission functions defined but never called
- **Impact:** 48 granular permissions only used for sidebar filtering, not access control
- **Status:** Architecture decision needed

### KNOWN-004: Dead UI Elements
- **Files:** `app/(auth)/login/login-form.tsx`
- **Issues:** `schoolCode` field and `rememberMe` checkbox exist but are never processed
- **Status:** Dead code, needs wiring or removal

### KNOWN-005: Duplicate Auth Checks
- **Files:** `app/(dashboard)/layout.tsx` + `app/(dashboard)/dashboard/page.tsx`
- **Issue:** Both independently check auth and fetch profile
- **Impact:** 2 Supabase auth checks + 2 DB queries per page load
- **Status:** Performance optimization needed
