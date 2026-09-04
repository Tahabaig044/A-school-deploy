# AUTH_UPGRADE_REPORT.md

## Files Changed

| File                                          | Change                                                                                                                                  |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`                        | Added `Permission`, `RolePermission`, `UserPermission` models + reverse relation on `Profile`                                           |
| `lib/permissions.ts`                          | Complete rewrite — DB-backed `can()` function with cache, 60 permissions, role defaults                                                 |
| `lib/auth-helpers.ts`                         | NEW — `getRedirectPath(role)` centralized redirect mapping                                                                              |
| `lib/menu-items.ts`                           | Updated — each item now has `permission` field; `filterMenuItemsByPermissions()` replaces `getMenuItemsForRole()`                       |
| `lib/constants.ts`                            | No change (role enum unchanged)                                                                                                         |
| `middleware.ts`                               | Created then removed (Next.js 16 uses `proxy.ts`)                                                                                       |
| `proxy.ts`                                    | Simplified — single Supabase client, no double `getUser()`                                                                              |
| `app/(auth)/login/page.tsx`                   | Updated — branding with GraduationCap icon, removed card description                                                                    |
| `app/(auth)/login/login-form.tsx`             | Updated — added School Code field, password visibility toggle, Remember Me checkbox, removed Sign Up link                               |
| `app/(auth)/register/page.tsx`                | Updated — redirects to `/login` (registration disabled)                                                                                 |
| `app/(auth)/register/register-form.tsx`       | No change (dead code, page redirects)                                                                                                   |
| `actions/auth.actions.ts`                     | Updated — `signup` validates roles server-side, auto-logins after register, uses `getRedirectPath()`; `signin` uses `getRedirectPath()` |
| `app/(dashboard)/layout.tsx`                  | Updated — redirects portal roles, fetches permissions, passes to sidebar; fixed duplicate MobileSidebar                                 |
| `app/(dashboard)/page.tsx`                    | No change                                                                                                                               |
| `components/layout/sidebar.tsx`               | Updated — accepts `permissions: string[]` instead of `role: Role`                                                                       |
| `components/layout/mobile-sidebar.tsx`        | Updated — accepts `permissions: string[]` instead of `role: Role`                                                                       |
| `app/portal/layout.tsx`                       | Updated — simplified role check using allowlist                                                                                         |
| `app/portal/student/page.tsx`                 | Updated — role mismatch redirects to correct portal                                                                                     |
| `app/portal/parent/page.tsx`                  | Updated — role mismatch redirects to correct portal                                                                                     |
| `app/portal/teacher/page.tsx`                 | Updated — role mismatch redirects to correct portal                                                                                     |
| `components/layout/portal-sidebar.tsx`        | No change                                                                                                                               |
| `components/layout/portal-mobile-sidebar.tsx` | No change                                                                                                                               |
| `scripts/seed-permissions.ts`                 | NEW — seeds 60 permissions + 232 role-permission mappings                                                                               |

## Permission System Architecture

### Tables

- **permissions** — 60 unique `resource.action` pairs (e.g., `students.create`, `fees.edit`)
- **role_permissions** — maps each `Role` to its allowed permissions (232 records seeded)
- **user_permissions** — per-user permission overrides (granted/revoked)

### How it works

1. `getPermissionsForRole(role)` fetches from DB (cached in-memory)
2. `can(profileId, role, permission)` checks user-specific overrides first, then role permissions
3. Sidebar uses `filterMenuItemsByPermissions(menuItems, permissions)` to show only allowed items
4. Fallback: if DB has no records, hardcoded `ROLE_DEFAULTS` are used

### Permission Matrix (per role)

| Permission         | SUPER_ADMIN | SCHOOL_ADMIN | BRANCH_ADMIN | TEACHER | STUDENT | PARENT | ACCOUNTANT |
| ------------------ | ----------- | ------------ | ------------ | ------- | ------- | ------ | ---------- |
| students.view      | ✓           | ✓            | ✓            | ✓       | ✓       | ✓      | ✓          |
| students.create    | ✓           | ✓            | ✓            |         |         |        |            |
| students.edit      | ✓           | ✓            | ✓            |         |         |        |            |
| students.delete    | ✓           | ✓            |              |         |         |        |            |
| teachers.view      | ✓           | ✓            | ✓            |         |         |        |            |
| teachers.create    | ✓           | ✓            | ✓            |         |         |        |            |
| classes.view       | ✓           | ✓            | ✓            | ✓       | ✓       |        |            |
| attendance.view    | ✓           | ✓            | ✓            | ✓       | ✓       | ✓      |            |
| attendance.mark    | ✓           | ✓            | ✓            | ✓       |         |        |            |
| exams.view         | ✓           | ✓            | ✓            | ✓       | ✓       | ✓      |            |
| exams.marks_entry  | ✓           | ✓            | ✓            | ✓       |         |        |            |
| fees.view          | ✓           | ✓            | ✓            |         | ✓       | ✓      | ✓          |
| fees.collect       | ✓           | ✓            | ✓            |         |         |        | ✓          |
| homework.view      | ✓           | ✓            | ✓            | ✓       | ✓       | ✓      |            |
| homework.create    | ✓           | ✓            | ✓            | ✓       |         |        |            |
| library.view       | ✓           | ✓            | ✓            |         |         |        |            |
| transport.view     | ✓           | ✓            | ✓            |         |         |        |            |
| announcements.view | ✓           | ✓            | ✓            |         | ✓       | ✓      |            |
| messages.view      | ✓           | ✓            | ✓            | ✓       | ✓       | ✓      |            |
| messages.send      | ✓           | ✓            | ✓            | ✓       |         | ✓      |            |
| reports.view       | ✓           | ✓            | ✓            |         |         |        | ✓          |
| settings.view      | ✓           |              |              |         |         |        |            |
| settings.edit      | ✓           | ✓            |              |         |         |        |            |
| branches.view      | ✓           | ✓            |              |         |         |        |            |
| schools.view       | ✓           |              |              |         |         |        |            |
| expenses.view      | ✓           | ✓            | ✓            |         |         |        | ✓          |
| expenses.create    | ✓           | ✓            | ✓            |         |         |        | ✓          |

## Login Flow

1. User visits `/login` — sees School Code (optional), Email, Password, Remember Me
2. No "Sign Up" link — registration disabled (admin-invite only)
3. On submit → `signin` server action → Supabase `signInWithPassword`
4. On success → look up Profile → `getRedirectPath(role)` → redirect
5. `proxy.ts` middleware validates session on every non-public route

### Redirect Map

| Role              | Redirect To       |
| ----------------- | ----------------- |
| SUPER_ADMIN       | `/dashboard`      |
| SCHOOL_ADMIN      | `/dashboard`      |
| BRANCH_ADMIN      | `/dashboard`      |
| PRINCIPAL         | `/dashboard`      |
| TEACHER           | `/portal/teacher` |
| STUDENT           | `/portal/student` |
| PARENT            | `/portal/parent`  |
| ACCOUNTANT        | `/dashboard`      |
| ADMISSION_OFFICER | `/dashboard`      |
| LIBRARIAN         | `/dashboard`      |
| TRANSPORT_MANAGER | `/dashboard`      |

## Security

### Route Protection

- **proxy.ts** (middleware): All non-public routes require authenticated Supabase session
- **Dashboard layout**: Redirects portal roles (STUDENT/PARENT/TEACHER) away from `/dashboard`
- **Portal layout**: Only STUDENT/PARENT/TEACHER allowed; admins redirected to `/dashboard`
- **Portal pages**: Each page validates the specific role (student can't access /portal/teacher)

### School Isolation

- All server actions use `getSchoolId()` / `getBranchId()` from session profile
- `StudentAttendance`, `StaffAttendance` queries go through relations (class → schoolId)
- `Payment` / `FeeInvoice` queries filter through `student.branchId`
- No raw `schoolId!` or `branchId!` patterns remain in action files

### Input Validation

- `signup` validates role is in `[STUDENT, PARENT, TEACHER]` server-side
- `signup` validates all required fields and password length ≥ 6
- `signin` validates email/password format via Supabase

## Missing Features / Future Work

1. **Email verification** — Supabase supports it but not enforced yet
2. **Rate limiting** — No rate limiting on auth endpoints
3. **Invite-only workflow** — Registration disabled but no invite mechanism implemented
4. **School Code validation** — Field exists on login form but not validated server-side
5. **User-specific permission overrides** — `UserPermission` table exists but no UI to manage
6. **Audit logging on auth events** — login/logout not logged to `audit_logs`
7. **Multi-tab signout** — `signOut()` doesn't use `scope: 'local'`
8. **Session timeout** — No client-side session expiry handling
9. **CSRF** — Relies on Next.js built-in protection only
10. **Prisma singleton** — Production cache pattern could be improved

## Build Status

```
✓ Compiled successfully
✓ TypeScript passes
✓ 60 routes generated
✓ Proxy (Middleware) active
```
