# 07 - PERMISSIONS

> Permission system. Ye ensure karta hai ki sirf authorized log kaam karein.

---

## Permission Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| RBAC | Custom | Role-based access |
| Context | Server Components | User context |
| Validation | Server Actions | Permission checks |

## Roles Hierarchy

```
Super Admin
    │
    ▼
School Admin
    │
    ├── Principal
    ├── Vice Principal
    │
    ▼
Department Head
    │
    ▼
Teacher
    │
    ▼
Staff
    │
    ▼
Parent
    │
    ▼
Student
```

## Permission Format

```
module:action
```

### Modules
- students
- teachers
- parents
- classes
- sections
- subjects
- attendance
- exams
- results
- fees
- reports
- settings
- users

### Actions
- create
- read
- read_all
- update
- delete
- export
- import
- approve
- assign

## Permission Matrix

| Module | Super Admin | School Admin | Principal | Teacher | Parent | Student |
|--------|-------------|--------------|-----------|---------|--------|---------|
| students | CRUD | CRUD | CRU | R (assigned) | R (children) | R (self) |
| teachers | CRUD | CRUD | CRU | R | - | - |
| classes | CRUD | CRUD | CRU | R (assigned) | R (children) | R (self) |
| attendance | CRUD | CRUD | CRU | CRU (assigned) | R (children) | R (self) |
| exams | CRUD | CRUD | CRU | CRU (subjects) | R (children) | R (self) |
| results | CRUD | CRUD | CRU | CR (subjects) | R (children) | R (self) |
| fees | CRUD | CRUD | CRU | R | CRU (children) | R (self) |
| reports | CRUD | CRUD | CRU | R (assigned) | R (children) | R (self) |
| settings | CRUD | CRU | R | - | - | - |

## Core Rules

### NEVER Rules

1. **Never trust client-side permission checks**
2. **Never skip permission verification**
3. **Never expose permission errors to client**
4. **Never hardcode permissions**
5. **Never skip audit logging**
6. **Never allow permission escalation**
7. **Never skip school context check**
8. **Never allow cross-tenant access**
9. **Never skip branch context**
10. **Never trust hidden fields**

### ALWAYS Rules

1. **Always verify permissions server-side**
2. **Always check school context**
3. **Always check branch context**
4. **Always log permission denials**
5. **Always use principle of least privilege**
6. **Always validate ownership**
7. **Always check resource access**
8. **Always verify role hierarchy**
9. **Always audit sensitive actions**
10. **Always deny by default**

## Implementation

### Permission Check Function
```typescript
// lib/permissions.ts
import { prisma } from '@/lib/prisma'

export async function checkPermission(
  userId: string,
  permission: string,
  resourceId?: string
): Promise<boolean> {
  // 1. Get user with role
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true }
  })

  if (!user || !user.role) return false

  // 2. Check role permissions
  const hasPermission = user.role.permissions.includes(permission)
  if (!hasPermission) return false

  // 3. Check resource ownership if needed
  if (resourceId) {
    const isOwner = await checkResourceOwnership(userId, resourceId)
    if (!isOwner) return false
  }

  return true
}
```

### Server Action with Permission Check
```typescript
// actions/students.ts
'use server'

import { checkPermission } from '@/lib/permissions'
import { getUser } from '@/lib/auth'

export async function deleteStudent(studentId: string) {
  // 1. Get current user
  const user = await getUser()
  if (!user) throw new Error('Unauthorized')

  // 2. Check permission
  const hasPermission = await checkPermission(
    user.id,
    'students:delete',
    studentId
  )
  if (!hasPermission) {
    // Log denial
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'DELETE_STUDENT',
        resourceId: studentId,
        success: false,
        reason: 'Permission denied'
      }
    })
    throw new Error('Permission denied')
  }

  // 3. Check school context
  const student = await prisma.student.findUnique({
    where: { id: studentId }
  })
  if (student.schoolId !== user.schoolId) {
    throw new Error('Access denied')
  }

  // 4. Perform action
  await prisma.student.update({
    where: { id: studentId },
    data: { deletedAt: new Date() }
  })

  // 5. Log audit
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'DELETE_STUDENT',
      resourceId: studentId,
      success: true
    }
  })

  return { success: true }
}
```

### Resource Ownership Check
```typescript
async function checkResourceOwnership(
  userId: string,
  resourceId: string
): Promise<boolean> {
  // Check if user owns the resource
  const resource = await prisma.student.findUnique({
    where: { id: resourceId }
  })

  if (!resource) return false

  // Teachers can only access their assigned students
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { teacher: true }
  })

  if (user?.role === 'TEACHER') {
    const assignment = await prisma.teacherAssignment.findFirst({
      where: {
        teacherId: user.teacher?.id,
        classId: resource.classId
      }
    })
    return !!assignment
  }

  // Parents can only access their children
  if (user?.role === 'PARENT') {
    return resource.parentId === userId
  }

  // Students can only access themselves
  if (user?.role === 'STUDENT') {
    return resource.userId === userId
  }

  return true
}
```

## Multi-Tenancy Check

```typescript
// Every query must include school_id
export async function verifySchoolContext(
  userId: string,
  schoolId: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  return user?.schoolId === schoolId
}
```

## Audit Logging

```typescript
// Log all permission checks
await prisma.auditLog.create({
  data: {
    userId: user.id,
    action: 'PERMISSION_CHECK',
    resource: 'students',
    resourceId: studentId,
    permission: 'students:delete',
    granted: hasPermission,
    ip: getClientIp(),
  }
})
```

## Forbidden Files

Ye files modify karne ke liye approval zaroori hai:

| File | Reason |
|------|--------|
| prisma/schema.prisma | Schema change |
| middleware.ts | Auth change |
| lib/permissions.ts | Permission logic |
| lib/auth.ts | Auth logic |

---

> **Remember:** Permission system is the guardian. Never bypass it. Never trust the client.
