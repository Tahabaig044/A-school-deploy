# 05 - DATABASE

> Database rules. Ye follow karo toh kabhi data loss nahi hoga.

---

## Database Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Database | PostgreSQL 15+ | Primary storage |
| ORM | Prisma 5.x | Type-safe queries |
| Hosting | Supabase | Managed database |
| Migrations | Prisma Migrate | Schema changes |

## Core Rules

### NEVER Rules

1. **Never run raw SQL without parameterization**
2. **Never delete data permanently (use soft delete)**
3. **Never change schema without approval**
4. **Never skip migrations**
5. **Never expose database URL**
6. **Never query without school_id filter**
7. **Never create N+1 queries**
8. **Never skip indexes on foreign keys**
9. **Never use SELECT * in production**
10. **Never commit migration files without testing**

### ALWAYS Rules

1. **Always use transactions for multiple operations**
2. **Always add indexes on foreign keys**
3. **Always use created_at and updated_at**
4. **Always validate with Zod before insert**
5. **Always filter by school_id**
6. **Always use pagination for lists**
7. **Always log important changes**
8. **Always backup before major changes**
9. **Always test migrations on dev first**
10. **Always document schema changes**

## Schema Principles

### Naming Convention
```sql
-- Tables: plural, snake_case
students, teachers, fee_structures

-- Columns: snake_case
first_name, created_at, school_id

-- Primary keys: id (UUID)
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- Foreign keys: {table}_id
student_id, class_id, school_id

-- Indexes: idx_{table}_{column}
idx_students_class_id, idx_attendance_date
```

### Required Columns
Every table must have:
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
school_id UUID REFERENCES schools(id) NOT NULL
```

### Soft Delete
```sql
-- Add to every important table
deleted_at TIMESTAMP,
is_deleted BOOLEAN DEFAULT false

-- Never use DELETE, always use
UPDATE table SET deleted_at = NOW() WHERE id = 'xxx';
```

## Common Patterns

### Multi-Tenancy
```typescript
// Every query must include school_id
const students = await prisma.student.findMany({
  where: {
    schoolId: user.schoolId,
    deletedAt: null
  }
});
```

### Pagination
```typescript
// Always paginate lists
const students = await prisma.student.findMany({
  where: { schoolId },
  skip: (page - 1) * limit,
  take: limit,
  orderBy: { createdAt: 'desc' }
});
```

### Transactions
```typescript
// Use for multiple operations
await prisma.$transaction(async (tx) => {
  const student = await tx.student.create({ data });
  await tx.attendance.create({ data });
  await tx.auditLog.create({ data });
});
```

## Index Strategy

### Required Indexes
```sql
-- Foreign keys
CREATE INDEX idx_students_school_id ON students(school_id);
CREATE INDEX idx_students_class_id ON students(class_id);

-- Common filters
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_student_id ON attendance(student_id);

-- Search fields
CREATE INDEX idx_students_admission_number ON students(admission_number);
CREATE INDEX idx_teachers_employee_id ON teachers(employee_id);
```

### Composite Indexes
```sql
-- For common query patterns
CREATE INDEX idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX idx_results_student_exam ON results(student_id, exam_id);
```

## Migration Rules

### Before Migration
- [ ] Test on development database
- [ ] Backup production database
- [ ] Review migration file
- [ ] Check for data loss

### Migration File
```typescript
// prisma/migrations/xxx_add_attendance.sql
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_attendance_student_id ON attendance(student_id);
CREATE INDEX idx_attendance_date ON attendance(date);
```

### After Migration
- [ ] Verify data integrity
- [ ] Check application works
- [ ] Monitor performance
- [ ] Update documentation

## Query Optimization

### Avoid N+1
```typescript
// Bad: N+1 queries
const students = await prisma.student.findMany();
for (const student of students) {
  const class = await prisma.class.findUnique({
    where: { id: student.classId }
  });
}

// Good: Include relation
const students = await prisma.student.findMany({
  include: { class: true }
});
```

### Use Select
```typescript
// Bad: Select all columns
const students = await prisma.student.findMany();

// Good: Select only needed
const students = await prisma.student.findMany({
  select: {
    id: true,
    firstName: true,
    lastName: true,
    admissionNumber: true
  }
});
```

### Use Cursor for Large Lists
```typescript
// Good: Cursor-based pagination
const students = await prisma.student.findMany({
  take: 20,
  skip: 1,
  cursor: { id: lastId }
});
```

## Backup Strategy

| Type | Frequency | Retention |
|------|-----------|-----------|
| Full | Daily | 30 days |
| Incremental | Hourly | 7 days |
| Schema | On change | Forever |

---

> **Remember:** Database is sacred. Changes carefully karo. Backup hamesha rakho.
