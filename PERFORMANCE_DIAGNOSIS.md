# PERFORMANCE DIAGNOSIS REPORT

**Date:** 2026-07-07
**Project:** School Management System (Next.js 16 + Prisma 7 + Supabase)
**Scope:** Read-only audit — NO changes made

---

## EXECUTIVE SUMMARY

The application suffers from **5 critical performance patterns** that compound on every page load:

1. **Redundant authentication** — The same user+profile is fetched 2-4 times per request (middleware → layout → page → action)
2. **Sequential database queries** — Independent queries run with `await` instead of `Promise.all()`
3. **N+1 query patterns** — Loops execute individual DB queries instead of batch operations
4. **Missing database indexes** — 17+ foreign key columns lack indexes
5. **Heavy nested includes** — Prisma fetches entire related graphs when only a few fields are needed

**Estimated total round-trips per dashboard page load: 8-12 DB queries** (should be 3-4).

---

## TOP 20 SLOWEST FILES (by estimated query cost per invocation)

| Rank | File                                                    | Queries per call | Bottleneck                                                 |
| ---- | ------------------------------------------------------- | ---------------- | ---------------------------------------------------------- |
| 1    | `app/portal/page.tsx`                                   | 5-7              | Re-authenticates + nested student includes                 |
| 2    | `actions/parent-portal.actions.ts`                      | 9-12             | 9× auth calls, 4× parent lookups, massive nested includes  |
| 3    | `app/(dashboard)/dashboard/page.tsx`                    | 5-7              | Triple auth chain + sequential stat queries                |
| 4    | `actions/reports.actions.ts`                            | 6-10             | Heavy aggregation queries with in-memory reduction         |
| 5    | `actions/exam.actions.ts`                               | 5-8              | N+1 in transactions, sequential report card generation     |
| 6    | `app/(dashboard)/layout.tsx`                            | 4-5              | Sequential: auth → profile → branches → permissions        |
| 7    | `proxy.ts` (middleware)                                 | 2                | Supabase auth + Prisma profile on EVERY protected request  |
| 8    | `actions/admission.actions.ts`                          | 6-10             | N+1 in guardian loops, N+1 in monthly count                |
| 9    | `actions/fees.actions.ts`                               | 4-6              | In-memory aggregation of all payments                      |
| 10   | `actions/timetable.actions.ts`                          | 5                | 3 sequential conflict checks                               |
| 11   | `actions/attendance.actions.ts`                         | 3-5              | N+1 update loop in transaction                             |
| 12   | `actions/announcement.actions.ts`                       | 3-4              | N+1 in scheduled publish loop                              |
| 13   | `lib/auth.ts`                                           | 2-4              | Cascading requireAuth → getCurrentUser → getCurrentProfile |
| 14   | `app/portal/student/page.tsx`                           | 4-5              | Sequential auth → student → parallel counts                |
| 15   | `app/portal/parent/page.tsx`                            | 4-5              | Sequential auth → parent → parallel counts                 |
| 16   | `app/portal/teacher/page.tsx`                           | 4-5              | Sequential auth → teacher → parallel counts                |
| 17   | `app/(dashboard)/dashboard/students/page.tsx`           | 3-4              | Re-authenticates (layout already did)                      |
| 18   | `app/(dashboard)/dashboard/fees/invoices/page.tsx`      | 3-4              | Re-authenticates                                           |
| 19   | `actions/teacher-portal.actions.ts`                     | 4-6              | 10× getTeacherRecord calls, sequential queries             |
| 20   | `app/(dashboard)/dashboard/attendance/history/page.tsx` | 3-4              | Sequential queries, hard limit 100                         |

---

## TOP 20 SLOWEST QUERIES

| Rank | Query Location                    | Query                                                                 | Cost Reason                                                                                                                                                                                                |
| ---- | --------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `parent-portal.actions.ts:15-61`  | `prisma.parent.findFirst` with 7-level nested include                 | Fetches students → enrollments → class → section → session → attendance → invoices → payments → examResults → exam → examType → subject → reportCards → homeworkSubmissions → homework → subject → teacher |
| 2    | `reports.actions.ts:177-192`      | `prisma.payment.findMany` with invoice→student includes               | Fetches ALL payments in date range with full joins, then reduces in JS                                                                                                                                     |
| 3    | `reports.actions.ts:289-302`      | `prisma.exam.findMany` with results→student includes                  | Fetches ALL exams with ALL results, computes pass rates in JS                                                                                                                                              |
| 4    | `reports.actions.ts:251-266`      | `prisma.class.findMany` with sections→enrollments                     | Loads all enrollment records to count in JS instead of `_count`                                                                                                                                            |
| 5    | `fees.actions.ts:379-390`         | `prisma.feeInvoice.findMany` with full payment includes               | In-memory aggregation instead of `aggregate`/`groupBy`                                                                                                                                                     |
| 6    | `fees.actions.ts:197-200`         | `prisma.studentFeePlan.findMany` with `feeStructure: true`            | Full feeStructure include for every plan                                                                                                                                                                   |
| 7    | `proxy.ts:26-30`                  | `prisma.profile.findUnique` (select: role)                            | Runs on EVERY non-public request                                                                                                                                                                           |
| 8    | `auth.ts:12-14`                   | `prisma.profile.findUnique` (no select)                               | Fetches ALL columns, called 2-4× per request                                                                                                                                                               |
| 9    | `announcement.actions.ts:194-203` | `prisma.announcement.findMany` with `reads` subquery                  | Subquery per announcement for read status                                                                                                                                                                  |
| 10   | `attendance.actions.ts:148-153`   | N× `prisma.studentAttendance.update` in loop                          | N individual updates instead of `updateMany`                                                                                                                                                               |
| 11   | `exam.actions.ts:480-491`         | N× `prisma.examResult.update` in loop                                 | N individual updates instead of `updateMany`                                                                                                                                                               |
| 12   | `admission.actions.ts:706-724`    | 6× `prisma.admission.count` in loop                                   | Should be single `groupBy` with month truncation                                                                                                                                                           |
| 13   | `admission.actions.ts:357-378`    | N× `prisma.parent.create` + `studentParent.create` in loop            | Should use `createMany`                                                                                                                                                                                    |
| 14   | `announcement.actions.ts:296-305` | N× `prisma.announcement.update` in loop                               | Should use `updateMany`                                                                                                                                                                                    |
| 15   | `exam.actions.ts:542-588`         | 4 sequential: exam→result→classResults→upsert                         | Could parallelize independent lookups                                                                                                                                                                      |
| 16   | `timetable.actions.ts:31-81`      | 5 sequential: class→teacherConflict→classConflict→roomConflict→create | 3 conflict checks are independent                                                                                                                                                                          |
| 17   | `homework.actions.ts:137-145`     | `prisma.homework.findMany` with 5 includes                            | class, section, subject, teacher, _count                                                                                                                                                                   |
| 18   | `exam.actions.ts:289-301`         | `prisma.exam.findMany` with 5 includes                                | examType, class, subject, session, _count                                                                                                                                                                  |
| 19   | `student-portal.actions.ts`       | `getStudentRecord()` called 9×                                        | Same auth+profile+student chain repeated                                                                                                                                                                   |
| 20   | `teacher-portal.actions.ts`       | `getTeacherRecord()` called 10×                                       | Same auth+profile+teacher chain repeated                                                                                                                                                                   |

---

## DUPLICATE QUERIES

### Auth Chain Duplicates (per single page load)

```
Request lifecycle for /dashboard/students:

proxy.ts (middleware)
  → supabase.auth.getUser()          [CALL 1]
  → prisma.profile.findUnique()      [CALL 2]

app/(dashboard)/layout.tsx
  → supabase.auth.getUser()          [CALL 3 — DUPLICATE]
  → prisma.profile.findUnique()      [CALL 4 — DUPLICATE]
  → prisma.branch.findMany()         [CALL 5]
  → prisma.rolePermission.findMany() [CALL 6]
  → prisma.userPermission.findMany() [CALL 7]

app/(dashboard)/dashboard/students/page.tsx
  → supabase.auth.getUser()          [CALL 8 — DUPLICATE]
  → prisma.profile.findUnique()      [CALL 9 — DUPLICATE]
  → prisma.student.findMany()        [CALL 10 — actual data]
  → prisma.student.count()           [CALL 11 — actual data]
  → prisma.class.findMany()          [CALL 12 — actual data]
```

**Total: 12 DB calls. Only 5 are actual data queries. 7 are redundant auth.**

### Portal Duplicate Auth

```
Each portal page (student/parent/teacher) makes 9-10 independent auth calls
across its action functions. Example for parent portal:

parent-portal.actions.ts:
  → getChildAttendance()     → createClient() + getUser() + findUnique (parent)
  → getChildFees()           → createClient() + getUser() + findUnique (parent)
  → getChildResults()        → createClient() + getUser() + findUnique (parent)
  → getChildHomework()       → createClient() + getUser() + findUnique (parent)
  → getParentAnnouncements() → createClient() + getUser() + findUnique (parent)
  → getParentLeaveRequests() → createClient() + getUser() + findUnique (parent)
  → createParentLeaveRequest() → createClient() + getUser() + findUnique (parent)
  → getParentProfile()       → createClient() + getUser() + findUnique (parent)
  → updateParentProfile()     → createClient() + getUser() + findUnique (parent)

= 9 × 3 = 27 redundant DB calls across parent portal
```

### Permission Cache Miss Duplicate

```
lib/permissions.ts loadPermissionsCache():
  → prisma.rolePermission.findMany()   [sequential]
  → prisma.userPermission.findMany()   [sequential — could be parallel]

These are independent queries run sequentially.
```

---

## FILES CAUSING SLOW NAVIGATION

### Every Dashboard Page Navigation (8-12 round-trips)

| File                                                          | Impact       | Reason                                                             |
| ------------------------------------------------------------- | ------------ | ------------------------------------------------------------------ |
| `proxy.ts:20-30`                                              | **Critical** | 2 round-trips on EVERY request (Supabase auth + Prisma profile)    |
| `app/(dashboard)/layout.tsx:18-56`                            | **Critical** | 5 sequential round-trips (auth + profile + branches + permissions) |
| `app/(dashboard)/dashboard/page.tsx:9-35`                     | **High**     | 3 more round-trips re-doing auth + fetching stats                  |
| Every child page (`students/page.tsx`, `fees/page.tsx`, etc.) | **High**     | Each calls `requireRole()` which re-does auth (2 round-trips)      |

### Portal Navigation

| File                                | Impact       | Reason                                          |
| ----------------------------------- | ------------ | ----------------------------------------------- |
| `app/portal/layout.tsx`             | **High**     | Auth chain in layout                            |
| `app/portal/page.tsx`               | **High**     | Auth chain + role redirect                      |
| `app/portal/student/page.tsx`       | **High**     | Auth chain + student lookup + 5 parallel counts |
| `actions/parent-portal.actions.ts`  | **Critical** | 27 redundant auth calls across functions        |
| `actions/student-portal.actions.ts` | **High**     | 9 redundant auth calls                          |
| `actions/teacher-portal.actions.ts` | **High**     | 10 redundant auth calls                         |

---

## DASHBOARD BOTTLENECKS

### 1. Sequential Layout Rendering

**File:** `app/(dashboard)/layout.tsx:18-56`

```
await supabase.auth.getUser()        // 1. Supabase auth (network)
await prisma.profile.findUnique()    // 2. PostgreSQL query
→ if PORTAL_ROLES → redirect        // 3. Check
await prisma.branch.findMany()       // 4. PostgreSQL query (depends on profile.schoolId)
await getPermissionsForRole()        // 5. PostgreSQL query (depends on profile.role)
→ <Sidebar profile={profile} .../>  // Render only after all 5 complete
```

**Problem:** Branch fetch and permission fetch are independent of each other but run sequentially after profile.

### 2. Dashboard Stats

**File:** `app/(dashboard)/dashboard/page.tsx:35` → `actions/reports.actions.ts:33-84`

`getDashboardStats` correctly uses `Promise.all` for 8 parallel queries — **this is good**. But it calls `requireRole()` internally, adding 2 more auth round-trips.

### 3. No Streaming/Suspense

- Only `app/(dashboard)/loading.tsx` exists at the top level
- No sub-routes have `loading.tsx` files
- No `<Suspense>` boundaries around async content in any page
- `<NotificationsDropdown>` fires a `useEffect` API call with no loading state

### 4. Dashboard Cards as Client Component

**File:** `app/(dashboard)/dashboard/dashboard-cards.tsx`

Marked `"use client"` but has zero client-side interactivity — purely presentational. Adds to client bundle unnecessarily.

---

## AUTHENTICATION BOTTLENECKS

### The Double-Auth Problem

| Step      | Location           | What Happens                                                   | Round-trips                      |
| --------- | ------------------ | -------------------------------------------------------------- | -------------------------------- |
| 1         | `proxy.ts:20-30`   | Middleware: `getUser()` + `profile.findUnique()`               | 2                                |
| 2         | `layout.tsx:18-21` | Layout: `getUser()` + `profile.findUnique()`                   | 2 (DUPLICATE)                    |
| 3         | `page.tsx:9-11`    | Page: `getUser()` + `profile.findUnique()` via `requireRole()` | 2 (DUPLICATE)                    |
| **Total** |                    |                                                                | **6 round-trips for auth alone** |

### `requireRole()` Cost Breakdown

**File:** `lib/auth.ts`

```
requireRole(...roles)
  → requireAuth()
    → getCurrentUser()
      → createClient()         // cookies() async call
      → supabase.auth.getUser() // NETWORK: Supabase auth server
    → throw if no user
  → prisma.profile.findUnique() // NETWORK: PostgreSQL
  → throw if role not in roles
  → return { user, profile }
```

**Cost:** 2 network round-trips minimum. No caching. No column selection (fetches ALL profile fields).

### `getCurrentProfile()` Never Reuses `getCurrentUser()`

**File:** `lib/auth.ts:11-15`

```
getCurrentProfile()
  → getCurrentUser()       // fetches user
  → prisma.profile.findUnique({ where: { id: user.id } }) // fetches profile
```

If called after `requireAuth()`, the user is fetched again. No request-scoped caching.

### No Session/JWT Caching of Role

The middleware queries `profile.role` from PostgreSQL on every request. Role rarely changes. Could be stored in Supabase JWT or session cookie to eliminate the Prisma query entirely.

---

## DATABASE BOTTLENECKS

### Missing Indexes (17+ foreign keys)

**Critical (high-traffic tables):**

| Model               | Missing Index                           | Query Pattern                   |
| ------------------- | --------------------------------------- | ------------------------------- |
| `StudentParent`     | `@@index([parentId])`                   | "Get all students for a parent" |
| `FeeInvoice`        | `@@index([studentId, status])`          | "Pending invoices for student"  |
| `FeeInvoice`        | `@@index([academicSessionId])`          | "Invoices for a session"        |
| `Admission`         | `@@index([academicSessionId])`          | "Admissions for a session"      |
| `Admission`         | `@@index([appliedClassId])`             | "Admissions for a class"        |
| `Exam`              | `@@index([classId, academicSessionId])` | "Exams for class in session"    |
| `Exam`              | `@@index([examTypeId])`                 | "Exams of a type"               |
| `StudentEnrollment` | `@@index([classId])`                    | "Enrollments for a class"       |
| `StudentFeePlan`    | `@@index([feeStructureId])`             | "Students on a fee structure"   |
| `StudentFeePlan`    | `@@index([academicSessionId])`          | "Fee plans for a session"       |
| `StaffAttendance`   | `@@index([date])`                       | "Attendance report for a day"   |

**Medium (reporting/query-heavy):**

| Model          | Missing Index                  | Query Pattern                    |
| -------------- | ------------------------------ | -------------------------------- |
| `Payment`      | `@@index([recordedBy])`        | "Payments by a user"             |
| `Expense`      | `@@index([recordedBy])`        | "Expenses by a user"             |
| `Announcement` | `@@index([classId])`           | "Class-specific announcements"   |
| `Announcement` | `@@index([sectionId])`         | "Section-specific announcements" |
| `Homework`     | `@@index([classId, dueDate])`  | "Upcoming homework for class"    |
| `BookIssue`    | `@@index([studentId, status])` | "Currently issued books"         |

**Low (permission lookups):**

| Model            | Missing Index               | Query Pattern                    |
| ---------------- | --------------------------- | -------------------------------- |
| `RolePermission` | `@@index([permissionId])`   | "Which roles have a permission"  |
| `UserPermission` | `@@index([permissionId])`   | "Which users have a permission"  |
| `LeaveRequest`   | `@@index([approvedBy])`     | "Leaves approved by a user"      |
| `FeeInvoiceItem` | `@@index([feeStructureId])` | "Invoices using a fee structure" |

### Heavy Nested Includes

| File                             | Include Depth | Fields Fetched                                                                                                                                                                                          |
| -------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parent-portal.actions.ts:15-61` | 7 levels      | parent → students → enrollments → class/section/session → attendance → invoices → payments → examResults → exam → examType → subject → reportCards → homeworkSubmissions → homework → subject → teacher |
| `reports.actions.ts:177-192`     | 3 levels      | payment → invoice → student (ALL payments in date range)                                                                                                                                                |
| `reports.actions.ts:289-302`     | 3 levels      | exam → results → student (ALL exams with ALL results)                                                                                                                                                   |
| `fees.actions.ts:379-390`        | 3 levels      | feeInvoice → payments → student (ALL invoices)                                                                                                                                                          |

### In-Memory Aggregation Instead of SQL

| File                         | What It Does                                        | Should Use                              |
| ---------------------------- | --------------------------------------------------- | --------------------------------------- |
| `reports.actions.ts:177-192` | Fetches ALL payments, reduces in JS for totals      | `prisma.payment.aggregate()` or raw SQL |
| `reports.actions.ts:289-302` | Fetches ALL exam results, computes pass rates in JS | SQL `COUNT` with `CASE WHEN`            |
| `reports.actions.ts:251-266` | Loads all enrollment records to count in JS         | `_count` aggregation                    |
| `fees.actions.ts:379-390`    | Fetches all payments to compute collection totals   | `groupBy` + `aggregate`                 |

---

## MIDDLEWARE BOTTLENECKS

**File:** `proxy.ts`

| Issue                      | Impact       | Details                                                                             |
| -------------------------- | ------------ | ----------------------------------------------------------------------------------- |
| **2 DB calls per request** | **Critical** | `supabase.auth.getUser()` + `prisma.profile.findUnique()` on every non-public route |
| **Dynamic imports**        | **Medium**   | `await import("@/lib/prisma")` and `await import("@supabase/ssr")` on every request |
| **No profile caching**     | **High**     | `profile.role` queried from DB every time — rarely changes                          |
| **Redundant with layout**  | **Critical** | Layout re-does the exact same auth chain                                            |
| **O(n) role check**        | **Low**      | Iterates all 20+ route entries on every request                                     |

**Estimated middleware latency:** 100-300ms per request (2 network round-trips).

---

## CLIENT vs SERVER COMPONENT ISSUES

| File                  | Current        | Should Be        | Reason                                                  |
| --------------------- | -------------- | ---------------- | ------------------------------------------------------- |
| `dashboard-cards.tsx` | `"use client"` | Server Component | Zero client interactivity — purely presentational cards |
| `dashboard-cards.tsx` | N/A            | Add `<Suspense>` | Stats should stream in after shell renders              |

**All other client components are appropriately marked** — they use `useState`, `useEffect`, `useActionState`, `useRouter`, or `useSearchParams`.

---

## MISSING LOADING STATES / SUSPENSE

| Location                                   | Issue                                           |
| ------------------------------------------ | ----------------------------------------------- |
| `app/(dashboard)/loading.tsx`              | Only top-level loading state exists             |
| `app/(dashboard)/dashboard/students/`      | No `loading.tsx`                                |
| `app/(dashboard)/dashboard/fees/`          | No `loading.tsx`                                |
| `app/(dashboard)/dashboard/attendance/`    | No `loading.tsx`                                |
| `app/(dashboard)/dashboard/exams/`         | No `loading.tsx`                                |
| `app/(dashboard)/dashboard/homework/`      | No `loading.tsx`                                |
| `app/(dashboard)/dashboard/announcements/` | No `loading.tsx`                                |
| `app/(dashboard)/dashboard/staff/`         | No `loading.tsx`                                |
| `app/(dashboard)/dashboard/teachers/`      | No `loading.tsx`                                |
| `app/(dashboard)/dashboard/classes/`       | No `loading.tsx`                                |
| `app/(dashboard)/dashboard/reports/`       | No `loading.tsx`                                |
| `app/portal/student/`                      | No `loading.tsx`                                |
| `app/portal/parent/`                       | No `loading.tsx`                                |
| `app/portal/teacher/`                      | No `loading.tsx`                                |
| All dashboard pages                        | No `<Suspense>` boundaries around async content |

---

## N+1 QUERY PROBLEMS

| File                       | Lines   | Pattern                                                                                      | Fix                                          |
| -------------------------- | ------- | -------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `attendance.actions.ts`    | 148-153 | `for (item of toUpdate) { await tx.studentAttendance.update() }`                             | `updateMany` with `{ id: { in: ids } }`      |
| `exam.actions.ts`          | 480-491 | `for (item of toSubmit) { await tx.examResult.update() }`                                    | `updateMany` with `{ id: { in: ids } }`      |
| `announcement.actions.ts`  | 296-305 | `for (a of scheduled) { await prisma.announcement.update() }`                                | `updateMany` with `{ id: { in: ids } }`      |
| `admission.actions.ts`     | 357-378 | `for (g of guardians) { await prisma.parent.create(); await prisma.studentParent.create() }` | `createMany` for both tables                 |
| `admission.actions.ts`     | 706-724 | `for (i of 0..5) { await prisma.admission.count() }`                                         | Single `groupBy` with month truncation       |
| `parent-portal.actions.ts` | 101-208 | 4× `prisma.parent.findFirst` with identical student verification                             | Single parent lookup shared across functions |

---

## SEQUENTIAL ASYNC THAT SHOULD USE Promise.all()

| File                                 | Lines   | Sequential Operations                                            | Independence                                         |
| ------------------------------------ | ------- | ---------------------------------------------------------------- | ---------------------------------------------------- |
| `lib/permissions.ts`                 | 34-35   | `rolePermission.findMany()` → `userPermission.findMany()`        | Independent                                          |
| `timetable.actions.ts`               | 31-81   | class lookup → teacher conflict → class conflict → room conflict | 3 conflict checks are independent                    |
| `exam.actions.ts`                    | 542-588 | exam lookup → result lookup → class results → report card upsert | exam + result lookups could be parallel              |
| `auth.actions.ts`                    | 67-84   | `profile.findUnique` → `listUsers`                               | Independent                                          |
| `app/(dashboard)/layout.tsx`         | 18-56   | auth → profile → branches → permissions                          | branches + permissions are independent after profile |
| `app/(dashboard)/dashboard/page.tsx` | 9-35    | auth → profile → cookies → branch → stats                        | auth must precede profile, but rest can parallelize  |

---

## ESTIMATED IMPACT SUMMARY

### High Impact (Fix First)

| Issue                                                        | Files                                          | Estimated Latency Savings              |
| ------------------------------------------------------------ | ---------------------------------------------- | -------------------------------------- |
| **Redundant auth chain** (middleware + layout + page)        | `proxy.ts`, `layout.tsx`, `auth.ts`, all pages | **200-600ms** per page load            |
| **Missing indexes** (17+ foreign keys)                       | `prisma/schema.prisma`                         | **50-200ms** per query on unindexed FK |
| **N+1 in loops** (attendance, exam, announcement, admission) | 5 action files                                 | **100-500ms** per bulk operation       |
| **Heavy nested includes** (parent portal)                    | `parent-portal.actions.ts`                     | **300-1000ms** per portal load         |

### Medium Impact

| Issue                                     | Files                                   | Estimated Latency Savings       |
| ----------------------------------------- | --------------------------------------- | ------------------------------- |
| **In-memory aggregation** (reports, fees) | `reports.actions.ts`, `fees.actions.ts` | **100-400ms** per report        |
| **Sequential conflict checks**            | `timetable.actions.ts`                  | **50-150ms** per timetable save |
| **Permission cache race**                 | `lib/permissions.ts`                    | **50-200ms** on cold start      |
| **Missing Suspense/loading.tsx**          | 14+ route directories                   | **Perceived** 200-500ms faster  |
| **Dashboard cards as client component**   | `dashboard-cards.tsx`                   | **20-50ms** bundle reduction    |

### Low Impact

| Issue                          | Files                 | Estimated Latency Savings |
| ------------------------------ | --------------------- | ------------------------- |
| `JSON.parse(JSON.stringify())` | ~15 pages             | **5-10ms** per occurrence |
| Unnecessary revalidation       | `auth.actions.ts:423` | **10-30ms**               |
| O(n) role route check          | `proxy.ts`            | **1-5ms**                 |

---

## EXACT FILES THAT NEED OPTIMIZATION

### Tier 1 — Critical (Fix Immediately)

| #   | File                                | Issues to Fix                                                                                  |
| --- | ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | `proxy.ts`                          | Eliminate redundant profile query; cache role in session/JWT                                   |
| 2   | `lib/auth.ts`                       | Request-scoped caching for user+profile; add `select` to queries; deduplicate `createClient()` |
| 3   | `app/(dashboard)/layout.tsx`        | Parallelize branches + permissions; pass auth context to children                              |
| 4   | `prisma/schema.prisma`              | Add 17+ missing indexes                                                                        |
| 5   | `actions/parent-portal.actions.ts`  | Share auth context; reduce nested includes; batch queries                                      |
| 6   | `actions/student-portal.actions.ts` | Share auth context across functions                                                            |
| 7   | `actions/teacher-portal.actions.ts` | Share auth context across functions                                                            |

### Tier 2 — High (Fix Soon)

| #   | File                              | Issues to Fix                                                                          |
| --- | --------------------------------- | -------------------------------------------------------------------------------------- |
| 8   | `actions/attendance.actions.ts`   | Replace N+1 update loop with `updateMany`                                              |
| 9   | `actions/exam.actions.ts`         | Replace N+1 update loop; parallelize report card generation                            |
| 10  | `actions/announcement.actions.ts` | Replace N+1 update loop with `updateMany`                                              |
| 11  | `actions/admission.actions.ts`    | Replace N+1 guardian creation with `createMany`; replace N+1 count loop with `groupBy` |
| 12  | `actions/reports.actions.ts`      | Replace in-memory aggregation with SQL `aggregate`/`groupBy`                           |
| 13  | `actions/fees.actions.ts`         | Replace in-memory aggregation with SQL                                                 |
| 14  | `actions/timetable.actions.ts`    | Parallelize 3 conflict checks with `Promise.all`                                       |
| 15  | `lib/permissions.ts`              | Parallelize cache load; add promise deduplication                                      |

### Tier 3 — Medium (Fix When Possible)

| #   | File                                            | Issues to Fix                                 |
| --- | ----------------------------------------------- | --------------------------------------------- |
| 16  | `app/(dashboard)/dashboard/dashboard-cards.tsx` | Convert to Server Component                   |
| 17  | 14+ page directories                            | Add `loading.tsx` files                       |
| 18  | All dashboard pages                             | Add `<Suspense>` boundaries                   |
| 19  | `app/(dashboard)/layout.tsx`                    | Add `<Suspense>` around sidebar/notifications |
| 20  | `app/portal/student/page.tsx`                   | Parallelize auth → data fetch                 |
| 21  | `app/portal/parent/page.tsx`                    | Parallelize auth → data fetch                 |
| 22  | `app/portal/teacher/page.tsx`                   | Parallelize auth → data fetch                 |

---

## ROUTE MAP: Query Count Per Navigation

| Route                      | Middleware | Layout | Page | Action          | **Total** |
| -------------------------- | ---------- | ------ | ---- | --------------- | --------- |
| `/dashboard`               | 2          | 5      | 3    | 8 (Promise.all) | **18**    |
| `/dashboard/students`      | 2          | 5      | 4    | 0               | **11**    |
| `/dashboard/fees/invoices` | 2          | 5      | 4    | 0               | **11**    |
| `/dashboard/fees/payments` | 2          | 5      | 2    | 0               | **9**     |
| `/dashboard/attendance`    | 2          | 5      | 4    | 0               | **11**    |
| `/dashboard/exams`         | 2          | 5      | 3    | 0               | **10**    |
| `/dashboard/homework`      | 2          | 5      | 3    | 0               | **10**    |
| `/portal/student`          | 2          | 0      | 4    | 5 (counts)      | **11**    |
| `/portal/parent`           | 2          | 3      | 4    | 0               | **9**     |
| `/portal/teacher`          | 2          | 3      | 4    | 0               | **9**     |

**Average: 10.8 DB round-trips per page load. Target: 3-4.**

---

_End of Performance Diagnosis. No code was modified._
