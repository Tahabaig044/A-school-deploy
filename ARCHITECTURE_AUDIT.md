# ARCHITECTURE_AUDIT.md — Deep Supabase + Next.js Architecture & Performance Audit

**Date:** 2026-08-14
**Scope:** Full code-based audit per `Deep Supabase + Next.js Architecture & Performance Audit Prompt.md`
**Status:** Complete — no code changed

---

## 1. Supabase Client Architecture

### Client inventory table

| Location                       | Client Type                             | Runtime                          | Correct? | Problem                                                                                                                                                                                                                         |
| ------------------------------ | --------------------------------------- | -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/supabase/client.ts:4`     | `createBrowserClient` (anon key)        | Browser                          | Yes      | None — correct singleton browser client.                                                                                                                                                                                        |
| `lib/supabase/server.ts:11`    | `createServerClient` (anon key)         | Server Component / Server Action | Yes      | None — correct per-request client with `cookies()`.                                                                                                                                                                             |
| `lib/supabase/server.ts:32`    | `createServerClient` (SERVICE_ROLE key) | Server Action only               | Mostly   | Key is correct (server-only, never sent to client). But it attaches full cookie handlers that are meaningless for a service-role client; it should be a bare `createClient` from `supabase-js`. Low risk.                       |
| `lib/supabase/middleware.ts:7` | `createServerClient` (anon key)         | Middleware (public routes)       | Yes      | None — correct.                                                                                                                                                                                                                 |
| `proxy.ts:55`                  | `createServerClient` (anon key)         | Middleware (protected routes)    | Partly   | **Duplicates the middleware client** — `proxy.ts` re-implements the client from `lib/supabase/middleware.ts` inline instead of importing `updateSession` and then reading user/profile. Also does a Prisma query here (see §3). |

### Findings

**F1 — `proxy.ts:55` duplicates `lib/supabase/middleware.ts:7` client logic**

- Current: `proxy.ts` inlines its own `createServerClient` + cookie handlers instead of composing `updateSession()`.
- Why: two copies of the same cookie-handling logic can drift; the proxy client is created even for redirects.
- Performance: negligible alone.
- Security: maintenance risk only.
- Recommended: extract a shared `createServerClient(cookieStore)` factory and reuse it from `middleware.ts`, `server.ts`, and `proxy.ts`.
- Confidence: High.

**F2 — `createServiceClient()` (`lib/supabase/server.ts:32`) wires cookies to a service-role client**

- Current: service client is built with `cookies: { getAll, setAll }` handlers that write to the request cookie store.
- Why incorrect: service-role clients do not use cookies; attaching cookie mutation on a service client is confusing and could, if misused in a route handler that renders, set cookies as a side effect of admin operations.
- Performance: none.
- Security: the service key itself is used correctly (only inside Server Actions, e.g. `student.actions.ts:202`, `teacher.actions.ts:130`, `auth.actions.ts:96/274/670`). Minor surface issue.
- Recommended: `createServiceClient()` → `createClient(SERVICE_ROLE_URL, SERVICE_ROLE_KEY)` with no cookie handlers.
- Confidence: High.

---

## 2. Supabase Auth Flow

### Every `auth.getUser()` call

| Location                                    | Runtime                                     | Necessary?                                                                                                                                                     |
| ------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `proxy.ts:78`                               | Middleware (protected routes)               | Yes, but see F4/F5 — it also does a Prisma profile query here.                                                                                                 |
| `lib/supabase/middleware.ts:28`             | Middleware (public routes)                  | No — public routes run `getUser()` on every hit of `/login`, `/register`, `/forgot-password` etc. Adds one auth round-trip to every unauthenticated page load. |
| `lib/auth.ts:40` (`getCurrentUser`)         | Server Component / Action                   | Yes (only when request context is absent).                                                                                                                     |
| `lib/dashboard-validation.ts:29,72,115,158` | Server Component (portal/dashboard layouts) | **Duplicates** the proxy's `getUser()` — runs again on every dashboard/portal render.                                                                          |
| `actions/auth.actions.ts:399`               | Server Action (signin)                      | Yes — required to get the session user after `signInWithPassword`.                                                                                             |
| `actions/auth.actions.ts:448`               | Server Action (signout)                     | Yes — required to write an audit log with the user id.                                                                                                         |
| `actions/auth.actions.ts:526`               | Server Action (reset password)              | Yes — for the audit log.                                                                                                                                       |
| `actions/auth.actions.ts:695`               | Server Action                               | Yes — required for the operation.                                                                                                                              |

No `auth.getSession()` / `auth.refreshSession()` calls exist anywhere. Correct — `getSession()` is not trustworthy for authorization; the codebase correctly uses `getUser()`.

### Auth network requests during ONE dashboard navigation

1. **Browser → proxy** `proxy.ts:78` `getUser()` — 1 Supabase Auth network call
2. **proxy** `proxy.ts:87` `profile.findUnique` — 1 Prisma/DB query
3. **Layout** → `validateDashboardAccess()` `dashboard-validation.ts:158` `getUser()` — 2nd Supabase Auth network call
4. **Layout** `dashboard-validation.ts:164` `profile.findUnique` + `:184` `school.findUnique` — 2 DB queries
5. **Layout** `app/(dashboard)/layout.tsx:57` `profile.findUnique` (fullProfile) — 3rd profile query
6. **Layout** `:88` `branch.findMany` + `:94` `getPermissionsForRole` → `permissions.ts:229` `rolePermission.findMany` + `userPermission.findMany` — 2 DB queries (first load only; in-memory cached after)
7. **Page** `dashboard/page.tsx:11` `requireRole` — served from request context set by layout (no network) ✓
8. **Page** `:19` `branch.findUnique` (selected_branch cookie) — 1 DB query
9. **Page** `getDashboardStats` → `reports.actions.ts:6` `requireRole` (cached, no network) + **16 parallel stats queries** — 16 DB queries
10. **Client hydration** → `NotificationsDropdown` `useEffect` → `getUnreadNotificationCount` Server Action (POST). This POST re-runs **proxy** (`getUser` + profile) AND the action itself does `requireRole` → `getUser()` + `profile.findUnique` + `notification.count` — 2nd auth pair + 2 DB queries.

**Total for one dashboard load: ~3 Supabase Auth network calls + ~25 DB queries** (permission-cache-warm; +2 DB on cold).

### Key conclusion

The proxy auth call (#1) and the layout validation auth call (#3) are **redundant with each other**, and the proxy's Prisma profile query (#2) duplicates the layout's (#4, #5). Because `lib/auth.ts` uses a module-level mutable context (see F6) the page itself is deduplicated, but the middleware/layout duplication is real and cross-request unsafe.

---

## 3. Middleware (`proxy.ts`)

- **Routes invoking middleware:** everything except `_next/static`, `_next/image`, `favicon.ico`, and image assets (`proxy.ts:131`). This includes **every Server Action POST** and **every `/api/*` call**.
- **Public routes invoke auth unnecessarily:** `proxy.ts:46-48` sends `/login`, `/register`, `/forgot-password`, `/reset-password`, `/setup-password`, and `/` to `updateSession()`, which calls `auth.getUser()` (`lib/supabase/middleware.ts:28`). **Every unauthenticated page load pays one Supabase Auth round-trip** (~150–250ms cross-region, see §5).
- **Prisma is called from middleware:** `proxy.ts:87` `prisma.profile.findUnique` runs on **every protected request**, including every Server Action POST and API call. On Vercel serverless this creates a DB connection + query per request before the app even starts.
- **Headers are set as RESPONSE headers, not forwarded request headers:** `proxy.ts:114-118` calls `supabaseResponse.headers.set("X-User-Id" / "X-User-Role" / "X-User-SchoolId" / "X-User-BranchId" / "X-User-Email")`.
  - Verified in `node_modules/next/dist/server/lib/router-utils/resolve-routes.js:459-460`: middleware response headers are copied **both** to `resHeaders[key]` (sent to the **browser**) and to `req.headers[key]` (visible to `headers()` upstream). So the app _does_ read them via `headers()`, **but they are also exposed to the client**.
  - The Next.js-supported pattern for app-internal headers is `NextResponse.next({ request: { headers } })`, which forwards upstream without leaking to the browser.
- **Browser cannot spoof these headers** in the normal case: when a profile exists, the proxy overwrites any client-supplied `X-User-*` with verified values (resolve-routes.js applies middleware headers last). **However** — if the authenticated user has **no profile record**, `proxy.ts:92` skips setting `X-User-*` entirely, and the browser-supplied headers pass through. Portal pages such as `app/portal/teacher/students/[id]/page.tsx:14-25` then trust those headers and call `setRequestContext` with them, without re-running `getUser()`. See F7.
- **Authorization in middleware:** the `roleRouteMap` check (`proxy.ts:106-112`) is redundant with `requireRole()` in every page/action. It is defense-in-depth (fine) but adds a DB profile lookup to every request.

### Findings

**F3 — Prisma query runs in middleware on every request** (`proxy.ts:87`)

- Current: `prisma.profile.findUnique` + a separate `getUser()` for every protected request (page, server action, API).
- Why incorrect: middleware in a serverless environment should be fast and connection-free; doing a DB round trip for every request, including Server Action POSTs that will re-authenticate and re-query profile anyway, adds ~150–300ms per request.
- Performance impact: High — this is a primary contributor to slow navigation.
- Security impact: none (profile data is not sent to the client), but the resulting `X-User-*` response headers leak identity metadata to the browser (see F5).
- Recommended: middleware should only refresh/validate the session and do role redirection from **user metadata** stored in the auth session (`app_metadata.role`, set at signup/invite time). Remove the Prisma query from middleware. Use `NextResponse.next({ request: { headers } })` for upstream-only headers.
- Confidence: High.

**F4 — Public routes run `getUser()` unnecessarily** (`lib/supabase/middleware.ts:28`)

- Current: `updateSession()` always awaits `supabase.auth.getUser()`.
- Why incorrect: public pages (login/register/forgot/reset) only need `getSession()` to know whether a session cookie exists for redirect purposes; `getUser()` makes a network call.
- Performance impact: adds ~150–250ms to every public page load.
- Security impact: none (getSession is only used for a boolean).
- Recommended: skip auth entirely on public routes (or use `getSession()`); only `getUser()` on protected routes.
- Confidence: High.

**F5 — `X-User-*` set as response headers leaks to the client** (`proxy.ts:114-118`)

- Current: `supabaseResponse.headers.set("X-User-Id", user.id)` etc.
- Why incorrect: verified in `resolve-routes.js:459-460` — response headers are added to `resHeaders` (browser-visible) **and** `req.headers`. User id, role, schoolId, branchId and email are exposed in every HTTP response to the browser.
- Performance impact: none.
- Security impact: Medium — identity/role metadata visible in the network tab; in shared-computer contexts this leaks the previous user's identity. More importantly, the pattern is fragile (see F7).
- Recommended: `let res = NextResponse.next({ request: { headers: { ...request.headers, "x-user-id": user.id, ... } } })` — forwards upstream only.
- Confidence: High (verified against installed Next source).

**F6 — Module-level mutable request context** (`lib/auth.ts:19-31`)

- Current: `let currentRequestContext` is a **module-global** that `setRequestContext()`/`clearRequestContext()` mutate. `app/(dashboard)/layout.tsx:80/124` and `app/portal/layout.tsx` set it around rendering children; `requireRole()`/`getCurrentUser()` read it.
- Why incorrect: Next.js can render multiple requests concurrently in one Node process (streaming, parallel routes, server actions). If two requests interleave, request A's context can be read or cleared by request B → **cross-request data leakage / race condition**. This is the single most dangerous finding.
- Performance impact: when it works, it saves 1 auth call + 1 profile query per page. But it is not safe.
- Security impact: **Critical** — potential cross-tenant context leakage under concurrency.
- Recommended: replace with React's `cache()` (request-scoped) — i.e. `export const getCurrentUser = cache(async () => { ... })`. Remove `setRequestContext`/`clearRequestContext` entirely. If explicit context is needed (e.g. audit logging), use `AsyncLocalStorage` via a `NextRequest`-scoped store.
- Confidence: High.

**F7 — Portal pages trust client-controllable `X-User-*` headers** (`app/portal/teacher/students/[id]/page.tsx:14-25`)

- Current: the page reads `headers().get("X-User-Id")` etc., then `setRequestContext({ user: { id: userId }, profile: { id: userId, role: "TEACHER" ... } })` **without calling `getUser()`**.
- Why incorrect: when the profile is null, `proxy.ts:92` does not overwrite the headers, so a browser-supplied `X-User-Id`/`X-User-Role` is trusted. The same pattern exists in `app/portal/page.tsx:5-6`, `app/(dashboard)/layout.tsx:20-25`, and `app/portal/layout.tsx`.
- Performance impact: none.
- Security impact: **High** for the no-profile edge case (authenticated user without a Profile row can impersonate another user id in these pages). In the normal case the proxy overwrites headers, so it is an edge-case flaw — but the pattern is fundamentally trusting client headers.
- Recommended: never use headers for identity. Call `cache()`-wrapped `getUser()` in each protected server component; delete all `X-User-*` reads.
- Confidence: Medium (exploitability depends on a profile-less authenticated user existing, which the app can produce if a profile insert fails or is deleted).

---

## 4. Prisma + Supabase PostgreSQL

- `prisma/schema.prisma` — datasource `postgresql`, no URL (uses `prisma.config.ts`); `generator client` = `prisma-client`, output `../lib/generated/prisma`.
- `prisma.config.ts:9-11` — `datasource.url = process.env.DIRECT_URL`.
- `lib/prisma.ts` — `@prisma/adapter-pg` with `PrismaPg(new Pool({ connectionString: DATABASE_URL, max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 }))`, guarded by `globalForPrisma`.

### `.env` analysis (values masked)

- `DATABASE_URL` = `postgresql://postgres.<ref>@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres` — **session-mode pooler** (port 5432).
- `DIRECT_URL` = same pooler URL (port 5432). The commented-out lines show the intended values: transaction-mode pooler (6543) and the direct connection (`db.<ref>.supabase.co:5432`).
- **Correct part:** `DATABASE_URL` uses **session-mode pooler (5432)**, which is the _only_ Supabase pooler mode compatible with Prisma prepared statements. Using 6543 (transaction mode) with Prisma's pg driver would break prepared statements. This choice is right.
- **Incorrect part:** `DIRECT_URL` points at the pooler, not the direct database host. `prisma.config.ts` uses `DIRECT_URL` for **migrations/Studio**. Running migrations through the pooler works for session mode but is unnecessary and less reliable than the direct connection, and it inflates latency for migrate/studio operations. Also, both URLs share the pooler's connection accounting.

### Findings

**F8 — `DIRECT_URL` should be the direct connection, not the pooler** (`.env`)

- Current: both URLs → `pooler.supabase.com:5432`.
- Why incorrect: Prisma migrations (`prisma.config.ts:10`) should target `db.<ref>.supabase.co:5432` directly to avoid pooler connection overhead/locking during DDL.
- Performance impact: Low (migrations only).
- Security impact: none.
- Recommended: `DIRECT_URL = postgresql://postgres:<pwd>@db.<ref>.supabase.co:5432/postgres` (uncomment the existing line). Keep `DATABASE_URL` on the session pooler (5432).
- Confidence: High.

**F9 — Pool size `max:10` per serverless instance** (`lib/prisma.ts`)

- Current: `Pool({ max: 10, ... })` with `globalForPrisma` singleton.
- Why: correct singleton pattern; but on Vercel each lambda instance holds its own pool. `max:10` × many concurrent instances can exhaust Supabase's connection/pooler budget (free/Pro tiers). Session pooler is more forgiving than direct, but 10 is high for a serverless edge.
- Performance impact: Medium at scale — connection exhaustion → waits → slow pages.
- Security impact: none.
- Recommended: `max: 5` and consider Supabase's recommended serverless pooler setup (session mode). Verify with `pgbouncer` statistics once instrumentation is added.
- Confidence: Medium.

**F10 — Transactions are used correctly**

- `createStudent` (`student.actions.ts:225`) wraps all DB writes in `prisma.$transaction`.
- Bulk attendance and exam results already batched in Loop 5.
- No evidence of missing transactions in write paths. ✓ Correct — keep.

---

## 5. Supabase Region vs Vercel Region

- **Supabase project region:** `aws-1-ap-southeast-1` = **Singapore** (from `.env` host `aws-1-ap-southeast-1.pooler.supabase.com`).
- **Vercel:** no `vercel.json` found; default function region is `us-east-1` (Washington DC). If the project is deployed to default Vercel region, the app is in **us-east-1**.
- **Latency estimate:** Singapore ↔ US East ≈ **180–240ms RTT** (one-way ~90–120ms). Supabase Auth API calls and every pooled DB round trip incur this latency.

### Answer: can region explain 5–6s navigation?

**Region alone cannot explain 5–6s, but it amplifies everything.**

- Dashboard = ~3 auth network calls + ~25 DB queries (§2). If a large share of DB queries run sequentially or in dependency chains, and each round trip pays ~200ms cross-region, overhead compounds: e.g. proxy getUser (~220ms) + proxy profile (~240ms) + layout getUser (~220ms) + validation profile/school (~250ms) + fullProfile (~240ms) + branch (~240ms) + 16 parallel stats (~350ms batch) ≈ **1.5–2.5s** before HTML renders, before client-side Server Action POSTs.
- Realistic contributors to 5–6s: cross-region latency + **serial auth/profile duplication** + cold-start + session-mode pooler connection setup + the client-triggered `getUnreadNotificationCount` POST after hydration.
- **Recommendation:** deploy Vercel functions to `icn1` (Singapore) **and** fix the duplicate calls. Region fix alone (~200–400ms) will not solve 5–6s; the duplicated auth/profile work and middleware DB queries must be removed.
- Confidence: Medium (deployment region not verifiable from the repo; default assumption used).

---

## 6. RLS

- **No `.sql` files, no `ENABLE ROW LEVEL SECURITY`, no `CREATE POLICY` anywhere in the repo.**
- **How RLS interacts with the Prisma connection:** Prisma connects via `DATABASE_URL` with the **`postgres` superuser role** (through the pooler). In Postgres, **RLS policies do not apply to superusers** (and, by default, not to the table owner). Even if RLS were enabled on tables, **Prisma would bypass it** because it connects as the owner/superuser.
- Therefore: **enabling RLS would give a false sense of security** in this architecture. The app's real security boundary is **application-layer authorization** (school-context.ts + requireRole + explicit `schoolId`/`branchId`/`userId` filters). This is a legitimate, documented pattern for Prisma + Supabase, but it means every query must be audited (see §7).

### Finding

**F11 — No RLS, and RLS would not protect the Prisma connection**

- Current: no policies; Prisma connects as `postgres` (superuser).
- Why: RLS is inapplicable to the app's connection. It is **correct** that the team did not add RLS without rethinking the connection role.
- Recommended: If RLS is desired, the correct architecture is (a) a non-superuser application role with `SET ROLE`/`SET postgrest`-style claims in a session, or (b) keep RLS OFF and rely on the audited application-layer filters (§7). Option (b) is simpler and fine for this app. Do **not** add RLS "for compliance" — it will silently not protect anything.
- Confidence: High.

---

## 7. Multi-Tenant Security

### Correct patterns (verified)

- `lib/school-context.ts:23-52` — `getSchoolId`/`getBranchId` force all roles except `SUPER_ADMIN` to their own profile's `schoolId`/`branchId`, ignoring `formData`. ✓ **This is the backbone of tenant isolation and is correct.**
- `createStudent` (`student.actions.ts:94-102`) uses `requireRole` + `getSchoolId`/`getBranchId`. ✓
- `createTeacher`, `createStaff`, `createParent`, fee actions, attendance actions all follow the same school-context pattern (per Loop 2 audit).
- `requireRole` in every Server Action. ✓

### Vulnerabilities

**F12 — Dashboard stats aggregates are not school-scoped when a branchId is provided** (`actions/reports.actions.ts`)

- Current:
  - `payment.aggregate` (`:63-69`): `where` = `{ paymentDate: {...}, ...(effectiveBranchId && { invoice: { student: { branchId } } }) }` — **no `schoolId` filter**.
  - `feeInvoice.aggregate` (`:70-76`): `where` = `{ status: [...], ...(effectiveBranchId && { student: { branchId } }) }` — **no `schoolId` filter**.
  - `leaveRequest.count` (`:83-88`, `:96-103`): when `effectiveBranchId` is set, filters `profile: { branchId }` — **no `schoolId` filter**.
- Attack: a `SCHOOL_ADMIN`/`BRANCH_ADMIN` at school A sets cookie `selected_branch` (`components/layout/branch-selector.tsx:35`, client-set, tamperable) to a branch id belonging to **school B**. `dashboard/page.tsx:17,24-25` reads it and passes it as `effectiveBranchId` while `effectiveSchoolId = profile.schoolId` (school A). For payment/feeInvoice/leaveRequest, the branch-only filter leaks **school B's financial and leave data** to a school A admin. (The other 13 queries use `whereClause` with `schoolId`, so they are safe.)
- Performance impact: none.
- Security impact: **High — cross-school data disclosure** (fees/payments/leave) for admins. Requires knowing a branch UUID, which appears in URLs/APIs and is guessable in a shared deployment.
- Recommended: in `getDashboardStats`, always enforce `schoolId` in **every** query. Either validate the cookie branch belongs to `profile.schoolId` before use (`dashboard/page.tsx:19-22`), or drop `selected_branch` tampering by requiring `branch.schoolId === profile.schoolId`. Never derive tenant scope from a client cookie without validating ownership.
- Confidence: High.

**F13 — `selected_branch` cookie is a client-controlled tenant selector** (`components/layout/branch-selector.tsx:35`, `app/(dashboard)/dashboard/page.tsx:17`)

- Current: any user can set `selected_branch=<any uuid>`; the page uses it without verifying ownership.
- Same recommended fix as F12. If the cookie must remain, validate `branch.schoolId === profile.schoolId` server-side before use.
- Confidence: High.

**F14 — Unauthenticated/role-loose API endpoints**

- `app/api/qr/route.ts` — QR generation endpoint. It has **no `requireRole`**, and since the proxy matcher covers `/api/*`, it runs `getUser()` + profile query in middleware but the route itself performs no authorization of **what** it generates. QR codes are typically attendance codes; this endpoint is both unauthenticated-by-design (its own code has no auth) and covered by middleware that adds overhead. Needs explicit auth + rate limiting if exposed publicly.
- `app/api/upload/homework/route.ts` — **no authentication check in the route itself** (`route.ts:18`). It relies entirely on `proxy.ts` having run. Files are written to `public/uploads/homework/` (publicly servable) with an unguessable UUID name, and size/type are validated — so the practical risk is limited, but the route should still call `requireRole("TEACHER")` (defense in depth), since a route handler is reachable independent of the proxy in some configurations.
- Performance impact: uploads/QR add middleware DB round trips.
- Security impact: Medium (missing explicit auth on `/api/upload/homework`, `/api/qr`).
- Recommended: add `requireRole` inside both route handlers; rate-limit `/api/qr`; keep the matcher but avoid relying on middleware as the _only_ auth for API routes.
- Confidence: High.

**F15 — Module-global context (F6) is also a multi-tenant risk**

- The same race in `lib/auth.ts:19` can hand request A's context to request B. Cross-tenant leakage under concurrency. Already covered in F6; it is listed here because it is the most serious tenant-isolation risk.

---

## 8. Duplicate Data Fetching

Confirmed duplicate patterns per dashboard/portal load:

| Pattern                                             | Locations                                                                         |
| --------------------------------------------------- | --------------------------------------------------------------------------------- |
| `getUser()` in middleware then again in layout      | `proxy.ts:78` + `dashboard-validation.ts:158`                                     |
| Profile `findUnique` in middleware                  | `proxy.ts:87`                                                                     |
| Profile `findUnique` again in validation            | `dashboard-validation.ts:164`                                                     |
| Profile `findUnique` again (fullProfile)            | `app/(dashboard)/layout.tsx:57`                                                   |
| Portal layouts repeat the same getUser+profile      | `app/portal/layout.tsx`, `dashboard-validation.ts:29/72/115`                      |
| Server Action POST re-runs proxy auth + action auth | `proxy.ts:78` + `notification.actions.ts:93` via `requireRole` (`lib/auth.ts:74`) |

### Findings

**F16 — No React `cache()`; duplicated auth+profile per request layer**

- Current: no `cache()`/`unstable_cache` usage anywhere in `app/` or `lib/` (grep-verified). The module-global context in `lib/auth.ts` is the only "dedup" mechanism and it is unsafe (F6).
- Why incorrect: each layer (middleware → layout → validation) re-authenticates and re-queries the profile.
- Performance impact: High — 2–3 auth calls + 3–4 profile queries per navigation.
- Security impact: Medium via F6 race.
- Recommended:
  1. `getCurrentUser = cache(getCurrentUserImpl)` and `getCurrentProfile = cache(getCurrentProfileImpl)` in `lib/auth.ts` (request-scoped, concurrency-safe). Remove the module global.
  2. Middleware: stop querying profile; rely on session `app_metadata.role` for route redirection.
  3. Layout: keep one `getCurrentProfile()` call, drop `validateDashboardAccess`'s duplicate profile query or merge them into a single `cache()`-deduped helper.
- Confidence: High.

**F17 — Client-side Server Action after hydration re-runs full auth** (`components/layout/notifications-dropdown.tsx:25-29`)

- Current: `useEffect` calls `getUnreadNotificationCount()` on mount → separate POST → proxy auth + action `requireRole` + `notification.count`.
- Why incorrect: this adds a full second authentication round trip to _every_ dashboard/portal page load (the unread badge could instead be fetched during the RSC render and passed as a prop).
- Performance impact: Medium — +1 auth network call + ~2 DB queries per page load.
- Security impact: none (still authorized).
- Recommended: pass the unread count from the layout (it already computes stats) as a prop/context; keep a lightweight `getUnreadNotificationCount` only for refresh polling.
- Confidence: High.

---

## 9. Dashboard Performance

### Query inventory (verified)

**`reports.actions.ts:45-130` — 16 queries in one `Promise.all`:**

1. `student.count` (ACTIVE) `:46`
2. `teacher.count` (ACTIVE) `:47`
3. `parent.count` `:48`
4. `class.count` `:49`
5. `section.count` (relation filter) `:50-52`
6. `studentAttendance.count` (today, relation filter) `:53-61`
7. `student.count` (all) `:62`
8. `payment.aggregate` (month, branch-only) `:63-69` — **F12**
9. `feeInvoice.aggregate` (PENDING/PARTIAL, branch-only) `:70-76` — **F12**
10. `student.count` (new admissions this month) `:77-82`
11. `leaveRequest.count` (PENDING, branch-only) `:83-88` — **F12**
12. `exam.count` (upcoming, published) `:89-95`
13. `leaveRequest.count` (teachers on leave today, branch-only) `:96-103` — **F12**
14. `meeting.count` (upcoming) `:104-111`
15. `notification.count` (unread for user) `:112-117`
16. `$queryRawUnsafe` timetable conflict self-join `:119-131`

Plus page-level: `branch.findUnique` (`dashboard/page.tsx:19-22`) and layout queries (`branch.findMany`, 2× permission queries, profile, school).

### Assessment

- **Parallelization:** the 16 stats queries are already in one `Promise.all`. ✓ Correct — do not split these into 16 await lines.
- **Necessary:** most count queries are legitimate; the page genuinely shows 16 KPIs.
- **F12** (school-scoping on #8/#9/#11/#13) is a security bug, not perf.
- **F17** (unread badge POST) duplicates #15.
- **Indexes:** schema already has `@@index([userId, isRead])` on Notification (`schema.prisma:1088`), `@@index([schoolId, branchId])` on Class/Section/Student, `@@index([teacherId, dayOfWeek])` + `@@index([academicSessionId])` on Timetable (`:592-593`), `@@index([classId, sectionId, date])` on StudentAttendance (`:615`), `@@index([studentId, status])` on FeeInvoice (`:722`). These cover the dashboard queries well.
- **Potential slow spot:** `$queryRawUnsafe` self-join (`reports.actions.ts:119-131`) computes overlapping teacher timetables on every load with only `(teacherId, dayOfWeek)` + `(academicSessionId)` indexes. At scale this join can be slow. Also, it only filters by `schoolId` (not `branchId`), inconsistent with the rest.

### Findings

**F18 — `timetableConflicts` raw self-join is expensive and not branch-scoped** (`reports.actions.ts:119-131`)

- Current: `$queryRawUnsafe` self-join on `timetables` filtering only by `schoolId`.
- Why: the query is O(n²)-ish per teacher per day per session; indexes only partially cover (`teacherId, dayOfWeek`, `academicSessionId`) — the overlap predicate on `start_time`/`end_time` cannot use the index range efficiently.
- Performance impact: Medium at scale.
- Security impact: none (parameterized).
- Recommended: add a composite index `@@index([teacherId, academicSessionId, dayOfWeek, startTime])`, scope by `branchId` too, and consider computing conflicts at write-time (stored denormalized) rather than on every dashboard load.
- Confidence: Medium.

**F19 — Dashboard is rendered server-side with ~25 queries before first paint**

- Current: single RSC page awaits all 16 stats + layout queries, then streams.
- Performance impact: Medium — page paint waits for the slowest query.
- Recommended (production, not micro-optimization): wrap `DashboardCards` in `Suspense` per KPI group (already partially done via `PageSkeleton`), and cache slow aggregates with `unstable_cache` keyed by `schoolId+branchId+day` where freshness can tolerate minutes (e.g., today's attendance, conflict count). Do **not** combine the 16 queries into one giant SQL blob — maintainability matters and 16 parallel indexed queries are fine.
- Confidence: Medium.

---

## 10. Server Actions

**F20 — Notification actions re-authenticate on every call + revalidate 4 paths**

- `actions/notification.actions.ts:16,26,41,56,69,94,102` — each action calls `requireRole(...)` which, on a client-triggered POST, does `getUser()` + `profile.findUnique` every time.
- `markNotificationAsRead`/`markAll`/`delete` call `revalidatePath` on `/dashboard` **and** `/portal/teacher` **and** `/portal/student` **and** `/portal/parent` (`:33-36,48-51,108-111`) — revalidating routes the acting user may not even have.
- Performance impact: Medium — every dropdown click = auth + profile + 4 revalidations.
- Security impact: none.
- Recommended: revalidate only the acting user's current route; dedupe auth via `cache()` (F16); pass the unread count from the RSC render (F17).
- Confidence: High.

**F21 — Branch switching = full page refresh** (`components/layout/branch-selector.tsx:31-39`)

- Current: sets cookie + `router.refresh()`.
- Why: acceptable, but the `selected_branch` cookie is a tenant-scope vector (F13) and triggers a full dashboard reload (all 25 queries).
- Recommended: validate branch ownership server-side on read (F13). Keep the refresh (it is correct UX for a scope change); do not attempt client-side refetch of all stats.
- Confidence: High.

**F22 — `signin` runs two profile lookups** (`actions/auth.actions.ts:324` and `:404`)

- Current: profile fetched by email for lockout (`:324`), then fetched again by `user.id` after sign-in (`:404`).
- Why: minor; the second lookup is for the redirect path and login audit.
- Performance impact: Low (login only).
- Security impact: none.
- Recommended: reuse the first profile row for the redirect/audit when available.
- Confidence: Medium.

**F23 — `createStudent`/`createTeacher` service-client usage is correct**

- `student.actions.ts:202-212`, `teacher.actions.ts:130-140` — `auth.admin.createUser` with `email_confirm: true`, within controlled flows; DB writes in `$transaction`. ✓ Correct — keep.

---

## 11. Sidebar

**Current implementation:** `components/layout/sidebar.tsx` (desktop) and `components/layout/mobile-sidebar.tsx` render a **flat** `<ul>` from `lib/menu-items.ts` (251 lines, ~30 items) filtered by `filterMenuItemsByPermissions` (`lib/menu-items.ts:248-250`). No grouping, no collapsibles.

- **Does not load DB data to render static navigation** ✓ — the permission list is the only input (passed as a prop from the layout).
- **Active state** is computed from `usePathname` ✓.
- It is a client component (`"use client"`), so adding client-side collapse state is fine and will not add server work.

### Finding

**F24 — Sidebar is a long flat list; should be grouped into collapsible sections**

- Current: ~30 flat links (`lib/menu-items.ts:39+`).
- Recommended (matches prompt §11):
  - Restructure `MenuItem` to a `MenuGroup[]` shape: Dashboard / Academic (Classes, Sections, Subjects, Timetable, Exams, Homework) / People (Students, Teachers, Parents, Staff) / Finance (Fees, Payments, Expenses, Payroll) / Attendance / Communication (Messages, Notifications, Announcements, Meetings) / Reports / Settings.
  - Keep filtering by permission **per item** (group collapsed if no visible children).
  - Collapse state = client-side `useState` only; **no `router.refresh()`** on open/close.
  - Lazy-render group children only when expanded.
  - Filtering is pure data transformation in `lib/menu-items.ts` (no DB), so grouping adds no server cost.
- Performance impact: none to low (client-only).
- Security impact: none.
- Confidence: High.

---

## 12. Performance Measurement

**F25 — No instrumentation anywhere.** No `[PERF]` logs, no `server-only` timing, no `performance.now()` in proxy, layouts, or actions. The 5–6s claim is unmeasured.

Recommended instrumentation (Phase 1, no behavior change):

- `proxy.ts`: time `getUser()` + profile.
- `app/(dashboard)/layout.tsx`: time `validateDashboardAccess`, `branch.findMany`, `getPermissionsForRole`.
- `reports.actions.ts`: time the `Promise.all` of 16 stats.
- `lib/prisma.ts`: wrap `$connect` and log first-query latency.
- Log shape: `[PERF] middleware: 240ms | auth: 210ms | profile: 40ms | dashboardStats: 350ms | total: 820ms`.
- Also log region `x-vercel-region` header vs Supabase region to confirm the §5 latency hypothesis.

---

## 13. Final Verdict

### A. Supabase Architecture Score: **58 / 100**

Client separation (browser/server/middleware) is fundamentally correct and service-key usage is safe, but the middleware duplicates client logic and does DB work, headers are used as a request-context channel, and the module-global context cache is unsafe.

### B. Performance Score: **34 / 100**

~3 auth calls + ~25 DB queries per dashboard load, DB query in middleware for every request (incl. server actions), cross-region latency, no caching, and a client-side re-auth POST after hydration. Realistic budget of 5–6s.

### C. Security Score: **52 / 100**

School-context isolation and `requireRole` are correct and comprehensive, but the module-global context race (F6), branch-unscoped financial aggregates (F12/F13), trusted client headers on portal pages (F7), and unauthenticated API routes (F14) are material tenant-isolation gaps. RLS being absent is acceptable for this connection model.

### D. Top 10 Problems (ranked by actual impact)

| #   | Finding                                                            | Severity     | Perf   | Security                 |
| --- | ------------------------------------------------------------------ | ------------ | ------ | ------------------------ |
| 1   | F6 — Module-global mutable request context (cross-request race)    | **Critical** | High   | Critical                 |
| 2   | F12 — Dashboard payment/fee/leave aggregates not school-scoped     | **Critical** | –      | High (cross-school leak) |
| 3   | F3 — Prisma query + auth in middleware for every request           | **High**     | High   | –                        |
| 4   | F16 — No React `cache()`; duplicated auth+profile per layer        | **High**     | High   | Medium                   |
| 5   | F7 — Portal pages trust client `X-User-*` headers                  | **High**     | –      | High (edge case)         |
| 6   | F13 — `selected_branch` cookie is a tamperable tenant selector     | **High**     | –      | High                     |
| 7   | F17 — Client hydration POST re-authenticates + re-queries          | **High**     | Medium | –                        |
| 8   | F20 — Notification actions re-auth + revalidate 4 paths            | **Medium**   | Medium | –                        |
| 9   | F5 — `X-User-*` response headers leak to the browser               | **Medium**   | –      | Medium                   |
| 10  | F9/F8 — Pool size + `DIRECT_URL` via pooler; F18 conflict raw join | **Medium**   | Medium | –                        |

### E. What NOT To Change (already correct)

- Browser/server/middleware **client separation** (`lib/supabase/client.ts`, `server.ts`, `middleware.ts`).
- Service-role key used **only** in Server Actions, never sent to the client.
- `getUser()` (not `getSession()`) for all authorization.
- **Session-mode pooler (5432)** for Prisma `DATABASE_URL` — correct for prepared statements.
- `school-context.ts` isolation backbone and `requireRole` in every write path.
- **`$transaction`** usage in student/teacher/bulk attendance/exam writes.
- **16 parallel dashboard stats queries** (already parallelized — do not merge into one SQL blob).
- Batching + pagination from Loop 5 (attendance, exam results, teachers/messages/classes/staff).
- In-memory permission cache with explicit `resetPermissionsCache` invalidation.
- Existing schema **indexes** for dashboard/notification/fee/attendance queries.

### F. Exact Fix Order

**Phase 1 — Critical (do together, they share code):**

1. F6: replace module-global context with `React.cache()` (`getCurrentUser`/`getCurrentProfile`); delete `setRequestContext`/`clearRequestContext`.
2. F12/F13: enforce `schoolId` in all 4 unscoped aggregates; validate `selected_branch` cookie belongs to `profile.schoolId` before use.
3. F16: dedupe auth/profile via `cache()`; have the layout call `getCurrentProfile()` once (merge `validateDashboardAccess` profile query).

**Phase 2 — High:** 4. F3: remove Prisma query from `proxy.ts`; use session `app_metadata.role` for route redirection. 5. F5: change to `NextResponse.next({ request: { headers } })` upstream-forwarding. 6. F7: delete all `X-User-*` header reads; each protected server component uses `getCurrentUser()`. 7. F4: public routes skip `getUser()`. 8. F14: add `requireRole` to `/api/qr` and `/api/upload/homework`; rate-limit QR.

**Phase 3 — Medium:** 9. F17/F20: pass unread count from RSC render; revalidate only the current route. 10. F9/F8: `max:5` pool, `DIRECT_URL` → direct host. 11. F18: add conflict-join index; branch-scope the raw query. 12. F25: add `[PERF]` instrumentation; confirm region with `x-vercel-region`.

**Phase 4 — Optional:** 13. F24: sidebar collapsible groups (pure client work). 14. F2: service client without cookie handlers. 15. F22: reuse profile in `signin`. 16. Consider `unstable_cache` for slow aggregates (F19) only after instrumentation proves it is a bottleneck.

### G. Expected Performance (realistic)

Current measured baseline assumed: **5–6s** navigation.

- **After Phase 1 (Critical):** removes race condition + tenant leak and one duplicate auth+profile per page. Est. **~3.5–4.5s** (mostly correctness/security; modest speedup).
- **After Phase 2 (High):** middleware stops touching DB and public routes stop auth; portal pages drop redundant auth. Removes 1–2 auth round trips and 1–2 profile queries per request, and removes the per-Server-Action DB query. Est. **~1.5–2.5s**.
- **After Phase 3 (Medium):** kills the post-hydration auth POST, lowers pool pressure, fixes the expensive self-join. Est. **~1.0–1.5s** (with instrumentation verifying).
- **After Phase 4 (Optional):** sidebar/UX only; **no material perf change**.

Expected remaining floor is **~800ms–1.2s** given ~20–25ms region-matched DB queries but an inherent multi-KPI dashboard and ~1 auth call per navigation. **Do not expect "100ms"** — that is unrealistic for this architecture.

---

## Files Cited

- `proxy.ts`, `lib/supabase/middleware.ts`, `lib/supabase/server.ts`, `lib/supabase/client.ts`
- `lib/auth.ts`, `lib/dashboard-validation.ts`, `lib/school-context.ts`, `lib/permissions.ts`, `lib/prisma.ts`, `lib/menu-items.ts`, `lib/portal-menu-items.ts`, `lib/constants.ts`
- `app/(dashboard)/layout.tsx`, `app/(dashboard)/dashboard/page.tsx`, `app/(dashboard)/dashboard/dashboard-cards.tsx`
- `app/portal/layout.tsx`, `app/portal/page.tsx`, `app/portal/teacher/attendance/page.tsx`, `app/portal/teacher/students/[id]/page.tsx`, `app/portal/student/attendance/page.tsx`
- `actions/reports.actions.ts`, `actions/notification.actions.ts`, `actions/auth.actions.ts`, `actions/student.actions.ts`, `actions/teacher.actions.ts`
- `components/layout/sidebar.tsx`, `components/layout/branch-selector.tsx`, `components/layout/notifications-dropdown.tsx`
- `app/api/qr/route.ts`, `app/api/upload/homework/route.ts`
- `prisma/schema.prisma`, `prisma.config.ts`, `.env`
- `node_modules/next/dist/server/lib/router-utils/resolve-routes.js` (lines 410-462, header forwarding)
- `PERFORMANCE_AUDIT.md` (Loop 5 history, verified consistent with current code)
