# LOOP_004 - STUDENTS

## Objective
Implement student management with CRUD operations, search, and import.

## Allowed Files
- src/actions/students.ts
- src/lib/validations/student.ts
- src/app/(dashboard)/students/*.tsx
- src/components/students/*.tsx
- prisma/schema.prisma (with approval)

## Forbidden Files
- src/app/(auth)/* (do not touch)
- src/components/ui/* (use existing)

## Tasks
1. [ ] Create student schema (Prisma)
2. [ ] Create student validation (Zod)
3. [ ] Create student server actions
4. [ ] Create student list page
5. [ ] Create student detail page
6. [ ] Create student form (add/edit)
7. [ ] Implement search and filters
8. [ ] Implement pagination
9. [ ] Implement import functionality
10. [ ] Implement export functionality

## Acceptance Criteria
- [ ] Student CRUD working
- [ ] Search by name/admission number
- [ ] Filter by class/section/status
- [ ] Pagination working (20 per page)
- [ ] Import from CSV working
- [ ] Export to CSV working
- [ ] Form validation working
- [ ] Error handling working
- [ ] Loading states implemented
- [ ] Empty states implemented

## Stop Condition
Task complete when student management is fully functional.

## Dependencies
- LOOP_003 (Dashboard) complete
- Class/Section data available

## Estimated Time
4 days
