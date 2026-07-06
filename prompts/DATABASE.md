# DATABASE_PROMPT

## Usage
When working with database, use this prompt.

## Prompt

```
Read:
- 00_AI_MASTER_RULES.md
- 05_DATABASE.md
- Files to modify

Task:
1. Check schema changes
2. Verify indexes
3. Check foreign keys
4. Verify constraints
5. Test migrations
6. Check performance

Database Checklist:
- [ ] Schema follows conventions
- [ ] Indexes on foreign keys
- [ ] Soft delete implemented
- [ ] School ID on all tables
- [ ] Created/updated at fields
- [ ] Constraints enforced
- [ ] Migration tested
- [ ] Rollback available

Forbidden:
- Do not drop tables
- Do not delete data
- Do not change schema without approval
```
