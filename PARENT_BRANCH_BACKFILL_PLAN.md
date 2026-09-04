# RLS Phase 2B — Parent Branch Integrity
## Deliverable 2: `PARENT_BRANCH_BACKFILL_PLAN.md`

**Source:** live DB query (2026-08-31) on tables `parents`, `student_parents`, `students`, `profiles`.
**Anchor IDs:** School `41f32895-…` · Branch `9324ce1b-…` (Main Campus).

## 1. Investigation results (verified)

The `parents` table has **no `branch_id` column** (per Prisma schema — `Parent` has `id, schoolId, profileId, firstName, lastName, relationship, phone, email, …, isPrimary`; **no branchId**). Therefore "Parent branchId" exists in two places:

1. **`parents` table rows** — no branch column at all (schema gap).
2. **`profiles` where role = PARENT** — `branch_id` column exists; **25 of 27 are NULL**.

Per parent, the child relationship is the derivation source:

- **27/27** parent rows belong to school `41f32895-…`.
- **27/27** parent rows link to **exactly 1 child** via `student_parents`.
- **27/27** children are in branch `9324ce1b-…` (Main Campus) — **one distinct branch**, same school.
- **No** parent has children across branches. **No** parent has children across schools.
- **All 27** parent rows have `profile_id = NULL` (no FK link to profile).
- Parent-table emails (`parent1@…parent25@greenwood.edu`) **exactly match** the 25 PARENT-role profile emails with NULL branch.

Because every parent has exactly one child, and that child is unambiguously in branch `9324ce1b`, branch derivation is **100% deterministic** — no ambiguity, no guessing.

## 2. Per-parent backfill table (collapsed — all rows identical branch result)

`SAFE_TO_BACKFILL` = parent has ≥1 child, all children in exactly one branch, same school, no conflict.

| Parent (row) | Email | School | # Children | Child Branch(es) | Conflict | Trait |
|---|---|---|---|---|---|---|
| Chauhan Sr. Chauhan | parent14@ | 41f32895… | 1 | 9324ce1b… | none | SAFE_TO_BACKFILL |
| Chopra Sr. Chopra | parent18@ | 41f32895… | 1 | 9324ce1b… | none | SAFE_TO_BACKFILL |
| Das Sr. Das | parent10@ | 41f32895… | 1 | 9324ce1b… | none | SAFE_TO_BACKFILL |
| Gupta Sr. Gupta (x2 rows) | parent3@ / parent23@ | 41f32895… | 1 each | 9324ce1b… | none | SAFE_TO_BACKFILL |
| Iyer Sr. Iyer | parent9@ | 41f32895… | 1 | 9324ce1b… | none | SAFE_TO_BACKFILL |
| Joshi Sr. Joshi | parent11@ | 41f32895… | 1 | 9324ce1b… | none | SAFE_TO_BACKFILL |
| Kapoor Sr. Kapoor | parent20@ | 41f32895… | 1 | 9324ce1b… | none | SAFE_TO_BACKFILL |
| Kumar Sr. Kumar (x2) | parent5@ / parent25@ | 41f32895… | 1 each | 9324ce1b… | none | SAFE_TO_BACKFILL |
| Malhotra Sr. Malhotra | parent19@ | 41f32895… | 1 | 9324ce1b… | none | SAFE_TO_BACKFILL |
| Mehta Sr. Mehta | parent16@ | 41f32895… | 1 | 9324ce1b… | none | SAFE_TO_BACKFILL |
| Mishra Sr. Mishra | parent12@ | 41f32895… | 1 | 9324ce1b… | none | SAFE_TO_BACKFILL |
| Nair Sr. Nair | parent8@ | 41f32895… | 1 | 9324ce1b… | none | SAFE_TO_BACKFILL |
| Patel Sr. Patel | parent6@ | 41f32895… | 1 | 9324ce1b… | none | SAFE_TO_BACKFILL |
| Rao Sr. Rao | parent15@ | 41f32895… | 1 | 9324ce1b… | none | SAFE_TO_BACKFILL |
| Reddy Sr. Reddy | parent7@ | 41f32895… | 1 | 9324ce1b… | none | SAFE_TO_BACKFILL |
| Shah Sr. Shah | parent17@ | 41f32895… | 1 | 9324ce1b… | none | SAFE_TO_BACKFILL |
| Sharma Sr. Sharma (x2) | parent1@ / parent21@ | 41f32895… | 1 each | 9324ce1b… | none | SAFE_TO_BACKFILL |
| Singh Sr. Singh (x2) | parent4@ / parent24@ | 41f32895… | 1 each | 9324ce1b… | none | SAFE_TO_BACKFILL |
| Taha Baig (x2 rows, same child) | tahabaig44@ / tahabaig4@ | 41f32895… | 1 (both to student c530222…) | 9324ce1b… | **duplicate parent rows for same child** | SAFE_TO_BACKFILL (branch) / NOTE duplicate |
| Tiwari Sr. Tiwari | parent13@ | 41f32895… | 1 | 9324ce1b… | none | SAFE_TO_BACKFILL |
| Verma Sr. Verma (x2) | parent2@ / parent22@ | 41f32895… | 1 each | 9324ce1b… | none | SAFE_TO_BACKFILL |

**Result:** 27/27 parents → **SAFE_TO_BACKFILL** to branch `9324ce1b-…`. **No AMBIGUOUS, NO_VALID_RELATION, or REQUIRES_HUMAN_DECISION rows** in the current dataset.

## 3. What must actually be backfilled

There are **two distinct, non-conflicting actions**:

### A. Profiles (role=PARENT) — `branch_id` column EXISTS
- **25 profiles** with `branch_id = NULL` (parent1…25@greenwood.edu), all school `41f32895`.
- Derived branch = `9324ce1b` (their child's branch). **Unambiguous.**
- **Action:** `UPDATE profiles SET branch_id = '9324ce1b…' WHERE role='PARENT' AND school_id='41f32895…' AND branch_id IS NULL;`
- Already-correct: `tahabaig4@gmail.com` (INVITED) and `tahabaig44@gmail.com` already have `9324ce1b`.

### B. Parent table rows — no `branch_id` column (SCHEMA CHANGE, needs migration)
- Add `branch_id` column (nullable initially) → backfill via child derivation → then optionally enforce.
- **Deferred to a documented, reviewed migration (Phase 2B does not execute schema changes blindly).**
- Provisional SQL (for the migration plan):
  ```sql
  ALTER TABLE parents ADD COLUMN branch_id uuid REFERENCES branches(id);
  UPDATE parents p SET branch_id = sub.branch
  FROM (
    SELECT sp.parent_id, min(s.branch_id) AS branch
    FROM student_parents sp JOIN students s ON s.id = sp.student_id
    GROUP BY sp.parent_id HAVING count(DISTINCT s.branch_id) = 1
  ) sub WHERE sub.parent_id = p.id;
  -- then assess making NOT NULL only after data verified clean
  ```

## 4. Backfill safety rules (applied)

- Source of truth: `Parent → child → Student.branch_id`.
- Backfill ONLY when: relationship valid, single branch across all children, parent school == child school, no conflict. All conditions met → **safe**.
- Any parent with children in >1 branch → mark `AMBIGUOUS — DO NOT AUTO-BACKFILL` (none exist today).
- Do **not** treat the two "Taha Baig" parent rows (both linking to the same student `c530222`) as a branch conflict — same branch; the duplicate-row condition is recorded as a **data-quality note** for future work, not a backfill blocker.

## 5. Verification (post-backfill)

- `SELECT role, count(*) FILTER (WHERE branch_id IS NULL) FROM profiles WHERE role='PARENT' GROUP BY role;` → expect `0` NULL for PARENT.
- Confirm no profile changed school, no SUPER_ADMIN behavior touched, no non-PARENT rows touched.
