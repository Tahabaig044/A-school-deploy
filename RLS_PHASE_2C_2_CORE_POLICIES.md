# Phase 2C-2 — Core RLS Policies

**Project:** School Management System — `gzhumudgucfqbqpuznek` (live Supabase DB)
**Date:** 2026-08-31
**Scope:** Batch 1 of the Core RLS rollout — RLS on the first core direct-tenant school/branch resource
tables, with default-deny SELECT-only policies. No schema/Prisma/application changes, no destructive ops.

---

## 1. Baseline

Reconfirmed against the live DB (source of truth, not docs):

| Metric | Value |
|---|---|
| Public tables | **73** |
| RLS enabled (before) | **9** |
| RLS disabled (before) | **64** |
| Policies (before) | **9** (all SELECT-only, `TO authenticated`) |
| SECURITY DEFINER functions | **8** |
| Tenant anchors | School `41f32895…`, Branch `9324ce1b…` (Main), Branch `06966ac9…` (North, no data) |

**Prisma/RLS interaction (verified, §27):**
- The app's Prisma client connects via `DATABASE_URL` as user **`postgres`** (Supabase pooler:
  `postgres.gzhumudgucfqbqpuznek@aws-1-ap-southeast-1.pooler.supabase.com`).
- `postgres` has `bypassrls = true` (verified via `pg_roles`). `authenticated`/`anon` have `bypassrls = false`.
- **Conclusion:** enabling RLS does **not** affect server-side Prisma. Prisma (as `postgres`) bypasses RLS by
  design for backend/server-action operations. RLS closes the **client-facing PostgREST surface**
  (`anon`/`authenticated` JWTs), which is the surface this phase protects.
- Prisma configuration is **unchanged** (out of scope). service_role also bypasses RLS (intentional, for
  system/backend use).

## 2. Tables Enabled (Batch 1 — 10 tables)

All were `rls_enabled = false`, `policies = 0` before. Enabled now with one SELECT policy each.

**Branch-keyed** (both `school_id` and `branch_id` `NOT NULL`):

| Table | Policy | USING |
|---|---|---|
| `classes` | `classes_tenant_select` | `auth_check_school(school_id) AND auth_check_branch(branch_id)` |
| `subjects` | `subjects_tenant_select` | `auth_check_school(school_id) AND auth_check_branch(branch_id)` |
| `timetables` | `timetables_tenant_select` | `auth_check_school(school_id) AND auth_check_branch(branch_id)` |
| `announcements` | `announcements_tenant_select` | `auth_check_school(school_id) AND auth_check_branch(branch_id)` |
| `fee_structures` | `fee_structures_tenant_select` | `auth_check_school(school_id) AND auth_check_branch(branch_id)` |
| `expenses` | `expenses_tenant_select` | `auth_check_school(school_id) AND auth_check_branch(branch_id)` |
| `library_books` | `library_books_tenant_select` | `auth_check_school(school_id) AND auth_check_branch(branch_id)` |
| `vehicles` | `vehicles_tenant_select` | `auth_check_school(school_id) AND auth_check_branch(branch_id)` |
| `transport_routes` | `transport_routes_tenant_select` | `auth_check_school(school_id) AND auth_check_branch(branch_id)` |

**School-keyed** (`branch_id` nullable, `school_id` `NOT NULL`):

| Table | Policy | USING |
|---|---|---|
| `academic_sessions` | `academic_sessions_tenant_select` | `auth_check_school(school_id)` |

Every policy is `FOR SELECT TO authenticated`, no `WITH CHECK`, no `FOR INSERT/UPDATE/DELETE`.

## 3. Tables Intentionally Not Enabled

Only Batch 1 (10) were enabled in this phase by design — controlled batch per §23. Remaining **54**
RLS-disabled tables are classified for later batches (Batch 2 / Phase 2C-3):

- **Direct-tenant core not yet done (Batch 2 candidates):** `branches`, `admissions`, `exams`,
  `exam_types`, `homework`, `events`, `meetings`, `calendar_events`, `question_bank`, `online_exams`,
  `alumni`, `alumni_events`, `salary_structures`, `teacher_ratings`, `expenses`(done)…
- **User-owned / derived (Phase 2C-3):** `notifications`, `leave_requests`, `announcement_reads`,
  `user_permissions`, `messages` (requires sender/receiver care), and the ~39 relationship-derived child
  tables (`sections`, `student_attendance`, `fee_invoices`, `payments`, `exam_results`, `report_cards`,
  `homework_submissions`, `book_issues`, `student_transport`, …).
- **Platform/global (needs `authenticated`-read or SUPER_ADMIN-write design):** `permissions`,
  `role_permissions`, `audit_logs`, `branches`(own-tier), `profiles`(already protected).
- `branches` is deliberately **deferred**: it is the tenant anchor referenced by `auth_check_branch`; its
  policy must be carefully designed (public school metadata vs. management data, §11/§12). Not in Batch 1.

The existing 9 RLS tables (`id_cards`, `parents`, `profiles`, `schools`, `settings`, `staff`,
`student_parents`, `students`, `teachers`) were **not modified** — their policies remain intact (§4/§11).

## 4. Policies Created

**10 new SELECT policies** (see §2). Naming convention: `{table}_tenant_select`, matching the repository's
established `<entity>_tenant_select` convention from the 9 existing policies. No duplicate policy names
(verified: each target table had 0 policies before). **No INSERT/UPDATE/DELETE policies** are created — this
is the deliberate "deny direct-client writes" posture (writes are server-action/Prisma-only as `postgres`,
which bypasses RLS). This satisfies §13–16 trivially: any direct client write is denied.

## 5. School Isolation

Policy for every protected table uses the **profile-derived** school (via `auth_check_school(school_id)`),
never a client/cookie/URL/form value. A row is visible only when
`school_id == auth_profile().school_id` (or the caller is SUPER_ADMIN, §7). Tested: School A user sees own
school rows, 0 rows for a fabricated School B (§§13–17).

## 6. Branch Isolation

Branch-keyed tables additionally require `auth_check_branch(branch_id)`, which composes the canonical
`check_tenant_access(branch.school_id, branch.id)` — so branch enforcement **cannot drift** from the existing
authorization model (§9, §18):

- **BRANCH_ADMIN:** restricted to their own `profile.branch_id` (encoded in `check_tenant_access`).
- **All other roles (SCHOOL_ADMIN, TEACHER, …):** allowed across **all branches within their own school**
  (existing model — not re-invented; foundation §8).
- **Different school's branch:** denied.

**Limitation (documented):** the live DB has **no BRANCH_ADMIN users** and only one branch with data, so the
branch-strict runtime path is **not exercisable with real data**. The policy logic is correct by composition,
but true cross-branch denies against real second-branch data cannot be proven until a second branch has data /
a BRANCH_ADMIN exists. Helper-level tests confirmed: own branch true, same-school other branch true (per
model), foreign-school branch false.

## 7. SUPER_ADMIN Behavior

SUPER_ADMIN platform access is granted **explicitly by role** via the Phase 2C-1 helpers, not by NULL tenant:
- `auth_check_school(school_id)` → true for SUPER_ADMIN against any valid (non-NULL) school.
- `auth_check_branch(branch_id)` → true for SUPER_ADMIN (via `check_tenant_access`).

Tested: SUPER_ADMIN `41c3b981…` sees **all** classes (11) and fee_structures (6). An **ordinary** user with
NULL/unknown tenant remains denied (default-deny; NULL is never "allow all").

## 8. INSERT Protection

No INSERT policy exists on any protected table → **direct client INSERT is DENIED** for `authenticated`/`anon`.
Tested: as School A SCHOOL_ADMIN, `INSERT INTO classes` (even with own schoolId) → `42501 new row violates
row-level security policy`. Therefore tenant-forging (INSERT with School B schoolId, §14) is impossible via
the client surface. Server-side Prisma (as `postgres`) performs writes with full access.

## 9. UPDATE Protection

No UPDATE policy → **direct client UPDATE is DENIED**. Tested: as School A SCHOOL_ADMIN,
`UPDATE classes SET school_id = School B WHERE school_id = School A` → **0 rows escaped** (no row updated;
RLS filters the target set to empty). Tenant-escape (§15) is impossible on the client surface.

## 10. DELETE Protection

No DELETE policy → **direct client DELETE is DENIED**. Tested: as School A SCHOOL_ADMIN,
`DELETE FROM classes WHERE school_id = School A` → **11 rows remain** (no deletions). Cross-tenant DELETE
(§16) is impossible on the client surface.

## 11. Existing Policy Compatibility

The 9 pre-existing RLS tables and their policies are **unchanged** (verified by policy dump):
- `id_cards`,`staff`,`students`,`teachers`: `check_tenant_access(school_id, branch_id)`
- `parents`,`settings`: `school_id = auth_school_id()`
- `schools`: `id = auth_school_id()`
- `profiles`: `id = auth.uid() OR school_id = auth_school_id()`
- `student_parents`: EXISTS(student-in-school OR parent-in-school)

Regression tested as School A SCHOOL_ADMIN: `students=51, teachers=9, staff=4, parents=27, id_cards=1,
settings=1, schools=1, profiles=44, student_parents=27` — all present, same as baseline. No recursion
introduced (the only `profiles`-reading helpers used by policies are SECURITY DEFINER, recursion-safe, §10).
The 4 pre-existing helpers (`search_path = public`) were **not modified**; hardening remains deferred per the
$ OLD→NEW→SECURITY→COMPATIBILITY analysis in `RLS_PHASE_2C_1_FOUNDATION.md` §15.

## 12. Prisma/RLS Interaction

- Prisma connects as `postgres` (`bypassrls = true`) → server queries **bypass RLS**. Enabling RLS does not
  break the app.
- RLS protects the **client PostgREST surface** (`anon`/`authenticated`), closing direct client reads/writes.
- No Prisma configuration change was made. `service_role` also bypasses RLS (intentional, backend/system).
- Implication for Phase 2A: server actions remain the enforcement point for **writes**; RLS is the DB-level
  backstop for **client reads/writes**.

## 13. Security Tests

Run with real JWT context via `SET ROLE authenticated` + `request.jwt.claims` (`auth.uid()` simulation).

| # | Test | Expected | Result |
|---|---|---|---|
| A | Anonymous (authenticated role, no JWT) — SELECT classes/announcements | DENY / 0 rows | **PASS** (0, 0) |
| B | School A SCHOOL_ADMIN — SELECT own classes | own school visible | **PASS** (11) |
| C | School A SCHOOL_ADMIN — SELECT School B (fabricated) classes | 0 rows | **PASS** (own 11, School B 0) |
| D | School A SCHOOL_ADMIN — branch access own branch | allowed | **PASS** (true) |
| E | School A SCHOOL_ADMIN — same-school other branch / foreign-school branch | per model / denied | **PASS** (true / false) |
| F | SUPER_ADMIN — SELECT all schools | platform access | **PASS** (classes 11, fees 6) |
| G | School A user INSERT with any/other schoolId | DENIED | **PASS** (42501) |
| H | School A user UPDATE class → schoolId = School B | DENIED / 0 escaped | **PASS** (0 escaped) |
| I | School A user DELETE classes | DENIED / rows remain | **PASS** (11 remain) |
| + | TEACHER own-school visibility | visible | **PASS** (11/7/224) |
| + | Existing 9 RLS tables regression | unchanged | **PASS** |

**All tests passed. No leakage.** Data row counts unchanged across all 10 tables (classes=11, subjects=10,
timetables=224, announcements=7, fee_structures=6, expenses=15, library_books=10, vehicles=4,
transport_routes=3, academic_sessions=3) — identical to pre-batch baseline.

## 14. Performance Considerations

- Policies compose the verified STABLE SECURITY DEFINER helpers (`auth_check_school`/`auth_check_branch`).
  `auth_check_school` performs one PK lookup on `profiles(id)`; `auth_check_branch` one PK lookup on
  `branches(id)`, both indexed. Per-tenant arrays are small (single school).
- No new indexes added. `profiles(id)` (PK) and `branches(id)` (PK) already serve the lookups. No policy
  pattern justifies additional indexes in this batch.
- No recursion or expensive nested scans by construction.
- **Performance advisor (post-batch):** the only RLS-related lint in the project is a pre-existing
  `auth_rls_initplan` WARN on the `profiles` policy (not one of the 10 tables). The 25 findings touching the
  10 tables are pre-existing `unused_index`/`unindexed_foreign_keys` (INFO) schema-hygiene lints, not caused
  by the policies — none reference the helper functions. **No RLS performance regression introduced.**
- **Index documentation (§29):** the policies resolve `branches(id)` by PK (already indexed), so no new
  index is required for RLS. Pre-existing `unindexed_foreign_keys` notes (e.g. `classes.branch_id`,
  `timetables.school_id`) are unrelated to RLS and left for normal schema hygiene — not created in this phase.

## 15. Remaining Tables

- **Batch 2 (direct-tenant core):** `branches` (careful design), `admissions`, `exams`, `exam_types`,
  `homework`, `events`, `meetings`, `calendar_events`, `question_bank`, `online_exams`, `alumni`,
  `alumni_events`, `salary_structures`, `teacher_ratings`.
- **User-owned / derived (Phase 2C-3):** `notifications`, `leave_requests`, `announcement_reads`,
  `user_permissions`, `messages`, and the ~39 relationship-child tables via EXISTS policies
  (`DERIVED_TENANT_RELATIONSHIPS.md`).
- **Platform/global:** `permissions`, `role_permissions`, `audit_logs`.
- **Profiles:** already RLS-protected; role-narrowing + `two_factor_secret` hiding deferred (special policy).

## 16. Known Risks

1. **Branch-strict not runtime-proven** — no live BRANCH_ADMIN / no second-branch data; policy correct by
   composition but the strict path is unexercised with real data.
2. **Single-tenant dataset** — cross-school SELECT is proven by fabrication (no real second school); the
   policy expression itself is correct, but a real second tenant is the strongest future proof.
3. **SECURITY DEFINER helpers executable by authenticated (WARN)** — intentional (required by policies),
   default-deny, caller-scoped; accepted.
4. **4 pre-existing helpers use `search_path = public`** — low-risk (bodies fully-qualified); hardening
   deferred per 2C-1 §15.
5. **No client write policies by design** — if a future feature needs client writes, a WITH CHECK policy
   enforcing tenant ownership must be added deliberately (not done here to preserve the server-only write
   posture).
6. **Remaining 54 tables RLS-disabled** — progressively closed in Batch 2 / Phase 2C-3.
7. **Leaked-password protection disabled (Auth WARN)** — out of RLS scope; accepted.

## 17. Phase 2C-3 Plan

1. **Batch 2:** direct-tenant core remaining tables (see §15) — same SELECT-only pattern; design `branches`
   policy carefully (SUPER_ADMIN platform + school-scoped reads; distinguish public vs management data).
2. **Special policies:** `profiles` role-narrowing + hidden `two_factor_secret` (recursion-safe via
   SECURITY DEFINER helpers); `student_parents` parent-scoped; `report_cards` published-only; `salary_*`
   admin/own; `online_exam_answers` role-aware; `audit_logs` school/superadmin; `permissions`/
   `role_permissions` authenticated-read.
3. **Derived/child tables** via relationship EXISTS policies (`DERIVED_TENANT_RELATIONSHIPS.md`).
4. **User-owned tables** (`notifications`, `leave_requests`, `announcement_reads`, `user_permissions`,
   `messages`) with `user_id = auth.uid()` / sender/receiver scoping.
5. Re-run the full security test matrix and advisors after each batch; STOP on any regression.

---

### PHASE 2C-2 STATUS

- **Live table count:** 73
- **RLS before:** 9 enabled
- **RLS after:** 19 enabled
- **Newly RLS-enabled:** 10
- **Existing policies before:** 9
- **Policies after:** 19
- **New policies:** 10
- **SELECT policies:** 19 (9 existing + 10 new)
- **INSERT policies:** 0
- **UPDATE policies:** 0
- **DELETE policies:** 0
- **Security tests:** Passed 11 / Failed 0
- **Cross-school SELECT:** PASS
- **Cross-school INSERT:** PASS
- **Cross-school UPDATE:** PASS
- **Cross-school DELETE:** PASS
- **Cross-branch:** PASS (helper-level; strict path unexercised — no live BRANCH_ADMIN/second-branch data)
- **SUPER_ADMIN:** PASS
- **Data modified:** NO (row counts identical to baseline)
- **Destructive operations:** NONE
- **Prisma schema changed:** NO
- **Application source changed:** NO
- **Migration files:**
  - `rls_2c2_batch1_core_school_resources` (new — 10 tables enabled + 10 policies)
  - (prior phase) `rls_2c1_foundation_helpers`, `rls_2c1_helpers_revoke_anon`
- **Documentation:**
  - `RLS_PHASE_2C_2_CORE_POLICIES.md` (this doc)

**PHASE 2C-3 READY = YES**
- All 11 security tests pass; no cross-school leakage; no cross-branch leakage (per existing model); no
  policy recursion; no unexpected data changes; existing 9 RLS tables remain functional; migration applied
  successfully; application behavior unchanged (Prisma bypasses RLS as `postgres`).
- Batch 2 scope and special-policy plan are defined in §15/§17.
