# RLS Phase 2B — Profile Tenant Assignment
## Deliverable 3: `PROFILE_TENANT_INTEGRITY.md`

**Source:** live `profiles` table (44 rows) + `actions/auth.actions.ts`, `actions/parent.actions.ts`, `actions/student.actions.ts`.

## 1. Live tenant-assignment state (verified)

| Role | total | school NULL | branch NULL | both NULL (orphan) | Fully assigned |
|------|-------|-------------|-------------|--------------------|----------------|
| SUPER_ADMIN | 1 | 0 | 0 | 0 | 1 |
| SCHOOL_ADMIN | 1 | 0 | 0 | 0 | 1 |
| PRINCIPAL | 4 | 0 | 0 | 0 | 4 |
| TEACHER | 9 | 0 | 0 | 0 | 9 |
| ACCOUNTANT | 1 | 0 | 0 | 0 | 1 |
| PARENT | 27 | **0** | **25** | 0 | 2 |
| STUDENT | 1 | 0 | 0 | 0 | 1 |
| **TOTAL** | **44** | **0** | **25** | **0** | **43** |

## 2. Findings & classification

- **No orphan profiles** (schoolId NULL) exist. The Phase 1 self-signup orphan concern is **not present in the current dataset** (0 school-null rows).
- **The sole data gap is `branch_id = NULL` on 25 PARENT profiles** (all `parentN@greenwood.edu`, school `41f32895`). All 25 derive unambiguously to branch `9324ce1b` via their single child. → **C (data gap), resolves to SAFE backfill.**
- **SUPER_ADMIN is fully tenant-assigned** here (school + Main branch), NOT NULL. The Phase 1 assumption that "SUPER_ADMIN may intentionally have NULL" is **not realized in this DB** — this SUPER_ADMIN has both set. So the `A / platform-level NULL` case does not currently apply; still, the RLS design must remain correct for a future SUPER_ADMIN with NULL (profile.role = SUPER_ADMIN bypass).
- **STUDENT, TEACHER, STAFF, PRINCIPAL, SCHOOL_ADMIN, ACCOUNTANT profiles are all correctly assigned.** Non-parent creation flows set `schoolId`/`branchId` from the inviter's context (verified in `parent.actions.ts:155` `branchId: profile.branchId`, and student/teacher flows set both).

## 3. Why do NULLs occur? (code-verified)

| Path | Profile school/branch | Orphan risk |
|---|---|---|
| **Self-signup** `signup()` — `auth.actions.ts:600-610` | `schoolId`/`branchId` **NOT set → NULL** (roles STUDENT/PARENT/TEACHER) | **YES — creates orphan profiles** (not present today because legacy data predates/suppresses free signup) |
| Invited school user `inviteUser()` | set from inviter profile | No |
| Parent creation `parent.actions.ts:146-161` | `schoolId` set; `branchId: profile.branchId` | No (current flow sets branch) |
| Student creation `student.actions.ts:363,563` | set from school context | No |
| Teacher / Staff creation | set from school context | No |

The 25 NULL-branch PARENT profiles are **legacy** records created before the branch column was populated, not a current-flow bug, and are fully derivable.

## 4. Classification per requirement categories

| Category | Applies? |
|---|---|
| A. intentionally platform-level | NO (SUPER_ADMIN is assigned) |
| B. temporary/unassigned | YES — 25 PARENT profiles, resolvable |
| C. security issue | LOW under current app (actions scope by school; branch mismatch would only tighten visibility) — but BLOCKS branch-level RLS for parents |
| D. required by SUPER_ADMIN | NO |
| E. caused by signup flow | Legacy parent rows only; current signup still can orphan new self-signups |

## 5. Fix required

1. **Backfill (safe, executed in this phase):** `UPDATE profiles SET branch_id = '9324ce1b…' WHERE role='PARENT' AND school_id='41f32895…' AND branch_id IS NULL;`
2. **Prevent future orphans (application, minimal — Phase 2B documents, not auto-redesign):**
   - `auth.actions.ts::signup` currently creates an untethered profile. Recommend gating self-signup to require a binding invitation token with school/branch, OR require school+branch selection before profile creation. **Documented for implementation** (touches auth flow, out of the "safe minimal fix" envelope).
3. **NUll handling after backfill:** nullable columns may be retained (legit for SUPER_ADMIN-by-design + logs); do **not** force NOT NULL until a not-null-when-non-superadmin invariant is enforced app-side.

## 6. Non-destructive verification promise
- No profile school changed; only PARENT rows' branch updated; SUPER_ADMIN / other roles untouched; no deletion.
