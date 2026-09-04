# LOOP_001 - AUTHENTICATION

## Objective

Implement login, register, JWT authentication, and session management.

## Allowed Files

- src/actions/auth.ts
- src/lib/auth.ts
- src/lib/supabase.ts
- src/app/(auth)/login/page.tsx
- src/app/(auth)/register/page.tsx
- src/components/auth/*.tsx
- src/lib/validations/auth.ts
- prisma/schema.prisma (with approval)

## Forbidden Files

- src/app/(dashboard)/* (do not touch)
- src/components/ui/* (use existing)
- package.json (no new dependencies)
- next.config.js

## Tasks

1. [ ] Create Supabase client
2. [ ] Create auth actions (login, register, logout)
3. [ ] Create login page
4. [ ] Create register page
5. [ ] Create middleware for route protection
6. [ ] Add Zod validation
7. [ ] Add rate limiting
8. [ ] Add audit logging

## Acceptance Criteria

- [ ] User can register with email/password
- [ ] User can login
- [ ] User can logout
- [ ] JWT token stored in httpOnly cookie
- [ ] Protected routes redirect to login
- [ ] Public routes redirect to dashboard if logged in
- [ ] Password hashed with bcrypt
- [ ] Input validation with Zod
- [ ] Rate limiting on auth endpoints
- [ ] Audit logging working

## Stop Condition

Task complete when user can register, login, and access protected routes.

## Dependencies

- Supabase project configured
- Database schema created

## Estimated Time

2 days
