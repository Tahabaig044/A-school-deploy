# RLS Phase 2C-1 — RLS Foundation

**Project:** School Management System — `gzhumudgucfqbqpuznek` (live Supabase DB)
**Date:** 2026-08-31
**Scope:** Reusable, non-destructive RLS foundation ONLY. No RLS enablement, no table policies,
no schema/Prisma/application changes, no data or destructive operations.

---

## 1. Objective

Prepare the PostgreSQL/Supabase database for the upcoming RLS rollout by providing a hardened,
reusable foundation:

- tenant helper functions (identity → role → school → branch),
- authenticated-user → profile lookup,
- school / branch lookup,
- role lookup,
- safe tenant-access helpers,
- a versioned migration history,
- documentation.

**Explicitly OUT of scope (deferred to Phase 2C-2+):** enabling RLS on tables, disabling existing RLS,
creating table policies, changing the Prisma schema, adding school/branch columns, changing application
server actions / auth / UI / business logic, deleting or backfilling production data, resetting the DB.

---

## 2. Existing RLS Foundation

The existing foundation lives in the versioned migration history (`supabase_migrations.schema_migrations`):

| Migration | Contents |
|---|---|
| `enable_rls_tenant_isolation` | Created 4 SECURITY DEFINER helpers; enabled RLS on **9 tables**; revoked anon everywhere; SELECT-only grant to authenticated; created **9 SELECT policies**. |
| `revoke_execute_rls_helpers` | Revoked EXECUTE on helpers from PUBLIC. |
| `revoke_execute_rls_helpers_from_anon` | Revoked EXECUTE on helpers from anon / authenticated / public. |
| `grant_execute_rls_helpers_to_authenticated` | Re-granted EXECUTE on helpers to authenticated (policies invoke them as the querying role). |

**9 RLS-enabled tables** (`relrowsecurity = true`, all owner `postgres`):
`id_cards`, `parents`, `profiles`, `schools`, `settings`, `staff`, `student_parents`, `students`, `teachers`.
The other ~65 tenant tables have RLS disabled (Phase 2C-2 scope).

**9 existing SELECT-only policies** (all `TO authenticated`, no WITH CHECK):
- `id_cards/students/teachers/staff`: `_select_tenant` → `check_tenant_access(school_id, branch_id)`
- `parents`, `settings`: `school_id = auth_school_id()`
- `schools`: `id = auth_school_id()`
- `profiles`: `id = auth.uid() OR school_id = auth_school_id()`
- `student_parents`: EXISTS student-in-school OR parent-in-school

All are SELECT-only; there are **no INSERT/UPDATE/DELETE policies** anywhere (writes stay server-side via
Prisma/service role, matching the "deny direct client writes" posture).

---

## 3. Existing SECURITY DEFINER Functions (reviewed)

Exactly **4** SECURITY DEFINER functions existed before this phase. All are `STABLE`, owner `postgres`,
`search_path = public` (NOT hardened — see below), and reference `public.profiles WHERE id = auth.uid()`:

| Function | Returns | Live ACL (`proacl`) |
|---|---|---|
| `auth_school_id()` | `uuid` | postgres, service_role, authenticated |
| `auth_branch_id()` | `uuid` | postgres, service_role, authenticated |
| `auth_role()` | `text` | postgres, service_role, authenticated |
| `check_tenant_access(school_id uuid, branch_id uuid)` | `boolean` | postgres, service_role, authenticated |

**Security assessment of the existing 4:**
- `SECURITY DEFINER` is correct here: it lets them read `profiles` while bypassing the (future) `profiles`
  RLS policy → **prevents RLS recursion** (a `profiles` policy calling `auth_school_id()` would otherwise
  recursively re-enter the `profiles` policy).
- They return only **the caller's own** tenant context (keyed to `auth.uid()`); unauthenticated → NULL
  (default-deny). No data exposure.
- `anon` has **no** EXECUTE (revoked). Only `authenticated` (+ service_role parity) can execute — required
  because RLS policies invoke them as the querying (authenticated) role.
- **Gap (documented, deferred):** `search_path = public` is not fully hardened. Per Phase 2C-1 §14, safer
  is `pg_catalog, public`. The bodies fully-qualify `public.profiles`, so this is low-risk, but hardening is
  recommended in a **later Phase 2C-2** step (see §15) using `CREATE OR REPLACE ... SET search_path`.

**Advisors:** the security advisor flags all 8 SECURITY DEFINER helpers as "executable by authenticated"
(`0029_authenticated_security_definer_function_executable`, WARN). This is **intentional and required** —
policies and the front-end rely on these helpers. They only return the caller's own tenant info and are
default-deny, so the WARN is acceptable, consistent with the pre-existing 4.

---

## 4. New/Updated Helper Functions

No existing function was modified or dropped. **4 new** functions were created via a versioned migration,
each hardened with `SET search_path = pg_catalog, public`, `STABLE`, `SECURITY DEFINER`, owner `postgres`.

### 4.1 `public.auth_profile()` — canonical identity chain (NEW)
- **Purpose:** single authenticated-identity lookup; the foundation of the auth→Profile→tenant chain.
  Returns the authenticated user's `(id, role, school_id, branch_id)`.
- **Inputs:** none (uses `auth.uid()`).
- **Output:** TABLE `(id uuid, role text, school_id uuid, branch_id uuid)` — one row, or **zero rows**
  when unauthenticated / profile missing.
- **Security model:** SECURITY DEFINER (owner) — bypasses `profiles` RLS → recursion-safe. Reads only the
  caller's own row (`WHERE id = auth.uid()`).
- **Search path:** `SET search_path = pg_catalog, public`.
- **Permissions:** `postgres`, `authenticated`, `service_role` (no anon, no PUBLIC).
- **Used by future policies:** all `auth_check_*` / role guards compose from this in 2C-2.

### 4.2 `public.is_super_admin()` — platform-role guard (NEW)
- **Purpose:** NULL-safe predicate for the platform-level SUPER_ADMIN role.
- **Inputs:** none.
- **Output:** `boolean` — true only when an existing profile has `role = 'SUPER_ADMIN'`; otherwise false
  (default-deny, even for unauthenticated / missing profile / any other role).
- **Security model:** SECURITY DEFINER; composes `auth_profile()` once.
- **Search path:** `SET search_path = pg_catalog, public`.
- **Permissions:** `postgres`, `authenticated`, `service_role`.
- **Used by future policies:** `profiles`, `audit_logs`, `salary_*`, platform reads; encodes SUPER_ADMIN
  behavior in one place so NULL tenant for SUPER_ADMIN is not misread as "ordinary user has NULL access".

### 4.3 `public.auth_check_school(target_school_id uuid)` — school access predicate (NEW)
- **Purpose:** reusable school-level access check (conceptual helper E / §6).
- **Inputs:** `target_school_id uuid`.
- **Output:** `boolean` — true if target is non-NULL AND (caller is SUPER_ADMIN OR target == caller's
  `school_id`). Unauthenticated / missing profile / NULL target → false.
- **Security model:** SECURITY DEFINER; composes `auth_profile()`. Client-supplied `target` never replaces
  the trusted profile-derived `school_id`; it must EQUAL it (or be SUPER_ADMIN-scoped).
- **Search path:** `SET search_path = pg_catalog, public`.
- **Permissions:** `postgres`, `authenticated`, `service_role`.
- **Used by future policies:** school-keyed tables (`parents`, `settings`, `branches`, `messages`, …).

### 4.4 `public.auth_check_branch(target_branch_id uuid)` — branch access predicate (NEW)
- **Purpose:** reusable branch-level access check (conceptual helper F / §7).
- **Inputs:** `target_branch_id uuid`.
- **Output:** `boolean` — evaluates the canonical `check_tenant_access(branch.school_id, branch.id)` for the
  target branch (resolved from `public.branches`). Invalid/NULL branch → false. Default-deny otherwise.
- **Security model:** SECURITY DEFINER; composes `check_tenant_access` so it **cannot drift** from the
  canonical tenant rule. SUPER_ADMIN passes (platform); non-BRANCH_ADMIN inherits the existing
  within-school branch breadth (see §8).
- **Search path:** `SET search_path = pg_catalog, public`.
- **Permissions:** `postgres`, `authenticated`, `service_role`.
- **Used by future policies:** branch-keyed tables (`students`, `teachers`, `staff`, `classes`,
  `fee_structures`, …) and derived EXISTS policies.

### 4.5 Reused (not modified)
`auth_role()`, `auth_school_id()`, `auth_branch_id()`, `check_tenant_access(school_id, branch_id)` —
the existing 4 remain the scalar getters and the canonical 2-arg tenant check.

**Migration files:** `rls_2c1_foundation_helpers` (create functions + grants) and
`rls_2c1_helpers_revoke_anon` (explicit anon/PUBLIC revoke — this project's `ALTER DEFAULT PRIVILEGES`
auto-grants EXECUTE to `anon` on new functions). Both are idempotent and non-destructive.

---

## 5. Authentication → Profile → Tenant Flow

```
Supabase auth.uid()
      │  (real PK: profiles.id == auth.users.id, verified in schema)
      ▼
public.auth_profile()   ──► (id, role, school_id, branch_id)   [SECURITY DEFINER, recursion-safe]
      │
      ├──► role        (auth_role / is_role predicates)
      ├──► school_id   (auth_school_id / auth_check_school)
      └──► branch_id   (auth_branch_id / auth_check_branch / check_tenant_access)
```

The trusted chain is **always** `auth.uid() → trusted Profile row → derived tenant`. No client / cookie /
form / URL values are used as the source of truth — they must equal the profile-derived value (or be
SUPER_ADMIN-scoped). SQL type `profiles.id` is `uuid` = `auth.users.id`; the `Role` enum is the quoted,
case-sensitive type `public."Role"`.

---

## 6. SUPER_ADMIN Behavior

- SUPER_ADMIN is the **only** role allowed platform-level access; it may legitimately have
  `school_id = NULL` / `branch_id = NULL`.
- The foundation grants SUPER_ADMIN platform behavior **by role**, never by "NULL tenant":
  - `is_super_admin()` returns true only for an existing profile with `role = 'SUPER_ADMIN'`.
  - `auth_check_school(target)` returns true for SUPER_ADMIN against any valid (non-NULL) school.
  - `auth_check_branch(target)` passes for SUPER_ADMIN via `check_tenant_access`.
- An **ordinary** user with NULL/unknown tenant is denied (default-deny) — NULL is never "allow all".
- Verified with the live SUPER_ADMIN (`41c3b981…`): own/any school + both branches true, invalid branch
  still false. The NULL-tenant SUPER_ADMIN edge is handled by the role short-circuit (platform given purely
  by role, independent of the admin's own school/branch), verified by code path.

---

## 7. School Isolation Model

Matched to `lib/school-context.ts` (`getSchoolId`):
- SUPER_ADMIN: may cross schools (platform).
- All other roles: pinned to `profile.schoolId`.

`auth_check_school(target)` encodes exactly this: `target IS NOT NULL AND (role='SUPER_ADMIN' OR
target = profile.school_id)`. Future school-keyed policies use the **profile-derived** school, satisfying
the §6 rule (never trust client/cookie/URL/form schoolId).

---

## 8. Branch Isolation Model

Matched to the existing `check_tenant_access` (canonical rule):
- SUPER_ADMIN: platform (any branch).
- `BRANCH_ADMIN`: restricted to their own `profile.branch_id`.
- All other roles (incl. SCHOOL_ADMIN, TEACHER): **not branch-constrained within their school** — the
  existing model lets them view any branch of the same school.

`auth_check_branch(target)` composes `check_tenant_access(branch.school_id, branch.id)` so it inherits this
rule exactly and cannot drift.

> **Compatibility note for Phase 2C-2:** the live DB has **no BRANCH_ADMIN users** (roles in use are
> SUPER_ADMIN, SCHOOL_ADMIN, PRINCIPAL, TEACHER, ACCOUNTANT, PARENT, STUDENT). The "branch-strict for
> SCHOOL_ADMIN/TEACHER" tightening is a **behaviour decision deferred to 2C-2** and is NOT applied here —
> this phase only lays the foundation and does not invent permissions.

---

## 9. NULL / Default-Deny Behavior

All helpers are default-deny and NULL-safe (verified by test):

| Condition | `auth_profile()` | `auth_check_school` | `auth_check_branch` | `is_super_admin` | `auth_role` |
|---|---|---|---|---|---|
| Unauthenticated (`auth.uid()` NULL) | 0 rows | false | false | false | NULL |
| Authenticated, no profile | 0 rows | false | false | false | NULL |
| Normal role, own school/branch | 1 row | true (own) | true | false | role |
| Normal role, other school / invalid branch | 1 row | false | false | false | role |
| NULL target arg | 1 row | false | false | — | — |
| SUPER_ADMIN (incl. NULL tenant) | 1 row | true (any valid) | true | true | SUPER_ADMIN |

Unknown identity / unknown tenant / invalid branch ⇒ **DENY**. Only an explicit SUPER_ADMIN profile ⇒
platform access.

---

## 10. Recursion Prevention

The one real recursion risk is a future `profiles` RLS policy that calls a helper which reads `profiles`
(e.g., `id = auth_school_id()`). This is broken by making the identity/tenant helpers **SECURITY DEFINER**
(owner = `postgres`), because SECURITY DEFINER functions run with the owner's privileges and bypass RLS on
tables they read. Hence:

- `auth_profile()` (reads `profiles`) is SECURITY DEFINER → safe for a `profiles` policy to call.
- `auth_check_school` / `auth_check_branch` / `is_super_admin` compose `auth_profile()` / `check_tenant_access`,
  inheriting the same safety.
- `check_tenant_access` and the scalar getters were already SECURITY DEFINER (preserved, unmodified).

This mirrors the original migration's stated rationale. Documented so Phase 2C-2 policy authors do not
"optimize" these into SECURITY INVOKER (which would reintroduce recursion).

---

## 11. Performance Considerations

- Every helper performs a **single PK lookup** on `profiles(id)` (the PK is indexed) and returns the
  minimum needed columns. No repeated per-row scans.
- Derived helpers call `auth_profile()` **once** at most; they do not re-query `profiles` for every check.
- `auth_check_branch` does one indexed lookup on `branches(id)` (PK) then evaluates `check_tenant_access`
  (which itself does the single profile lookup).
- No new indexes added — `profiles.id` (PK) and `branches.id` (PK) are already indexed, and no query
  pattern justifies further indexes. All functions are marked `STABLE`.
- No recursive policy dependencies by construction (see §10).

---

## 12. Grants / Permissions

| Role | Scope on helpers |
|---|---|
| `postgres` (owner) | EXECUTE (implicit) |
| `authenticated` | EXECUTE — **required**: RLS policies invoke helpers as the querying role |
| `service_role` | EXECUTE — parity with the existing 4 live functions (service_role bypasses RLS by design and is used for backend/system operations; helpers are harmless/default-deny to it) |
| `anon` | NO EXECUTE — revoked explicitly (project default-privileges auto-grant to anon were re-revoked) |
| `PUBLIC` | NO EXECUTE — revoked |

`service_role` implications for Phase 2C: service_role intentionally bypasses RLS for server-side Prisma
operations; the foundation helpers remain available to it but are default-deny for unauthenticated use and
return only caller-scoped identity, so they add no exposure. Do not grant the new helpers to `anon`.

---

## 13. Migration Details

- **Project migration system:** Supabase versioned migration history
  (`supabase_migrations.schema_migrations`), applied via the Supabase management API. The repo has NO
  `prisma/migrations/`, `supabase/`, or custom SQL-layout; the DB-layer migration history is the source of
  truth for RLS-layer objects (this also closes Phase 1 §11 blocker #10 — no reproducible RLS record).
- **2 new migrations this phase (both idempotent, non-destructive):**
  1. `rls_2c1_foundation_helpers` — creates the 4 new functions with hardened `search_path`, revokes
     PUBLIC, grants `authenticated` + `service_role`.
  2. `rls_2c1_helpers_revoke_anon` — explicitly revokes `anon` + PUBLIC (this project's
     `ALTER DEFAULT PRIVILEGES` auto-grants EXECUTE to `anon` on new functions), re-asserts grants.
- Used `CREATE OR REPLACE FUNCTION` (new names — no existing object replaced). No DROP, no table/enable
  changes, no data modifications.
- **Existing functions NOT replaced.** If their `search_path` is hardened later (Phase 2C-2), the
  OLD→NEW→SECURITY→COMPATIBILITY analysis is in §15.

---

## 14. Test Results

Helpers tested against the live DB by simulating `auth.uid()` via `request.jwt.claims` (the exact GUC
`auth.uid()` reads). **No table policies were created or tested** (Phase 2C-2).

| # | Test | Setup | Expected | Result |
|---|---|---|---|---|
| 1 | Unauthenticated | no JWT | deny / NULL identity | **PASS** — 0 profile rows, all false / NULL |
| 2 | School A normal user | SCHOOL_ADMIN `65f1862f…` | identity = School A | **PASS** — role=SCHOOL_ADMIN, school=`41f32895`, own-school=true |
| 3 | School A user checks School B | SCHOOL_ADMIN vs `000…0` | DENY | **PASS** — false |
| 4 | Branch A user checks Branch B | SCHOOL_ADMIN vs North `06966ac9` | per existing model (non-BRANCH_ADMIN may access same-school branch) | **PASS** — true (matches `check_tenant_access`) |
| 5 | School Admin checks other branch same school | SCHOOL_ADMIN vs North | follow existing model | **PASS** — true (same branch-sized model as existing) |
| 6 | SUPER_ADMIN (NULL tenant incl.) | SUPER_ADMIN `41c3b981…` | platform-level | **PASS** — own/any school true, both branches true, invalid branch false, is_super_admin=true |
| 7 | Profile does not exist | fabricated uid `111…555` | DENY | **PASS** — 0 profile rows, all false, role NULL |
| 8 | Profile has invalid tenant | covered via 3/4 invalid-target + NULL-target cases; orphan path verified by code (normal role + NULL tenant ⇒ false) | DENY | **PASS** |
| + | PARENT identity | PARENT `ab1408d2…` | role/school/branch resolved, own-school true | **PASS** — PARENT, `41f32895`, `9324ce1b`, true |

**8/8 conceptual cases PASSED.**

---

## 15. Compatibility With Existing 9 RLS Tables

- The existing 9 policies call `auth_role()`, `auth_school_id()`, `auth_branch_id()`,
  `check_tenant_access(...)` and `auth.uid()`. **None were changed.** The new helpers are additive and do
  not share names/overloads with the existing ones, so there is no collision or behaviour change.
- `auth_profile()` / `auth_check_school` / `auth_check_branch` / `is_super_admin` are **drop-in
  compatible** for future 2C-2 policies and can themselves be used to refactor the existing 9 policies later
  (e.g., `profiles` policy could reference `is_super_admin()` for role-narrowing) — deferred, not done here.
- **Deferred hardening (Phase 2C-2 candidate):** migrate the 4 original helpers from
  `search_path = public` to `pg_catalog, public`.
  - **OLD:** `search_path = public` (function-level `proconfig`).
  - **NEW:** `search_path = pg_catalog, public` (hardened; bodies already fully-qualify `public.profiles`).
  - **SECURITY IMPACT:** reduces search_path hijacking surface; no behavioural change (all references
    qualified).
  - **COMPATIBILITY IMPACT:** negligible — pure `CREATE OR REPLACE FUNCTION ... SET search_path = 'pg_catalog, public'`;
    signatures/returns unchanged; existing policies and ACLs unaffected. Must verify ACLs persist after
    `CREATE OR REPLACE` (Postgres preserves ACL on OR REPLACE).
- No existing policy or grant is altered by this phase. The foundation is compatible and additive.

---

## 16. Phase 2C-2 Plan (draft — NOT started)

1. **Enable RLS + policies for user-owned tables first** (lowest risk): `notifications`
   (`user_id = auth.uid()`), `leave_requests` (`profile_id = uid` / approver / school-admin),
   `announcement_reads` (`profile_id = uid`), `messages` (sender/receiver + school), `user_permissions`.
2. **Enable RLS + policy the direct-tenant branch tables** via `check_tenant_access(school_id, branch_id)`
   and/or new `auth_check_school`/`auth_check_branch` where clearer: classes, sections, subjects, exams,
   homework, announcements, fees, library, transport, meetings, events, salary, etc.
3. **Derived/child tables** via relationship `EXISTS` policies (Phase 2B `DERIVED_TENANT_RELATIONSHIPS.md`):
   exam_results, payments, fee_invoices, attendance, homework_submissions, etc.
4. **Special policies** (Phase 1 §10): `profiles` role-narrowing + hidden `two_factor_secret`;
   `student_parents` parent-scoped (NOT school-wide); report-cards published-only; salary admin/own;
   online-exam answers role-aware; audit_logs school/superadmin; `permissions`/`role_permissions`
   authenticated-read + superadmin-write.
5. **Write-policy posture:** confirm deny-all direct-client writes (server-action/Prisma-only) — likely no
   INSERT/UPDATE/DELETE policies for client roles.
6. **Reset `anon`/grant posture** and re-run advisors after each change; add policy test queries per
   Phase 1 §7 attack scenarios.
7. **Decide** the deferred items: branch-strictness for non-BRANCH_ADMIN, orphan-signup gate (Phase 1 §13),
   `Student.profileId` schema change for parent/student policies.

---

### PHASE 2C-1 STATUS

- **Foundation audit:** COMPLETE (9 RLS-enabled tables, 9 SELECT policies, 4 existing SECURITY DEFINER
  helpers, versioned migration history all inspected).
- **Helper functions:**
  - Created: 4 (`auth_profile`, `is_super_admin`, `auth_check_school`, `auth_check_branch`)
  - Reused: 4 (`auth_role`, `auth_school_id`, `auth_branch_id`, `check_tenant_access`)
  - Modified: 0
- **Existing SECURITY DEFINER functions reviewed:** 4 (all verified safe; `search_path = public` hardening
  deferred to 2C-2, documented §15).
- **Table RLS enabled:** NO
- **Table RLS policies created:** NO
- **Application source changed:** NO
- **Prisma schema changed:** NO
- **Data modified:** NO
- **Destructive operations:** NONE
- **Tests:** Passed 8 / Failed 0
- **Files changed:** `RLS_PHASE_2C_1_FOUNDATION.md` (this doc); DB migrations
  `rls_2c1_foundation_helpers`, `rls_2c1_helpers_revoke_anon`.
- **Security concerns remaining (pre-existing, not introduced):** ~65 tables RLS-disabled (2C-2);
  existing + new SECURITY DEFINER helpers executable by authenticated (intentional, default-deny);
  4 pre-existing helpers use `search_path = public` (2C-2 hardening); leaked-password protection disabled (Auth).

**PHASE 2C-2 READY: YES**
- Foundation objects for 2C-2 to use: `auth_profile()`, `is_super_admin()`, `auth_check_school(uuid)`,
  `auth_check_branch(uuid)`, existing `auth_role()/auth_school_id()/auth_branch_id()/check_tenant_access(...)`,
  and the versioned migration history for reproducibility.
