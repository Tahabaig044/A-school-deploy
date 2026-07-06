# SECURITY_AUDIT.md - School Management System

**Date:** 2026-07-06
**Auditor:** OpenCode AI
**Status:** Loop 6 Fixes Applied

---

## Critical Vulnerabilities Fixed

### 1. Cross-Tenant Data Access (School Isolation) — FIXED
**Severity:** CRITICAL
**Before:** 30+ update/delete functions across 12 action files accepted entity IDs from the client without verifying they belonged to the user's school. A teacher in School A could pass the ID of a student/teacher/class from School B and successfully update or delete it.

**After:** Every update/delete action now:
1. Fetches the entity from the database
2. Verifies `entity.schoolId === profile.schoolId` (SUPER_ADMIN exempt)
3. Returns early/throws if mismatch

**Files Fixed:** student.actions.ts, teacher.actions.ts, class.actions.ts, fees.actions.ts, exam.actions.ts, staff.actions.ts, expenses.actions.ts, subject.actions.ts, branch.actions.ts, session.actions.ts, timetable.actions.ts, leave.actions.ts

### 2. Missing Role-Based Route Protection — FIXED
**Severity:** CRITICAL
**Before:** Middleware only checked if user was authenticated. A STUDENT could access `/dashboard/schools`, `/dashboard/fees/fee-structures`, etc. An admin could access `/portal/student`.

**After:** Middleware now:
- Maps route prefixes to allowed roles (e.g., `/dashboard/schools` → SUPER_ADMIN only)
- Checks user's profile role against allowed roles
- Redirects unauthorized users to `/dashboard`
- Blocks admin users from portal routes

### 3. Supabase Error Message Leakage — FIXED
**Severity:** HIGH
**Before:** `fallbackError.message`, `updateError.message`, `error.message` from Supabase were returned directly to users, potentially exposing internal details.

**After:** All Supabase errors return generic messages like "Failed to create user. Please try again."

### 4. Missing Security Headers — FIXED
**Severity:** MEDIUM
**Before:** No security headers set on responses.

**After:** All responses now include:
- `X-Frame-Options: DENY` (prevents clickjacking)
- `X-Content-Type-Options: nosniff` (prevents MIME sniffing)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-XSS-Protection: 1; mode=block`

---

## Remaining Recommendations (Not Yet Implemented)

### 1. Rate Limiting — NOT IMPLEMENTED
**Severity:** HIGH
**Description:** No rate limiting on login, password reset, or any server actions. The account lockout mechanism (5 failures → 30 min lockout) provides some protection but only per-account, not per-IP.
**Recommendation:** Add rate limiting middleware (e.g., using `next-rate-limit` or Upstash Redis) on login, forgot-password, and server action routes.

### 2. Input Validation on Server Actions — NOT IMPLEMENTED
**Severity:** HIGH
**Description:** ~12 action files (student, teacher, class, staff, subject, school, branch, session, parent) have no input validation. They cast FormData values directly with `as string` and `as any`.
**Recommendation:** Add Zod schemas to all server actions for type-safe input validation.

### 3. Prisma Error Handling — NOT IMPLEMENTED
**Severity:** MEDIUM
**Description:** Most server actions have no try/catch blocks. Raw Prisma errors (foreign key violations, unique constraints) may propagate to users.
**Recommendation:** Wrap Prisma operations in try/catch blocks with user-friendly error messages.

### 4. Cookie Security Hardening — NOT IMPLEMENTED
**Severity:** MEDIUM
**Description:** No explicit cookie security options (httpOnly, secure, sameSite) set on auth cookies. Relies on Supabase defaults.
**Recommendation:** Explicitly set `httpOnly: true`, `secure: true`, `sameSite: 'lax'` on Supabase auth cookies.

### 5. Password Complexity Requirements — NOT IMPLEMENTED
**Severity:** LOW
**Description:** Password policy only requires 8 characters. No complexity requirements (uppercase, lowercase, numbers, symbols).
**Recommendation:** Add password complexity validation on signup and password reset.

---

## Security Posture Summary

| Category | Before Loop 6 | After Loop 6 |
|----------|---------------|--------------|
| School Isolation | 5/24 action files | 24/24 action files |
| Role-Based Routes | None | 20+ route prefixes |
| Security Headers | None | 4 headers |
| Error Sanitization | Raw Supabase errors | Generic messages |
| Rate Limiting | None | None (recommended) |
| Input Validation | 12/24 action files | 12/24 action files (recommended) |
| Prisma Error Handling | 0/24 action files | 0/24 action files (recommended) |

---

## Positive Security Findings

1. **All server actions require authentication** — Every action calls `requireRole()` or `requireAuth()` first
2. **School context isolation for creates** — `getSchoolId()`/`getBranchId()` correctly enforce that non-SUPER_ADMIN roles always use their profile's school/branch
3. **Account lockout** — Failed login attempts tracked with 5-attempt limit and 30-minute lockout
4. **Secure token generation** — Invitation tokens use `crypto.randomBytes(32)` and are hashed with SHA-256 before storage
5. **No SQL injection** — All production code uses Prisma query builder (parameterized queries)
6. **No XSS** — No `dangerouslySetInnerHTML` usage; React escapes output by default
7. **Audit logging** — Most create operations are logged; auth operations fully logged
8. **Supabase RLS** — Database-level Row Level Security provides defense-in-depth
