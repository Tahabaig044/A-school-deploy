<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Context

## Tech Stack

- Next.js 16 (Turbopack), TypeScript, Tailwind CSS, Prisma 7, PostgreSQL (Supabase), Supabase Auth, Server Actions, Zod
- Multi-Tenant, Role-Based Access Control, Server Components First
- 11 roles: SUPER_ADMIN, SCHOOL_ADMIN, BRANCH_ADMIN, TEACHER, STUDENT, PARENT, ACCOUNTANT, ADMISSION_OFFICER, LIBRARIAN, TRANSPORT_MANAGER
- Prisma generated output at `../lib/generated/prisma` (not default location)
- `proxy.ts` at project root serves as Next.js 16 middleware (replaces `middleware.ts`)

## Completed Work

- **Loop 1:** Core System Stabilization — TypeScript errors, auth fixes, sidebar active state, PORTAL_ROLES, error handling, edit/delete CRUD
- **Loop 2:** Permissions Audit — school-context isolation, notification/message/announcement/homework authorization, page-level scoping
- **Loop 3:** Dashboard Stabilization — loading state, mobile portal sidebar, notifications dropdown, user dropdown, menu items, delete error handling, branch cookie
- **Loop 4:** Complete CRUD Standardization — Added missing update functions (session, section, timetable), invoice cancellation, user edit/delete, student list actions, attendance school scoping
- **Loop 5:** Performance Optimization — Eliminated double auth calls, batched N+1 bulk operations, added pagination to 4 list pages, parallelized sequential queries, configured Prisma pool

## Constraints

- Do NOT rewrite working code, redesign UI, rename routes/folders, add/remove modules, modify auth/permissions/middleware/schema
- Do NOT continue loops automatically — stop after each assigned loop
- Keep `npm run build` passing, TypeScript error-free, Prisma consistent
- Generate reports after every loop
