# ADR_003 - SOFT DELETE

## Status

Approved

## Context

Need to preserve data for audit and recovery.

## Decision

Use soft delete for all important tables:

- Add `deleted_at` timestamp column
- Add `is_deleted` boolean column
- Never use DELETE, always UPDATE
- Filter by `deleted_at IS NULL`

## Consequences

### Positive

- Data preservation
- Easy recovery
- Audit trail
- No accidental data loss

### Negative

- Storage overhead
- Query complexity
- Index bloat

## Implementation

```sql
ALTER TABLE table_name ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE table_name ADD COLUMN is_deleted BOOLEAN DEFAULT false;
```

## Date

[Date]
