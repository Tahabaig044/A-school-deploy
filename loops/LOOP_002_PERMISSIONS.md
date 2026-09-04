# LOOP_002 - PERMISSIONS

## Objective

Implement role-based access control (RBAC) with permission checks.

## Allowed Files

- src/lib/permissions.ts
- src/lib/auth.ts
- src/actions/admin.ts
- prisma/schema.prisma (with approval)

## Forbidden Files

- src/app/(dashboard)/* (do not touch)
- src/components/ui/* (use existing)

## Tasks

1. [ ] Define roles in database
2. [ ] Define permissions in database
3. [ ] Create permission check function
4. [ ] Create role check middleware
5. [ ] Add permission checks to server actions
6. [ ] Add audit logging for permission denials

## Acceptance Criteria

- [ ] Roles defined (Super Admin, Admin, Teacher, Parent, Student)
- [ ] Permissions defined per role
- [ ] Permission check function working
- [ ] Server actions verify permissions
- [ ] Permission denials logged
- [ ] Cross-tenant access blocked

## Stop Condition

Task complete when RBAC is enforced on all protected routes and actions.

## Dependencies

- LOOP_001 (Authentication) complete

## Estimated Time

2 days
