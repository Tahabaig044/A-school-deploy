# DASHBOARD_AUDIT.md - Loop 3 Dashboard Stabilization

**Date:** 2026-07-06
**Status:** Complete

---

## Issues Found & Fixed

### 1. Missing Loading State
- **File:** `app/(dashboard)/loading.tsx`
- **Issue:** Dashboard had no loading.tsx, causing no skeleton during Suspense boundaries
- **Fix:** Created `loading.tsx` using `PageSkeleton` from shared loading-skeleton.tsx

### 2. Portal Mobile Sidebar Broken
- **File:** `components/layout/portal-mobile-sidebar.tsx`
- **Issue:** Embedded `<PortalSidebar role={role} />` which renders `hidden md:flex` inside a Sheet — nav invisible on mobile
- **Fix:** Extracted `PortalNavList` from `portal-sidebar.tsx` as a reusable component. Mobile sidebar now renders `PortalNavList` directly with `onLinkClick` to close the sheet

### 3. Portal Sidebar Nested Route Active State
- **File:** `components/layout/portal-sidebar.tsx`
- **Issue:** Strict `===` matching — `/portal/student/grades` wouldn't highlight "Grades" menu item
- **Fix:** Changed to `pathname === item.href || pathname.startsWith(item.href + "/")`

### 4. Notifications Dropdown Hardcoded "0"
- **File:** `components/layout/notifications-dropdown.tsx`
- **Issue:** Always showed "0" — not connected to any data source
- **Fix:** Wired to `getUnreadNotificationCount()` server action via useEffect; shows count badge and contextual message

### 5. User Dropdown Dead Profile Link
- **File:** `components/layout/user-dropdown.tsx`
- **Issue:** "Profile" item was a dead button (no href); no Settings link; role displayed as raw enum
- **Fix:** Added Settings link (`/dashboard/settings`), formatted role with `formatRole()`, fixed `asChild` → inline Link pattern (MenuItem doesn't support asChild)

### 6. Dashboard Permission Gating
- **File:** `lib/menu-items.ts`
- **Issue:** Dashboard item used `students.view` permission — LIBRARIAN, TRANSPORT_MANAGER, ACCOUNTANT couldn't see it
- **Fix:** Changed to `settings.view` (available to all roles)

### 7. Missing Menu Items
- **File:** `lib/menu-items.ts`
- **Issue:** No sidebar entries for Exams, Library, Transport, Announcements, Reports
- **Fix:** Added menu items with correct icons and permissions:
  - Exams (`exams.view`)
  - Library (`library.view`)
  - Transport (`transport.view`)
  - Announcements (`announcements.view`)
  - Reports (`reports.view`)

### 8. Delete Handler Error Handling (10 components)
- **Files:** exam-list, expense-list, homework-list, book-list, announcement-list, fee-structure-list, schedule-list, exam-type-list, vehicle-list, route-list
- **Issue:** Delete functions had no try/catch — unhandled errors crashed silently
- **Fix:** Wrapped all delete handlers in try/catch with destructive toast on failure

### 9. Branch Selector Cookie Security
- **File:** `components/layout/branch-selector.tsx`
- **Issue:** Cookie set without SameSite attribute
- **Fix:** Added `SameSite=Lax` to cookie string

---

## TypeScript Status
- **Before:** 0 errors (carried from Loop 2)
- **After:** 0 errors
- **Command:** `npx tsc --noEmit`

---

## Files Modified
| File | Change |
|------|--------|
| `app/(dashboard)/loading.tsx` | Created |
| `components/layout/portal-sidebar.tsx` | Extracted PortalNavList, fixed active state |
| `components/layout/portal-mobile-sidebar.tsx` | Rewrote to use PortalNavList |
| `components/layout/notifications-dropdown.tsx` | Wired to server action |
| `components/layout/user-dropdown.tsx` | Added Settings link, formatted role, fixed asChild |
| `components/layout/branch-selector.tsx` | Added SameSite=Lax |
| `lib/menu-items.ts` | Fixed Dashboard permission, added 5 menu items |
| `app/(dashboard)/dashboard/exams/exam-list.tsx` | Delete error handling |
| `app/(dashboard)/dashboard/expenses/expense-list.tsx` | Delete error handling |
| `app/(dashboard)/dashboard/homework/homework-list.tsx` | Delete error handling |
| `app/(dashboard)/dashboard/library/book-list.tsx` | Delete error handling |
| `app/(dashboard)/dashboard/announcements/announcement-list.tsx` | Delete error handling |
| `app/(dashboard)/dashboard/fees/fee-structures/fee-structure-list.tsx` | Delete error handling |
| `app/(dashboard)/dashboard/exams/schedule/schedule-list.tsx` | Delete error handling |
| `app/(dashboard)/dashboard/exams/exam-types/exam-type-list.tsx` | Delete error handling |
| `app/(dashboard)/dashboard/transport/vehicles/vehicle-list.tsx` | Delete error handling |
| `app/(dashboard)/dashboard/transport/routes/route-list.tsx` | Delete error handling |
