# Performance Audit Report

**Date:** 2026-06-29
**Project:** School Management System (Next.js 16.2.9, React 19, Prisma 7, Supabase)
**Severity:** CRITICAL -- Pages frequently fail to load

---

## Executive Summary

The application suffers from **compounding authentication overhead**, **unbounded database queries**, **redundant data serialization**, and **missing Suspense/streaming boundaries**. Every protected page makes **3-8 sequential database round-trips** before rendering any HTML. The root cause of pages never loading is the **sequential auth chain in every layout and page** combined with **zero Suspense boundaries** -- a single slow query blocks the entire page.

**Estimated current page load:** 3-12 seconds (dashboard), 5-15 seconds (data-heavy pages like attendance, invoices)

---

## CRITICAL ISSUES (Pages Never Load)

### 1. Triple Authentication Chain (CRITICAL)

**Files:** `proxy.ts:6-53`, `app/(dashboard)/layout.tsx:14-57`, `app/(dashboard)/dashboard/page.tsx:8-42`

Every dashboard page execution:

```
proxy.ts          → supabase.auth.getUser()     [1 Supabase round-trip]
dashboard/layout  → createClient() + getUser()   [1 Supabase round-trip]
dashboard/page    → createClient() + getUser()   [1 Supabase round-trip]
lib/auth.ts       → createClient() + getUser()   [1 Supabase round-trip, via requireRole]
lib/auth.ts       → getCurrentProfile()          [1 Prisma query, calls getUser() AGAIN internally]
```

**Impact:** 4-5 `supabase.auth.getUser()` calls per page load. Each call is a network round-trip to Supabase Auth (~50-200ms each). That's **200-1000ms** just for auth before any data is fetched.

**Evidence:**
- `proxy.ts:45` -- calls `getUser()`
- `app/(dashboard)/layout.tsx:22` -- calls `getUser()` again
- `app/(dashboard)/dashboard/page.tsx:12` -- calls `getUser()` again
- `lib/auth.ts:8` -- `getCurrentUser()` calls `getUser()`
- `lib/auth.ts:35` -- `requireRole()` calls `requireAuth()` → `getCurrentUser()` → `getUser()`, then `getCurrentProfile()` → `getCurrentUser()` → `getUser()` AGAIN

**Estimated time saved:** 300-800ms per page

---

### 2. Sequential Auth + Data Fetching (CRITICAL)

**Files:** `app/(dashboard)/layout.tsx:14-57`, `app/(dashboard)/dashboard/page.tsx:8-42`

The dashboard layout runs these **sequentially**:

```typescript
// layout.tsx - ALL sequential
const supabase = await createClient()           // 1. Cookie access
const { data: { user } } = await supabase.auth.getUser()  // 2. Network call
const profile = await prisma.profile.findUnique(...)       // 3. DB query
const branches = await prisma.branch.findMany(...)         // 4. DB query
const permissions = await getPermissionsForRole(...)       // 5. DB query (first time loads all role+user perms)
```

Then the page runs more **sequentially**:

```typescript
// dashboard/page.tsx
const supabase = await createClient()           // 6. Duplicate cookie access
const { data: { user } } = await supabase.auth.getUser()  // 7. Duplicate network call
const profile = await prisma.profile.findUnique(...)       // 8. Duplicate DB query
const branch = await prisma.branch.findUnique(...)         // 9. DB query
const stats = await getDashboardStats(...)                 // 10-17. 8 parallel queries via Promise.all
```

**Total for dashboard:** 9 sequential operations + 8 parallel queries = **~17 DB/auth round-trips**

**Estimated time saved:** 500-2000ms

---

### 3. Zero Suspense Boundaries (CRITICAL)

**Files:** All 62 page.tsx files, `app/(dashboard)/layout.tsx`, `app/portal/layout.tsx`

There are **zero** `<Suspense>` boundaries in the entire application. Every page renders as a single blocking unit. If any data source is slow, the entire page stalls.

The only `loading.tsx` is at the root `app/loading.tsx` -- there are no route-segment-level loading states for any of the 62 pages.

**Impact:** A slow query on the attendance page blocks the entire page shell (sidebar, header) from rendering. Users see a blank screen.

**Estimated time saved:** Perceived load time reduced from 5-15s to 1-3s (streaming)

---

### 4. Dashboard Layout Redirect Chain (HIGH)

**File:** `app/(dashboard)/layout.tsx:36-46`

```typescript
if (PORTAL_ROLES.includes(profile.role)) {
  switch (profile.role) {
    case "STUDENT": redirect("/portal/student")
    case "PARENT": redirect("/portal/parent")
    case "TEACHER": redirect("/portal/teacher")
  }
}
```

This runs **after** the full auth chain (Supabase getUser + Prisma profile query + branch query + permissions query). A TEACHER user hitting `/dashboard` wastes all 5 queries before being redirected. Then the portal layout runs its own auth chain again.

**Impact:** ~500-1000ms wasted on redirect for portal roles accessing dashboard.

**Estimated time saved:** 500-1000ms for portal roles

---

## HIGH SEVERITY ISSUES

### 5. Unbounded findMany Queries (HIGH)

**100+ instances across the codebase.** Almost no `findMany` call uses `skip`/`take` pagination.

Critical examples:
- `app/(dashboard)/dashboard/assignments/page.tsx:12` -- `teacherAssignment.findMany()` with no limit, includes 5 related models
- `app/(dashboard)/dashboard/attendance/page.tsx:14` -- `class.findMany()` with no limit
- `actions/reports.actions.ts:180` -- `payment.findMany()` loads ALL payments for date range with includes
- `actions/reports.actions.ts:226` -- `feeInvoice.findMany()` loads ALL defaulters with includes
- `actions/reports.actions.ts:292` -- `exam.findMany()` loads ALL exams with 3 levels of includes
- `actions/reports.actions.ts:343` -- `expense.findMany()` loads ALL expenses for date range
- `app/(dashboard)/dashboard/timetable/page.tsx:35` -- `timetable.findMany()` loads ALL timetable slots with 5 includes

With 1000+ students, these queries return massive result sets.

**Impact:** Query time grows linearly with data. At 1000 students: 500ms+. At 10,000: 5s+.

**Estimated time saved:** 200-3000ms depending on data volume

---

### 6. requireRole Calls getUser() Twice (HIGH)

**File:** `lib/auth.ts:33-41`

```typescript
export async function requireRole(...roles: string[]) {
  const user = await requireAuth()       // calls getCurrentUser() → getUser()
  const profile = await getCurrentProfile() // calls getCurrentUser() → getUser() AGAIN, then prisma query
  ...
}
```

Every page that uses `requireRole()` (which is **every** dashboard page) makes **2 Supabase auth calls** instead of 1. Combined with the layout auth, that's **3+ auth calls per navigation**.

**Impact:** 100-400ms per page

**Estimated time saved:** 100-400ms per page

---

### 7. getPermissionsForRole Loads All Permissions on First Call (HIGH)

**File:** `lib/permissions.ts:188-217`

```typescript
async function loadPermissionsCache(): Promise<Map<string, Set<string>>> {
  if (permissionsCache) return permissionsCache
  const rolePerms = await prisma.rolePermission.findMany({ include: { permission: true } })
  const userPerms = await prisma.userPermission.findMany({ where: { granted: true }, include: { permission: true } })
  // ... builds in-memory cache
}
```

The first call after server start loads **ALL role permissions AND all user permissions** from the database. With 75 permissions × 11 roles + per-user overrides, this is a significant query.

This runs in the dashboard layout for every user. In serverless (e.g., Vercel), the cache resets on every cold start, meaning this runs on **every request** in production.

**Impact:** 200-500ms on cold starts, 0ms on warm cache (but cache doesn't persist in serverless)

**Estimated time saved:** 200-500ms per cold start

---

### 8. JSON.parse(JSON.stringify()) Serialization (HIGH)

**90 instances across the codebase.** Every page uses `JSON.parse(JSON.stringify(data))` to pass data from Server Components to Client Components.

Examples:
- `app/(dashboard)/dashboard/page.tsx:38` -- serializes profile
- `app/(dashboard)/dashboard/timetable/page.tsx:52-58` -- serializes 5 large objects
- `app/(dashboard)/dashboard/assignments/page.tsx:55-60` -- serializes 5 large objects
- `app/(dashboard)/dashboard/attendance/page.tsx:80-83` -- serializes 4 objects including student lists

For the attendance page with 50 students, this serializes all student data + enrollment data + class data + section data through JSON twice.

**Impact:** 50-200ms CPU time per page, plus increased memory pressure. For large datasets (fee reports, exam results), this can be 500ms+.

**Estimated time saved:** 50-200ms per page

---

### 9. Duplicate Profile Queries Across Layout + Page (HIGH)

**Files:** `app/(dashboard)/layout.tsx:28-30`, `app/(dashboard)/dashboard/page.tsx:18-20`

Both the layout and the page query `prisma.profile.findUnique({ where: { id: user.id } })` for the same user. The page also re-queries `supabase.auth.getUser()` which the layout already did.

The same pattern exists in portal pages:
- `app/portal/layout.tsx:25-27` -- queries profile
- `app/portal/teacher/page.tsx:16` -- queries profile AGAIN
- `app/portal/student/page.tsx:16` -- queries profile AGAIN
- `app/portal/parent/page.tsx:16` -- queries profile AGAIN

**Impact:** 50-100ms per page (redundant DB query)

**Estimated time saved:** 50-100ms per page

---

### 10. Fees Invoices Page -- Sequential After Promise.all (MEDIUM-HIGH)

**File:** `app/(dashboard)/dashboard/fees/invoices/page.tsx:32-61`

```typescript
const [invoices, total, students] = await Promise.all([...])  // parallel
// THEN sequential:
const academicSessions = await prisma.academicSession.findMany({...})  // separate query
```

The `academicSessions` query runs **after** the parallel block, adding unnecessary latency.

**Impact:** 50-100ms

---

## MEDIUM SEVERITY ISSUES

### 11. revalidatePath Over-Usage (MEDIUM)

**100+ revalidatePath calls across 24 action files.** Many actions call `revalidatePath` on paths that may not need revalidation, or revalidate overly broad paths.

Examples:
- `actions/notification.actions.ts:29` -- `revalidatePath("/dashboard")` for marking a single notification read
- `actions/auth.actions.ts:405` -- `revalidatePath("/", "layout")` on every login (revalidates entire app layout)
- `actions/auth.actions.ts:434` -- `revalidatePath("/", "layout")` on every logout

**Impact:** Excessive server-side cache invalidation causes more frequent full re-renders.

---

### 12. Audit Log on Every Auth Action (MEDIUM)

**File:** `lib/audit.ts:18-37`, `actions/auth.actions.ts`

Every login, logout, failed login, password reset, and invitation writes to `auditLog` **synchronously**. The audit write blocks the response.

The `signin` function (`auth.actions.ts:276-407`) runs up to **4 sequential Prisma operations** after a successful login:
1. `prisma.profile.findUnique` (get login profile)
2. `prisma.profile.update` (update last login)
3. `prisma.auditLog.create` (audit log)
4. `revalidatePath` + `redirect`

**Impact:** 100-300ms added to every auth action

---

### 13. Prisma Client Pool Configuration (MEDIUM)

**File:** `lib/prisma.ts:10`

```typescript
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
```

No pool configuration options are set. Default `pg.Pool` settings:
- `max`: 10 connections
- `idleTimeoutMillis`: 10000ms
- `connectionTimeoutMillis`: 0 (no timeout)

With 10+ sequential queries per page and multiple concurrent users, connection pool exhaustion is likely.

**Impact:** Connection contention under load, potential request timeouts

---

### 14. Missing Composite Indexes (MEDIUM)

**File:** `prisma/schema.prisma`

Missing indexes for common query patterns:
- `Profile.role` -- no standalone index (role-based lookups require full scan)
- `FeeInvoice.studentId + status` -- no composite index (defaulter queries filter on both)
- `Message.receiverId + isRead` -- no composite index (notification count queries)
- `Student.status` -- no standalone index (status filtering on student lists)
- `Student.createdAt` -- no index (ORDER BY createdAt DESC is slow)

---

### 15. next.config.ts Empty (MEDIUM)

**File:** `next.config.ts`

```typescript
const nextConfig: NextConfig = {
  /* config options here */
};
```

No optimizations configured:
- No `output: "standalone"` for smaller Docker builds
- No `compress: true` (should be default but verify)
- No `poweredByHeader: false` (minor security)
- No bundle analyzer
- No transpilePackages for problematic deps

---

### 16. BranchSelector Cookie-Based State (LOW-MEDIUM)

**File:** `components/layout/branch-selector.tsx:21-24`

```typescript
const cookie = document.cookie
  .split("; ")
  .find((row) => row.startsWith("selected_branch="))
```

Branch state is stored in a cookie and read on the client. Every branch change triggers `router.refresh()` which re-runs the entire server-side rendering pipeline for the current page.

**Impact:** Each branch switch = full page re-render with all DB queries

---

## LOW SEVERITY ISSUES

### 17. No loading.tsx for Sub-Routes (LOW)

Only `app/loading.tsx` exists. None of the 62 dashboard or portal pages have their own `loading.tsx`. This means no streaming/Suspense for sub-routes.

### 18. No error.tsx for Sub-Routes (LOW)

Only `app/error.tsx` exists. Individual pages don't have error boundaries, so an error in one page component crashes the entire layout.

### 19. Root Layout Loads Google Fonts (LOW)

**File:** `app/layout.tsx:6-14`

Two Google fonts are loaded on every page. This adds a render-blocking request to Google's CDN.

### 20. recharts Bundle Size (LOW)

**File:** `package.json:31`

`recharts` (^3.9.0) is a large charting library (~400KB gzipped). If only used on a few report pages, it should be dynamically imported.

---

## MEASUREMENT SUMMARY

### Slowest Pages (Estimated Current Load Time)

| Page | Queries | Auth Calls | Est. Load Time |
|------|---------|------------|----------------|
| `/dashboard` (main) | 17 (9 sequential + 8 parallel) | 5 | **5-12s** |
| `/dashboard/attendance` | 4-7 (conditional) | 4 | **4-10s** |
| `/dashboard/timetable` | 5 parallel + layout | 4 | **3-8s** |
| `/dashboard/assignments` | 5 parallel + layout | 4 | **3-8s** |
| `/dashboard/fees/invoices` | 4 parallel + 1 sequential + layout | 4 | **4-10s** |
| `/dashboard/exams/marks-entry` | 3-6 sequential + layout | 4 | **4-12s** |
| `/portal/teacher` | 7 (5 parallel + 2 sequential) | 4 | **3-8s** |
| `/portal/student` | 7 (5 parallel + 2 sequential) | 4 | **3-8s** |
| `/portal/parent` | 6 (3 parallel + 2 sequential) | 4 | **3-8s** |

### Slowest Queries

| Query | Location | Est. Time |
|-------|----------|-----------|
| `payment.findMany` with includes (fee collection report) | `reports.actions.ts:180` | 200-2000ms |
| `feeInvoice.findMany` with student includes (defaulters) | `reports.actions.ts:226` | 200-1500ms |
| `exam.findMany` with 3-level includes (exam performance) | `reports.actions.ts:292` | 200-1000ms |
| `permission.findMany` × 2 (cold start) | `permissions.ts:191-195` | 200-500ms |
| `teacherAssignment.findMany` with 5 includes (no limit) | `assignments/page.tsx:12` | 100-500ms |
| `timetable.findMany` with 5 includes (no limit) | `timetable/page.tsx:35` | 100-500ms |

### Duplicate Auth Calls Per Page Navigation

| Call | Location | Count |
|------|----------|-------|
| `supabase.auth.getUser()` | `proxy.ts:45` | 1 |
| `supabase.auth.getUser()` | `layout.tsx:22` | 1 |
| `supabase.auth.getUser()` | `page.tsx:12` (dashboard) | 1 |
| `supabase.auth.getUser()` | `lib/auth.ts:8` (via requireRole) | 1 |
| `supabase.auth.getUser()` | `lib/auth.ts:8` (via getCurrentProfile in requireRole) | 1 |
| **Total per dashboard page** | | **5** |
| **Total per portal page** | | **4** |

---

## OPTIMIZATION RECOMMENDATIONS (Priority Order)

### Priority 1: Eliminate Duplicate Auth (Est. -300-800ms)

**Fix `lib/auth.ts`:**

```typescript
// BEFORE (current) - 2 getUser() calls
export async function requireRole(...roles: string[]) {
  const user = await requireAuth()        // getUser()
  const profile = await getCurrentProfile() // getUser() AGAIN + prisma query
  ...
}

// AFTER - 0 extra getUser() calls
export async function requireRole(...roles: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  
  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile || !roles.includes(profile.role)) throw new Error("Forbidden")
  
  return { user, profile }
}
```

**Fix layout + page duplication:** Pass profile from layout to page via React context or shared query cache.

**After fix: ~2-5s** (down from 5-12s)

---

### Priority 2: Add Suspense Boundaries (Est. perceived -2-5s)

Wrap each page's data-fetching content in `<Suspense>` with a loading skeleton:

```typescript
// app/(dashboard)/dashboard/page.tsx
import { Suspense } from "react"

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  )
}
```

Add `loading.tsx` to every major route segment:
- `app/(dashboard)/dashboard/loading.tsx`
- `app/(dashboard)/dashboard/students/loading.tsx`
- `app/(dashboard)/dashboard/attendance/loading.tsx`
- etc.

**After fix: perceived load ~1-3s** (shell renders immediately, data streams in)

---

### Priority 3: Parallelize Layout Auth + Data (Est. -200-500ms)

```typescript
// BEFORE (current) - sequential
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
const profile = await prisma.profile.findUnique(...)
const branches = await prisma.branch.findMany(...)
const permissions = await getPermissionsForRole(...)

// AFTER - parallel where possible
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect("/login")

const [profile, permissions] = await Promise.all([
  prisma.profile.findUnique({ where: { id: user.id } }),
  // Defer permissions to not block layout
])
const branches = profile?.schoolId
  ? await prisma.branch.findMany({ ... })
  : []
```

**After fix: ~1.5-4s**

---

### Priority 4: Early Redirect for Portal Roles (Est. -500-1000ms)

Check role before expensive queries:

```typescript
// app/(dashboard)/layout.tsx
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect("/login")

// Quick role check BEFORE heavy queries
const profile = await prisma.profile.findUnique({
  where: { id: user.id },
  select: { role: true, schoolId: true, branchId: true, firstName: true, lastName: true }
})

if (PORTAL_ROLES.includes(profile.role)) {
  redirect(profile.role === "STUDENT" ? "/portal/student" : 
          profile.role === "PARENT" ? "/portal/parent" : "/portal/teacher")
}

// Only run branches + permissions for dashboard users
const [branches, permissions] = await Promise.all([...])
```

**After fix: ~1-3s for portal roles**

---

### Priority 5: Add Pagination to All List Queries (Est. -200-3000ms)

Every `findMany` that displays in a table should use `skip`/`take`:

```typescript
// BEFORE - loads ALL students
const students = await prisma.student.findMany({ where, include: {...} })

// AFTER - paginated
const [students, total] = await Promise.all([
  prisma.student.findMany({ where, include: {...}, skip: (page-1)*pageSize, take: pageSize }),
  prisma.student.count({ where }),
])
```

Many pages already have pagination logic but some don't. Apply consistently.

**After fix: ~1-3s** (constant time regardless of data size)

---

### Priority 6: Remove JSON.parse(JSON.stringify()) (Est. -50-200ms)

In Next.js App Router, you can pass Prisma objects directly to Client Components (they're automatically serialized). The `JSON.parse(JSON.stringify())` pattern is unnecessary and adds CPU overhead.

Replace:
```typescript
<SomeComponent data={JSON.parse(JSON.stringify(data))} />
```
With:
```typescript
<SomeComponent data={data} />
```

**After fix: ~1-3s** (slight improvement)

---

### Priority 7: Cache Permissions Properly for Serverless (Est. -200-500ms cold)

The in-memory `permissionsCache` resets on every cold start in serverless. Options:

1. Use `unstable_cache` from `next/cache`:
```typescript
import { unstable_cache } from "next/cache"

const getCachedPermissions = unstable_cache(
  async (role: Role) => {
    const cache = await loadPermissionsCache()
    return Array.from(cache.get(`role:${role}`) || [])
  },
  ["permissions"],
  { revalidate: 3600, tags: ["permissions"] }
)
```

2. Or use a global `Map` with a TTL that survives across requests in the same server instance.

**After fix: ~1-2.5s** (cold start improvement)

---

### Priority 8: Move Audit Logs to Fire-and-Forget (Est. -100-300ms)

```typescript
// BEFORE - blocks response
await logAuditEvent({...})

// AFTER - fire and forget (don't await)
logAuditEvent({...}).catch(console.error)
```

Or use a queue/buffer for audit writes.

**After fix: ~1-2.5s** (auth actions faster)

---

### Priority 9: Configure Prisma Pool (Est. prevents timeouts)

```typescript
// lib/prisma.ts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})
```

---

### Priority 10: Add Missing Database Indexes (Est. -50-500ms per query)

```sql
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_fee_invoices_student_status ON fee_invoices(student_id, status);
CREATE INDEX idx_messages_receiver_read ON messages(receiver_id, is_read);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_created_at ON students(created_at);
```

---

### Priority 11: Dynamic Import Heavy Libraries (Est. -100-400ms bundle)

```typescript
// Before
import { BarChart, Bar, XAxis, YAxis } from "recharts"

// After
import dynamic from "next/dynamic"
const RechartsBarChart = dynamic(() => import("recharts").then(mod => mod.BarChart), { ssr: false })
```

---

### Priority 12: Configure next.config.ts (Est. -50-100ms)

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  compress: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
}
```

---

## PROJECTED PAGE LOAD TIMES AFTER ALL FIXES

| Page | Current | After Fix | Improvement |
|------|---------|-----------|-------------|
| `/dashboard` | 5-12s | **0.8-1.5s** | 75-87% |
| `/dashboard/students` | 3-8s | **0.5-1s** | 80-87% |
| `/dashboard/attendance` | 4-10s | **0.6-1.2s** | 85-88% |
| `/dashboard/timetable` | 3-8s | **0.5-1s** | 83-87% |
| `/dashboard/fees/invoices` | 4-10s | **0.6-1.2s** | 85-88% |
| `/dashboard/exams/marks-entry` | 4-12s | **0.6-1.2s** | 85-90% |
| `/portal/teacher` | 3-8s | **0.4-0.8s** | 87-90% |
| `/portal/student` | 3-8s | **0.4-0.8s** | 87-90% |
| `/portal/parent` | 3-8s | **0.4-0.8s** | 87-90% |

---

## IMPLEMENTATION ORDER

1. **Fix `lib/auth.ts`** -- Eliminate duplicate `getUser()` calls (30 min)
2. **Fix layout + page auth duplication** -- Share profile via context (1 hour)
3. **Add `<Suspense>` boundaries** to all page components (2 hours)
4. **Add `loading.tsx`** to all route segments (1 hour)
5. **Parallelize layout queries** with `Promise.all` (30 min)
6. **Add early role redirect** in dashboard layout (15 min)
7. **Audit all `findMany` calls** for pagination (2 hours)
8. **Remove `JSON.parse(JSON.stringify())`** across all pages (1 hour)
9. **Fix permissions caching** for serverless (30 min)
10. **Fire-and-forget audit logs** (15 min)
11. **Configure Prisma pool** (15 min)
12. **Add missing indexes** (15 min)
13. **Dynamic import recharts** (30 min)
14. **Configure next.config.ts** (15 min)

**Total estimated implementation time: ~10 hours**
