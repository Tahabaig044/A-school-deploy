# RLS Phase 2B — Data & Schema Integrity (RLS Readiness)

**Scope:** Audit the data model for RLS-readiness: parent-branch integrity, profile tenant assignment,
student/parent stable identity, notification tenant integrity, derived child tables. Apply only **safe,
unambiguous, non-destructive** data backfills. **STOP before Phase 2C** — no RLS policies, no destructive
ops, no schema changes without a documented migration plan.

**DB verified:** `postgres.gzhumudgucfqbqpuznek` == MCP project `gzhumudgucfqbqpuznek.supabase.co` (the live app DB).

---

## 1. Live Data Snapshot (verified 2026-08-31, direct count)

profiles=44 · schools=1 · branches=2 · students=51 · parents=27 · teachers=9 · staff=4 ·
classes=11 · sections=22 · academic_sessions=3 · audit_logs=86 · events=9 · id_cards=1 · staff_attendance=38.

- School anchor: `41f32895-01e6-495f-b36b-9c3ec584dea1`.
- Branch `9324ce1b-…` = **Main Campus** (all 51 students + all derived data).
- Branch `06966ac9-…` = **North Campus** — no students / no data (healthy empty tenant).

## 2. Parent-Branch Integrity

- `parents` table has **no `branch_id` column** (schema gap — not a data defect).
- Phase 1 "25/27 parents branch NULL" refers to **`profiles.branch_id`** for PARENT-role profiles.
- 27/27 parents in school `41f32895`, all with exactly 1 child, all children in branch `9324ce1b`.
- 27/27 `parents.profile_id = NULL`; parent emails exactly match PARENT-role profile emails → **27/27 SAFE_TO_BACKFILL, zero ambiguous**.
- Data-quality note (non-blocking): two "Taha Baig" parent rows duplicate-link the same student `c530222c`.

## 3. Profile Tenant Assignment

- **No orphan profiles** (0 school NULL across all roles) — before and after.
- The sole SUPER_ADMIN (`41c3b981`, email NULL) is fully tenant-assigned; still must tolerate NULL for SUPER_ADMIN per design.
- Only gap: 25 PARENT profiles with `branch_id = NULL` (legacy data; current signup path sets branch).
- **Backfill EXECUTED (safe, unambiguous):** set `profiles.branch_id` from the child's branch via
  `profiles ⨝ parents(email+school) ⨝ student_parents ⨝ students`, guarded by `HAVING count(DISTINCT s.branch_id)=1`.

### Post-backfill verification

| Check | Result |
|---|---|
| PARENT profiles with NULL branch | **0** (was 25) |
| Non-PARENT profiles with NULL branch | 0 (untouched) |
| SUPER_ADMIN branch NULL | 0 |
| Orphan profiles (school NULL) | 0 |
| Profile rows modified | 25 (PARENT only) |

→ Every profile in the DB now has **both `school_id` and `branch_id` set**. Reversible data fix only.

## 4. Student / Parent Identity

- `Student` has **no `profileId`** — portals are email-keyed (`email` on both Student and Profile).
- `Parent.profileId` exists (`@unique`, nullable) but is NULL on all 27 rows.
- Email-based bridging verified consistent; stable identity migration documented (not executed).

## 5. Notification Tenant Integrity

- `notifications` is **user-owned** (receiver `userId`); no school/branch columns → relationship-derived RLS.
- `createNotification` (`notification.actions.ts:23-39`) writes `userId` directly without receiver-school validation (Phase 2A §6.5 gap confirmed).
- 15 live notifications are all test rows to SUPER_ADMIN in same school/branch (no cross-tenant data).

## 6. Derived Child Tables

Zero cross-tenant anomalies across fee_invoices, payments, exam_results→exam/student, teacher_assignments,
timetables, student_enrollments, book_issues, classes, student_transport — all **0 mismatches**.
Dataset is internally consistent → **no data reassignment / corruption fixes needed**.

---

## 7. Safe Data Backfills Applied

1. **25 PARENT profiles `branch_id` backfilled** (from child branch) — the only safe, unambiguous data fix.
   No other backfills were warranted (0 ambiguous records).

## 8. Not Done (deferred, documented — not blockers)

- `Student.profileId` FK + backfill — migration plan in `STUDENT_PARENT_IDENTITY_PLAN.md` (ADD→BACKFILL→VERIFY→CONSTRAIN).
- `parents.branch_id` column — migration plan in `PARENT_BRANCH_BACKFILL_PLAN.md`.
- `Message.branch_id` (optional), notification sender attribution (optional).
- All RLS policies / enablement — **Phase 2C**.

---

## 9. Deliverables

| # | Doc | Status |
|---|---|---|
| 1 | `RLS_PHASE_2B_DATA_MAP.md` — ~74-model tenant map (35 direct / ~39 derived) | COMPLETE |
| 2 | `PARENT_BRANCH_BACKFILL_PLAN.md` — 27/27 table + backfill + schema-gap migration | COMPLETE |
| 3 | `PROFILE_TENANT_INTEGRITY.md` — role table, NULL gap, signup root cause | COMPLETE |
| 4 | `TENANT_ASSIGNMENT_DESIGN.md` — Profile→School→Branch rule + D1-D4 gates | COMPLETE |
| 5 | `STUDENT_PARENT_IDENTITY_PLAN.md` — email bridge → profileId, migration+rollback | COMPLETE |
| 6 | `NOTIFICATION_TENANT_INTEGRITY.md` — user-owned model, creation paths, RLS rec | COMPLETE |
| 7 | `DERIVED_TENANT_RELATIONSHIPS.md` — 38 child tables, tenant paths, Phase 2C strategy | COMPLETE |
| 8 | `RLS_PHASE_2B_READINESS.md` — per-model gate + overall decision | COMPLETE |

## 10. Phase 2B Status Summary

- Data audit (parent branch / profile tenant / identity / notification / derived mapping): **COMPLETE**
- Safe fixes implemented: **1** (25 parent-profile branch backfill)
- Ambiguous records: **0** (2 duplicate "Taha Baig" parent rows = data-quality note, not a blocker)
- Schema changed: **NO**
- DB data modified: **YES** (25 `profiles.branch_id` rows, reversible)
- RLS enabled: **NO** · Policies: **NO** · Destructive ops: **NONE**
- Files changed: **8 new `.md` docs only** — no source, Prisma schema, or SQL files modified

---

## 11. Phase 2C Gate Decision

**Gate status: PASS (conditional) — data layer is RLS-ready for Phase 2C.**

The data layer has **no corruption/tenant blockers**. All tenant-owning models are ready. Remaining items are
**application/design decisions and optional schema additions**, not data blockers:

1. **HUMAN decisions** (from Phase 1 §13, still open): deny-all-direct-client-writes, portal identity
   migration (email→profileId), self-signup policy, teacher online-exam creation scope, teacher fee
   visibility, salary visibility, answer retention, audit-log visibility.
2. **Optional schema additions to schedule:** `Student.profileId`, `parents.branch_id`, `Message.branch_id`,
   notification sender attribution.
3. **Other known advisors (pre-existing, Phase 2C scope):** RLS disabled on ~65 public tables; 4 auth
   `SECURITY DEFINER` RPCs executable by `authenticated`; HMAC-leaked-password protection disabled.

**Phase 2B is COMPLETE. Awaiting Phase 2C instruction before enabling RLS / writing policies.**
