# MIGRATION_TEMPLATE

## Migration Information

| Field | Value |
|-------|-------|
| Migration ID | [ID] |
| Date | [Date] |
| Author | [Name] |

## Description

[What this migration does]

## Changes

### Tables Added

```sql
CREATE TABLE [table_name] (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- columns
);
```

### Tables Modified

```sql
ALTER TABLE [table_name] ADD COLUMN [column] [type];
```

### Indexes Added

```sql
CREATE INDEX [index_name] ON [table_name]([column]);
```

## Rollback

```sql
-- Reverse migration
DROP TABLE IF EXISTS [table_name];
```

## Testing

- [ ] Migration runs successfully
- [ ] Rollback works
- [ ] Data integrity maintained
- [ ] Application works after migration

## Notes

[Any additional notes]
