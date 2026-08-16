# LOOP_007 — Performance & Instrumentation (Phase 3 Audit)

## Objective

Apply Phase 3 audit fixes (F17, F20, F9, F8, F18, F25) from `ARCHITECTURE_AUDIT.md`: eliminate the post-hydration auth POST, scope notification revalidation to the acting user's route, lower the DB pool size, prep `DIRECT_URL` for the direct host, add the timetable conflict-join index, branch-scope the conflict raw query, and add `[PERF]` instrumentation.

## Allowed Files

- `components/layout/notifications-dropdown.tsx`
- `app/(dashboard)/layout.tsx`
- `app/portal/layout.tsx`
- `actions/notification.actions.ts`
- `lib/prisma.ts`
- `.env`
- `prisma/schema.prisma` (F18 index — explicitly approved as part of Phase 3)
- `actions/reports.actions.ts`
- `proxy.ts`

## Forbidden Files

- `package.json` (no new dependencies)
- `prisma/schema.prisma` other than the approved F18 index

## Tasks

1. [x] F17: `NotificationsDropdown` now takes `initialCount` prop; layouts compute the unread count server-side during RSC render and pass it. Removed the client `useEffect` mount fetch that triggered a full auth POST + profile + count after hydration.
2. [x] F20: `markNotificationAsRead` / `markAllNotificationsAsRead` / `deleteNotification` revalidate only the acting user's route (`/portal/teacher` | `/portal/student` | `/portal/parent` | `/dashboard`) via `revalidateUserRoute(role)`, instead of 4 hardcoded paths.
3. [x] F9: Prisma pool `max: 10` → `max: 5` (`lib/prisma.ts`).
4. [x] F8 (prep): `DIRECT_URL` documented for direct host `db.gzhumudgucfqbqpuznek.supabase.co:5432`. Reverted to pooler after `prisma db push` could not reach the direct host (machine IP not allowlisted). See Notes.
5. [x] F18: Added `@@index([teacherId, academicSessionId, dayOfWeek, startTime])` to `Timetable`; applied via `prisma db push`. Branch-scoped the `timetableConflicts` raw self-join in `reports.actions.ts` (now filters `branch_id` too).
6. [x] F25: Added `[PERF]` instrumentation (dev only): proxy middleware timing, dashboard layout total, `getDashboardStats` Promise.all timing, and prisma client creation log with host.

## Files Modified (9)

| # | File | Change |
|---|------|--------|
| 1 | `components/layout/notifications-dropdown.tsx` | `initialCount` prop; removed mount `getUnreadNotificationCount` POST; syncs count from prop on RSC refresh |
| 2 | `app/(dashboard)/layout.tsx` | Added `unreadNotificationCount` query to Promise.all; passes `initialCount`; added `[PERF]` total timing |
| 3 | `app/portal/layout.tsx` | Added `unreadNotificationCount` query; passes `initialCount` |
| 4 | `actions/notification.actions.ts` | Added `revalidateUserRoute(role)`; replaced 4-path revalidation |
| 5 | `lib/prisma.ts` | Pool `max: 5`; `[PERF]` client-created log with host |
| 6 | `.env` | Commented direct-host `DIRECT_URL` (reverted to pooler for connectivity) |
| 7 | `prisma/schema.prisma` | Added F18 composite index on `Timetable` |
| 8 | `actions/reports.actions.ts` | Branch-scoped conflict self-join; `[PERF]` dashboardStats timing |
| 9 | `proxy.ts` | `[PERF]` middleware timing |

## Key Fixes

1. **No more hydration auth POST** — the notification badge count is now rendered server-side in the layouts; the client component just receives it as a prop. Removes +1 auth round trip + 2 DB queries per page load.
2. **Single revalidation path** — notification mutations refresh only the acting user's portal/dashboard route.
3. **Lower pool pressure** — `max: 5` per serverless instance reduces Supabase connection exhaustion risk.
4. **Conflict query optimized + scoped** — the O(n²) self-join now has a covering composite index and filters by `branch_id` (tenant-consistent with the other 15 stats queries).
5. **Instrumentation** — `[PERF]` logs (non-production) allow measuring the remaining latency hypothesis and confirming region.

## Notes / Deviations

- **F8 not fully applied:** `DIRECT_URL` → `db.<ref>.supabase.co:5432` is commented in `.env` as intended, but reverted to the pooler host because `prisma db push` cannot reach the direct host from this machine (Supabase requires the connecting IP to be allowlisted). The audit's recommendation is documented and the direct-host line is preserved for when allowlisting is configured. App runtime continues to use `DATABASE_URL` (session pooler, unchanged).
- **F25** — `[PERF]` logs are gated behind `NODE_ENV !== "production"` (no behavior change in prod). First-query logging was dropped because Prisma 7 removed `$use` middleware and `$extends` changes the client type (breaking the singleton export); client-creation timing covers the connection hypothesis instead.
- **F19** (Suspense per KPI group / `unstable_cache`) deferred — audit explicitly marked it "production, not micro-optimization" and advised measuring first (F25) before caching.

## Acceptance Criteria

- [x] No `getUnreadNotificationCount` call in `NotificationsDropdown` (grep-verified)
- [x] Notification actions revalidate a single role-scoped path
- [x] Prisma pool `max: 5`
- [x] Timetable composite index present in schema and pushed to DB
- [x] Conflict raw query branch-scoped
- [x] `[PERF]` instrumentation present (non-prod only)
- [x] `npx tsc --noEmit` → 0 errors
- [x] `npx prisma generate` → success
- [x] `npm run build` → passes

## Stop Condition

Phase 3 (F17, F20, F9, F8-prep, F18, F25) complete; TypeScript clean; schema pushed; production build passes.

## Dependencies

- Phase 1 (Loop 13): React `cache()` auth getters — layouts can compute the unread count without extra auth round trips.
- Phase 2 (Loop 14): middleware no longer queries the profile — no DB work in proxy beyond session validation, which F25 now times.

## Estimated Time

1 day