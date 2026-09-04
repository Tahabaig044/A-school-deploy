# RLS Phase 2B — Student / Parent Stable Identity
## Deliverable 5: `STUDENT_PARENT_IDENTITY_PLAN.md`

## 1. Current relationship (verified from schema + live data)

| Link | Mechanism | Status |
|---|---|---|
| `Student` ↔ `Profile` | **None.** `Student` model has NO `profileId` field. | Email-based only |
| `Parent` ↔ `Profile` | `Parent.profileId` (nullable, `@unique`) exists | **All 27 rows = NULL** |
| `Student` ↔ `Parent` | `StudentParent` join table (composite PK studentId+parentId, onDelete Cascade) | 27 parents ↔ 51 students |
| `IdCard` ↔ `Profile` | `IdCard.profileId` `@unique` | 1 row, works |
| `Teacher` / `Staff` ↔ `Profile` | `profileId` `@unique` nullable | present (9 / 4) |

## 2. Email-based portal identity (current logic, verified)

- **PARENT portal:** resolves the parent via `Parent.email = Profile.email` (`parent-portal.actions.ts`).
- **STUDENT portal:** resolves via `Student.email = Profile.email` (`student-portal.actions.ts`).
- Verified in data: parent-table emails `parent1…25@greenwood.edu` **exactly match** the 25 PARENT-role `profiles.email` — the bridge works today, but by string equality only.

## 3. Why email is NOT a safe permanent identity

- `profiles.email` is `@unique`, but **`Student.email` and `Parent.email` are NOT unique** (indexed only). Two students/parents with the same email across schools are indistinguishable.
- Cross-school email duplicates (Phase 1 §7 risk #13) can make a user resolve to the wrong entity → wrong child's data exposed.
- Email is mutable / user-controlled; not a stable FK.
- Reassignment / school-merge scenarios break email matching.

## 4. Affected files (email-keyed, from Phase 1/2A)

- `actions/parent-portal.actions.ts` — parent resolution by email.
- `actions/student-portal.actions.ts` — student resolution by email.
- `actions/exam.actions.ts` (`getStudentExamResults`, `getStudentReportCards`, helper) — own-record resolve via email.
- `services/` (id-card) uses `Profile.id`, already stable.

## 5. Proposed stable FK (writes are documented — migration/phase gate)

**Design:** link `Profile → Student` by adding a **foreign-key-constrained** `Student.profileId` (unique, nullable) mirroring `Parent.profileId`/`Teacher.profileId`/`Staff.profileId` already present. Student/Parent portals then key on `profile.id` instead of email.

```sql
-- DIAGRAM (for migration plan; NOT executed in Phase 2B)
ALTER TABLE students ADD COLUMN profile_id uuid UNIQUE REFERENCES profiles(id);
-- backfill deterministic pairs
UPDATE students s SET profile_id = pr.id
FROM profiles pr
WHERE pr.role = 'STUDENT' AND pr.school_id = s.school_id AND pr.email = s.email
  AND NOT EXISTS (SELECT 1 FROM students s2 WHERE s2.school_id = s.school_id AND s2.email = s.email AND s2.id <> s.id);
-- same pattern for parents via existing Parent.profileId (currently all NULL):
UPDATE parents p SET profile_id = pr.id
FROM profiles pr
WHERE pr.role = 'PARENT' AND pr.school_id = p.school_id AND pr.email = p.email
  AND NOT EXISTS (SELECT 1 FROM parents p2 WHERE p2.school_id = p.school_id AND p2.email = p.email AND p2.id <> p.id);
```

## 6. Migration strategy (ADD → BACKFILL → VERIFY → CONSTRAIN)

1. **Pre-migration audit:** count email collisions per school (`profiles.email` vs `Student.email` / `Parent.email`). In current data: 1-to-1, no collisions (verified: parent emails match profiles exactly; student `baigtaha686@gmail.com` matches 1 student).
2. **Backup recommendation:** `pg_dump` of `students`, `parents`, `profiles` before any ALTER (or Supabase PITR snapshot). **Backup before execution** — not executed in this phase.
3. **Add nullable unique column** (`Student.profile_id`; backfill into existing `Parent.profile_id`).
4. **Backfill** only the deterministic email pairs (above); skip ambiguous (0 expected).
5. **Verify:** every Student/Profile with an email pair is linked; no student linked to wrong-school profile; count of linked = count of email-matched.
6. **Constrain:** after verification, `ALTER COLUMN … SET NOT NULL` is safe; then move portal resolution off email to `profileId`. (Application code change required — Phase 2C/2D, documented not executed.)
7. **Rollback:** standard (reverse ALTER + keep nullable) — safe because column addition is additive.

## 7. Existing-record migration & ambiguity

- **Teacher/Staff** already have `profileId` (FK) — no change.
- **Parent.profileId** exists but empty — pure backfill, deterministic (email + school match, 1:1).
- **Student.profileId** — new column; deterministic email match in current data.
- **Ambiguous records:** none in current dataset (verified 1:1). If any future collision: leave `profileId NULL` and **flag REQUIRES_HUMAN_DECISION** (never guess the person link).

## 8. Rollback strategy

- Additive column: `ALTER TABLE students DROP COLUMN profile_id;` (or simply leave NULL).
- Portal code, if migrated later, can be reverted to email resolution without data loss.

## 9. Decision summary

**Existing schema does NOT already provide a stable Student↔Profile FK.** It provides `Parent.profileId` (unused) only. Phase 2B **documents** the plan; the column addition + portal-migration are gated to a reviewed migration/Phase 2C (requires schema + application change, not a "safe minimal" auto-fix).
