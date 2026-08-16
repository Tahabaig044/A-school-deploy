# LOOP_006 — Middleware & API Auth Hardening (Phase 2 Audit)

## Objective

Apply Phase 2 audit fixes (F3, F4, F5, F7, F14) from `ARCHITECTURE_AUDIT.md`: remove the Prisma query from middleware, stop leaking `X-User-*` response headers to the browser, make public routes skip auth, delete remaining `X-User-*` header reads, and add explicit `requireRole` + rate limiting to API routes.

## Allowed Files

- `proxy.ts`
- `lib/supabase/middleware.ts`
- `app/portal/page.tsx`
- `app/api/qr/route.ts`
- `app/api/upload/homework/route.ts`

## Forbidden Files

- `prisma/schema.prisma` (untouched)
- `package.json` (no new dependencies; `qrcode` already installed)
- `app/(auth)/*` (untouched)

## Tasks

1. [x] F3: Remove Prisma `profile.findUnique` query from `proxy.ts`; derive role from session `user.user_metadata.role` (set at signup/invite). Role redirects are now metadata-driven defense-in-depth; DB-backed `requireRole()` in pages/actions remains the real authorization gate.
2. [x] F4: Public routes (`/login`, `/register`, `/forgot-password`, `/reset-password`, `/setup-password`, `/`) return `NextResponse.next()` without creating a Supabase client or calling `getUser()`.
3. [x] F5: Delete all `X-User-Id/Role/SchoolId/BranchId/Email` response headers from `proxy.ts` — no identity metadata leaks to the browser.
4. [x] F7: Rewrite `app/portal/page.tsx` to use `getCurrentProfile()` instead of reading the `X-User-Role` header (the last remaining `X-User-*` read; confirmed no reads remain after this).
5. [x] F14: Add `requireRole` to `app/api/upload/homework/route.ts` (roles: SUPER_ADMIN, SCHOOL_ADMIN, BRANCH_ADMIN, TEACHER, STUDENT — matches `submitHomework` and the actual student-portal caller) and to `app/api/qr/route.ts` (admin/staff roles) with a per-IP fixed-window rate limit (120 req/min).
6. [x] Refactor `lib/supabase/middleware.ts` `updateSession()` to return `{ user, supabaseResponse }` so `proxy.ts` reuses one client instead of constructing a duplicate.

## Files Modified (5)

| # | File | Change |
|---|------|--------|
| 1 | `proxy.ts` | Removed Prisma query + dynamic supabase client; public routes skip auth; role from session metadata; deleted X-User-* response headers; reuses `updateSession` |
| 2 | `lib/supabase/middleware.ts` | `updateSession` returns `{ user, supabaseResponse }` |
| 3 | `app/portal/page.tsx` | Uses `getCurrentProfile()` instead of `X-User-Role` header |
| 4 | `app/api/qr/route.ts` | Added `requireRole` (admin/staff) + per-IP rate limiter |
| 5 | `app/api/upload/homework/route.ts` | Added `requireRole` (incl. STUDENT) with 401/403 handling |

## Key Fixes

1. **Middleware no longer touches the DB** — removes one Prisma profile query per protected request (~120ms saved per request per audit).
2. **No identity headers on the response** — the browser can no longer see `X-User-*`; portal pages no longer trust client-controllable headers (F7 closed).
3. **Public routes skip `getUser()`** — login/register/etc. no longer incur an auth round trip.
4. **API routes enforce their own auth** — `/api/qr` and `/api/upload/homework` are reachable independent of the proxy and now check `requireRole` in-handler; QR also rate-limited per IP (120/min).
5. **Single middleware client** — `proxy.ts` now reuses `updateSession` instead of building a second `createServerClient`.

## Notes / Deviations

- The audit (F3) suggested `app_metadata.role`, but the app stores role in `user_metadata` at user creation (`actions/auth.actions.ts:115,130`, `student.actions.ts`, `teacher.actions.ts`, etc.). Middleware reads `user_metadata.role`. Users with no metadata role skip role-redirects and are still gated by DB-backed `requireRole()` in pages/actions.
- The audit (F14) suggested `requireRole("TEACHER")` for `/api/upload/homework`, but the only caller is the student homework page (`app/portal/student/homework/[id]/page.tsx`). The role set matches `submitHomework` (adds STUDENT) to avoid breaking student submission.
- Rate limiter is in-memory per process (fixed window); sufficient for a single instance. `qrcode` was already a dependency.

## Acceptance Criteria

- [x] No Prisma import/query in `proxy.ts`
- [x] No `X-User-*` headers set anywhere in `app/` or `proxy.ts`
- [x] No `headers()` reads for identity in `app/` (grep clean)
- [x] `/api/qr` returns 401/403/429 when unauthenticated/unauthorized/rate-limited
- [x] `/api/upload/homework` returns 401/403 when unauthenticated/unauthorized
- [x] `npx tsc --noEmit` → 0 errors
- [x] `npm run build` → passes

## Stop Condition

Phase 2 (F3, F4, F5, F7, F14) complete; TypeScript clean; production build passes.

## Dependencies

- Phase 1 (Loop 13): `React.cache()` auth getters already in place, so portal pages use `getCurrentProfile()` and no `X-User-*` reads remain except the portal root page rewritten here.

## Estimated Time

1 day