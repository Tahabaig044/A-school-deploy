# RLS Phase 2B — Safe Tenant Assignment Design
## Deliverable 4: Future tenant-assignment prevention

**Goal:** prevent future invalid tenant records (profiles without school/branch; entities linked across schools).

## 1. Correct tenant rule (verified against project)

```
Profile → schoolId (required for non-SUPER_ADMIN)
        → branchId (required for non-SUPER_ADMIN)
Entity (Student/Teacher/Staff/Parent/Class/…)
        → schoolId, branchId derived from creation context (inviter's school/branch)
Derived child tables → resolve through relations (do NOT store redundant tenant ID)
```
SUPER_ADMIN is the **only** role with a legitimate NULL tenant (platform-level); even then, this DB's SUPER_ADMIN is assigned — the rule must tolerate NULL only for SUPER_ADMIN.

## 2. Where tenant assignment should occur (mapped)

| Point | Current behavior | Risk | Recommended protection | Phase |
|---|---|---|---|---|
| Self-signup `signup()` | Profile created **without** school/branch → NULL | Orphan profile; invisible to RLS; `MissingSchoolContextError` on actions | Require invitation-token with school+branch (bounded) OR school-selection audit-verified; **reject signup without tenant** | 2D/app (requires auth change — documented, not auto-applied) |
| Invitation `inviteUser()` | School/branch from inviter | Low | Add explicit branch assertion; validate target role's required branch | 2B (existing code already safe) |
| Parent creation | schoolId + branchId from inviter profile | Low (currently safe) | Keep; align with new `parents.branch_id` when column added | 2B/2C |
| Student/Teacher/Staff creation | from school-context helpers | Low (safe) | Assert non-null school/branch on create | 2B |
| Branch assignment on profile | `getBranchId()`/`getSchoolId()` force profile for non-superadmin | Good | Enforce non-null at create/update boundary | 2B |

## 3. Minimal safe fixes (executed or documented)

**Executed (safe, non-destructive):**
- Backfill of 25 legacy PARENT profiles' `branch_id` (see `PROFILE_TENANT_INTEGRITY.md`).

**Documented for implementation (requires auth-flow / schema review, NOT auto-applied per Phase 2B):**
- **D1.** `auth.actions.ts::signup`: require a tenant context (invitation token or school selection) before creating a profile; otherwise reject. Removes the orphan-profile root cause.
- **D2.** Add a `Profile` invariant: `NOT NULL(school_id)` and `NOT NULL(branch_id)` guarded to `role <> 'SUPER_ADMIN'` (check constraint), applied **only after** (a) parent branch backfill and (b) signup fix are live. Schema change → Phase 2B migration plan, human-decision.
- **D3.** (Optional) Add `parents.branch_id` + backfill (see `PARENT_BRANCH_BACKFILL_PLAN.md`), enabling direct branch policy on parents instead of child-derivation.
- **D4.** `createNotification`: validate receiver `Profile.schoolId` matches sender school before insert (closes §6.5 gap). Currently out of scope for auto-apply (behavioral change) — see `NOTIFICATION_TENANT_INTEGRITY.md`.

## 4. Constraint strategy (non-destructive ordering)

Preferred: **ADD (nullable) → BACKFILL → VERIFY → CONSTRAIN (NOT NULL / CHECK)**. Never DROP/RECREATE.
All proposed CONSTRAINT additions are gated behind: existing data proven clean (verified: 0 orphans, 0 cross-tenant anomalies) + human sign-off.
