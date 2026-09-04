# LOOP_005 - SYSTEM HARDENING & BUILD REPAIR

## Objective

Eliminate the module-global request-context pattern (React `cache()` migration), scope dashboard aggregates to the tenant, validate the `selected_branch` cookie, dedupe auth/profile lookups, and clear all 36 pre-existing build-blocking TypeScript errors so `npm run build` passes again.

## Allowed Files

- lib/auth.ts
- lib/dashboard-validation.ts
- app/(dashboard)/layout.tsx
- app/portal/layout.tsx
- app/portal/**/*.tsx
- actions/reports.actions.ts
- actions/parent-portal.actions.ts
- actions/id-card-generator.actions.ts
- lib/pdf-utils.ts
- app/api/qr/route.ts
- app/(dashboard)/dashboard/students/id-card/*
- app/(dashboard)/dashboard/students/id-cards/*
- app/(dashboard)/dashboard/attendance/qr-cards/*
- app/(dashboard)/dashboard/attendance/scan/*
- app/(dashboard)/dashboard/page.tsx

## Forbidden Files

- prisma/schema.prisma (do not modify)
- package.json (no new/removed dependencies)

## Tasks

1. [x] Remove module-global request context (setRequestContext/getRequestContext/clearRequestContext) in favor of React `cache()`
2. [x] Rewrite `lib/auth.ts` getCurrentUser/getCurrentProfile as cached; keep requireAuth/requireRole
3. [x] Refactor all 4 dashboard validators to use cached getters
4. [x] Rewrite `app/(dashboard)/layout.tsx` and `app/portal/layout.tsx` to drop context + try/finally
5. [x] Unwrap all 12 portal pages (remove headers, context, try/finally, duplicate profile queries)
6. [x] F12: scope reports aggregates (payment, feeInvoice, leaveRequest) by schoolId (+branchId when set)
7. [x] F13: validate `selected_branch` cookie against branch.isActive + tenant before use
8. [x] F16: dedupe auth/profile calls in parent portal actions
9. [x] Fix `actions/id-card-generator.actions.ts` (department/designation not in schema)
10. [x] Fix `lib/pdf-utils.ts` (missing jspdf-autotable, duplicate export, avatarUrl, PdfOptions, rotate, margin, Buffer types)
11. [x] Fix `app/api/qr/route.ts` (Buffer -> BodyInit)
12. [x] Fix id-card single view + generator (invalid profile include, BlobPart, Select handlers)
13. [x] Fix qr-card-generator + qr-scanner (SetStateAction<string> Select handlers)

## Acceptance Criteria

- [x] `npx tsc --noEmit` -> 0 errors
- [x] `npm run build` -> passes (TypeScript gate + 116 static pages + all routes)
- [x] No references to setRequestContext/getRequestContext/clearRequestContext remain
- [x] No module added/removed; schema untouched

## Stop Condition

Task complete when the build passes with zero TypeScript errors and the Phase 1 audit fixes are in.

## Dependencies

- Loop 1-4 stabilization complete

## Estimated Time

2 days
