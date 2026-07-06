# Permission System

## Overview
Role-Based Access Control (RBAC) with granular permissions for fine-grained access management.

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

## Default Roles

### Super Admin
- Full system access
- Manage all schools
- System configuration
- User management across schools

### School Admin
- Manage school settings
- Manage all users in school
- View all reports
- Manage academic structure

### Principal
- Full academic control
- Staff management
- Financial reports
- Approve leave requests

### Vice Principal
- Academic management
- Student discipline
- Attendance oversight
- Report generation

### Department Head
- Manage department teachers
- Assign subjects
- View department reports
- Approve substitutions

### Teacher
- Manage assigned classes
- Mark attendance
- Enter grades
- View student profiles (assigned)

### Staff
- Limited system access
- Specific module access
- View-only permissions

### Parent
- View children's information
- View attendance
- View results
- Pay fees
- Communicate with teachers

### Student
- View own profile
- View own attendance
- View own results
- View assignments

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
- library
- transport
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

## API Authorization

### Middleware
```typescript
// Example authorization middleware
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'principal')
@Permissions('students:read_all')
async getStudents() {
  // ...
}
```

### Resource-Level Authorization
```typescript
// Teacher can only access assigned classes
async getStudents(user: User) {
  if (user.role === 'teacher') {
    return this.studentService.findByTeacherId(user.id);
  }
  return this.studentService.findAll();
}
```

## Custom Roles
- Create custom roles per school
- Assign granular permissions
- Override default role permissions
- Role inheritance support

## Audit Logging
- All permission changes logged
- Access denied events logged
- Admin actions tracked
- Report generation logged
