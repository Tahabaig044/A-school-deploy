# Demo & Trial System — Implementation Plan

Status: **In progress — Phases 1-4 code-complete, not yet applied to any database.**

Progress by phase:

| Phase                                    | Code        | Database       | Notes                                                                    |
| ---------------------------------------- | ----------- | -------------- | ------------------------------------------------------------------------ |
| 1. Schema, plans, configuration          | done        | **not pushed** | `prisma db push` needs a `pg_dump` first; no `prisma/migrations/` exists |
| 2. Lifecycle, events, transitions, scope | done        | n/a            | pure + server split; CAS transitions                                     |
| 3. Limits, enforcement, notices          | done        | n/a            | UI notice not mounted until Phase 9                                      |
| 4. Deterministic seed runner             | done        | n/a            | 13 phases, academic + finance + library                                  |
| 5. Persona provisioning                  | done        | n/a            | real Supabase Auth users; out-of-band phase                              |
| 6-12. Request flow, UI, billing, expiry  | not started | n/a            |                                                                          |

Phase 4 seeds every domain in §17.3. `services/demo/seed-data.ts` holds the phases;
`services/demo/seed-config.ts` holds the §17.2 volumes that `scripts/demo-verify.ts`
checks the result against, so the two cannot drift.

Phase 5 (`lib/demo/personas.ts`, `lib/demo/persona-plan.ts`) provisions the four
personas as real Supabase Auth users per §12. Persona provisioning is an **out-of-band
phase**: it is the only seed phase that creates auth users, its effects cannot be
undone by dropping rows, and it needs a service-role key. `npm run demo:seed` therefore
excludes it unless `--with-personas` is passed, and `--personas-only` re-runs it alone.

The three portals resolve their domain row differently, and persona provisioning
depends on all three:

- teacher — `teacher.findFirst({ profileId: userId })`, so the profile id _is_ the auth
  user id
- student — `student.findFirst({ email: profile.email })`
- parent — `parent.findFirst({ email: profile.email })`
- admin — no lookup; a bare `Profile` with `SCHOOL_ADMIN` reads the school through
  `profile.schoolId`

The seed therefore creates no placeholder teacher `Profile` rows. A `Profile` with an
invented UUID would never match an auth user id, and the teacher persona would sign in
to an empty portal.

## Current state: what has actually been executed

Phases 1-5 are code-complete and have now been exercised against real databases. Two
findings from that work change the rollout assumptions recorded below.

**The additive schema is applied to production, but `prisma db push` must never be run
there.** The live Supabase database holds 16 tables that `prisma/schema.prisma` does not
model, so a raw `db push` proposes `DROP TABLE` for all of them — including `users`,
`site_settings`, `invoices`, `projects`, `services`, and `support_tickets`, which held
real rows. The migration was instead generated from Prisma's own diff output, filtered
down to the additive blocks, backed up, and applied as an allowlisted transaction:

- 89 → 95 public tables; 5 enums, 20 indexes, 6 FKs added; nothing dropped
- all six populated legacy tables retained their exact row counts
- verified by an allowlist filter that rejects any `DROP`/`ALTER`/`TRUNCATE`
- the standing hazard remains: the next person to run `db push` will lose those tables,
  so the schema must be reconciled or the legacy tables declared before that happens

**Re-seeding a tenant is currently impossible, because purge is Phase 11.** The seed's
own error message says to purge before re-seeding, and `PURGED` exists as a status with
tested lifecycle rules — but nothing deletes anything. All 30 school-scoped tables are
`ON DELETE RESTRICT`, so a purge needs dependency-ordered deletes rather than a cascade.
A second run against an existing slug fails on the `School.code` unique constraint. This
is expected until Phase 11 lands, not a regression.

Verification status as of now:

- determinism holds: two seeds into two independent databases produce byte-identical
  content across all 34 school-scoped tables, once `purge_after` and other wall-clock
  columns are excluded from comparison
- `scripts/demo-verify.ts` passes 16/16 with 4 expected skips in both databases
- 352 unit tests, 100% coverage on the demo libraries, clean typecheck, lint, and build

Persona provisioning (Phase 5's auth half) is still unverified: it needs a Supabase Auth
endpoint, and the local staging database is plain PostgreSQL.

Two test tenants accidentally created on production during this work (`seedtest-a1`,
`localtest-a1`) have been removed. Both were still `PROVISIONING` with no school and no
seeded rows, so the delete touched only `demo_tenants` and `demo_events`; the six
populated legacy tables were re-counted inside the transaction and were unchanged.
Production is now clean: 1 school, 0 demo tenants, 0 demo personas, 0 demo events,
4 plans, 36 limits.

Scope of this document: a codebase-grounded plan for a production-grade, self-serve demo and trial subsystem for The Schooling System.

---

## Table of Contents

1. [Purpose, Scope, and Definitions](#1-purpose-scope-and-definitions)
2. [Goals and Non-Goals](#2-goals-and-non-goals)
3. [Existing System Baseline (Verified Facts)](#3-existing-system-baseline-verified-facts)
4. [Architecture Overview](#4-architecture-overview)
5. [Demo Lifecycle State Machine](#5-demo-lifecycle-state-machine)
6. [Data Model — `DemoTenant`](#6-data-model--demotenant)
7. [Data Model — `DemoPersona`](#7-data-model--demopersona)
8. [Data Model — `Plan` and `PlanLimit`](#8-data-model--plan-and-planlimit)
9. [Data Model — `DemoEvent` and `DemoExtensionRequest`](#9-data-model--demoevent-and-demoextensionrequest)
10. [Complete Prisma Schema Delta](#10-complete-prisma-schema-delta)
11. [Identity, Naming, and Global Uniqueness Strategy](#11-identity-naming-and-global-uniqueness-strategy)
12. [Authentication and Persona Account Strategy](#12-authentication-and-persona-account-strategy)
13. [Persona Role Switching](#13-persona-role-switching)
14. [Tenant Isolation and Security Model](#14-tenant-isolation-and-security-model)
15. [Abuse Prevention and Rate Limiting](#15-abuse-prevention-and-rate-limiting)
16. [Asynchronous Seeding and Status Polling](#16-asynchronous-seeding-and-status-polling)
17. [Realistic Seed Data Catalog](#17-realistic-seed-data-catalog)
18. [Provisioning Workflow (End to End)](#18-provisioning-workflow-end-to-end)
19. [Usage Limits and Plan Enforcement](#19-usage-limits-and-plan-enforcement)
20. [UI/UX Design — Public Demo and In-App Shell](#20-uiux-design--public-demo-and-in-app-shell)
21. [Server Actions, Route Handlers, and Background Execution](#21-server-actions-route-handlers-and-background-execution)
22. [Observability, Audit, and Analytics](#22-observability-audit-and-analytics)
23. [Data Retention, Cleanup, and Rollback](#23-data-retention-cleanup-and-rollback)
24. [Testing Strategy](#24-testing-strategy)
25. [Delivery Plan — 12 Phases](#25-delivery-plan--12-phases)
26. [Risks, Mitigations, and Open Questions](#26-risks-mitigations-and-open-questions)

---

## 1. Purpose, Scope, and Definitions

### 1.1 Purpose

Sales and evaluators need to see the real product working against realistic data, without a sales engineer provisioning a tenant by hand for every prospect. This document specifies a self-serve subsystem that provisions an isolated school tenant, seeds a coherent dataset, provisions real sign-in personas, enforces plan limits, and expires cleanly.

### 1.2 Product definitions

These three surfaces are distinguished because they have different trust, isolation, and cost profiles:

| Surface          | Audience           | Sign-in                                                                    | Data                        | Mutations                                  | Isolation                              | Plan limits                    |
| ---------------- | ------------------ | -------------------------------------------------------------------------- | --------------------------- | ------------------------------------------ | -------------------------------------- | ------------------------------ |
| **Public Demo**  | Anonymous prospect | None required to browse; personas sign in with a published shared password | Synthetic, fictional school | Read-mostly; a curated allowlist of writes | Dedicated tenant, read-only-by-default | Hard-capped small demo plan    |
| **Guided Trial** | Qualified lead     | Real invited account                                                       | Synthetic, fictional school | Full CRUD within plan                      | Dedicated tenant, same as production   | Enforced `Plan` limits         |
| **Production**   | Paying customer    | Real account                                                               | Customer data               | Full CRUD                                  | `schoolId` scoping                     | Plan limits; no demo lifecycle |

A tenant created through this subsystem is always flagged with a `DemoTenant` row. There is no "convert demo to production" path that reuses demo data; conversion means creating a fresh production school. This keeps synthetic data out of customer environments permanently.

### 1.3 In scope

- A `DemoTenant` lifecycle model covering provisioning, expiry, extension, and termination.
- Real Supabase Auth personas for Demo Admin, Teacher, Student, and Parent roles, all bound to one demo tenant.
- Asynchronous seed execution with a status endpoint the browser polls.
- A public request form plus an in-app persona switcher.
- DB-driven `Plan` and `PlanLimit` enforcement that reads from the database, not from code constants.
- Observability, retention, and an automated cleanup path.

### 1.4 Out of scope

- Rewriting authentication, RBAC, middleware, or tenant scoping that already works.
- Row Level Security adoption. RLS remains disabled per `RLS_PHASE_2B_STATUS.md`; isolation continues to be application-level.
- Any UI redesign of existing dashboard or portal pages beyond additive demo chrome.
- Mobile Flutter client changes. The existing `app/api/mobile/*` surface is untouched.

---

## 2. Goals and Non-Goals

### 2.1 Goals

1. **Zero-touch provisioning.** A prospect can land on a shared URL and be signed in as a working Demo Admin in under 60 seconds, without human intervention.
2. **Genuine realism.** The demo tenant contains a coherent academic year of data, not three rows per table. Dashboards, charts, and reports must render meaningfully on first paint.
3. **Real authentication.** Personas are genuine Supabase Auth users with genuine profiles. Switching personas performs a real sign-in and produces a real session.
4. **Zero authorization bypass.** There is no impersonation token, no role cookie, and no `SUPER_ADMIN` backdoor added to the demo path. Every request is authorized exactly as production requests are.
5. **Deterministic expiry.** Expiry is tenant-wide and enforced server-side on every protected read, not merely hidden in the UI.
6. **Operational safety.** A demo tenant can be extended, revoked, re-seeded, or deleted from an operator console with a full audit trail.
7. **Cost control.** Idle and expired tenants are cleaned up automatically so database and auth bloat stay bounded.

### 2.2 Non-Goals

- Multi-plan pricing strategy, billing, or payment capture. Stripe is present in the codebase but is not used for demo/trial conversion in this plan.
- Per-user demo tenants. One tenant, multiple personas.
- Anonymous read-only browsing without sign-in. A visitor must pick a persona to see product data; this keeps the attack surface identical to production.
- Analytics-driven product recommendations or lead scoring beyond a basic funnel count.

### 2.3 Success criteria

| Metric                                                | Target                    |
| ----------------------------------------------------- | ------------------------- |
| Time from `/demo` landing to signed-in Dashboard      | < 60 s at p50             |
| Seed completion for a full demo dataset               | < 90 s at p95             |
| Demo tenants provisioned per day without intervention | 25                        |
| Cross-tenant data leaks in security review            | 0                         |
| Expired-tenant sessions still serving product data    | 0                         |
| Demo-related support tickets about "it doesn't work"  | < 2% of trial conversions |

---

## 3. Existing System Baseline (Verified Facts)

Every statement in this section was verified against the repository. The plan is built on these facts; if any of them changes, the affected phase must be re-read.

### 3.1 Stack and tooling

| Item                 | Value                                                   | Source                                 |
| -------------------- | ------------------------------------------------------- | -------------------------------------- |
| Framework            | Next.js `16.2.9`, App Router, Server Components first   | `package.json`                         |
| React                | `19.2.4`                                                | `package.json`                         |
| Database             | PostgreSQL via Prisma `7.9.1` with `@prisma/adapter-pg` | `package.json`, `prisma/schema.prisma` |
| Prisma client output | `../lib/generated/prisma` (non-default)                 | `prisma/schema.prisma:1-4`             |
| Auth                 | Supabase Auth via `@supabase/ssr` `0.12.0`              | `lib/supabase/*`                       |
| Validation           | Zod `4.4.3`                                             | `package.json`                         |
| Script runner        | `tsx` `4.22.4`                                          | `package.json`                         |
| Test framework       | None installed                                          | `package.json` devDependencies         |

### 3.2 Schema shape

- `prisma/schema.prisma` contains **73 models** and **24 enums**. It is the single source of truth.
- There is **no `prisma/migrations/` directory**. The only `prisma/` content is `schema.prisma`. The project applies schema with `npm run db:push` (`prisma db push`). This plan must not introduce a migration-based workflow as a side effect.
- `Role` enum has 11 values: `SUPER_ADMIN`, `SCHOOL_ADMIN`, `BRANCH_ADMIN`, `PRINCIPAL`, `TEACHER`, `ACCOUNTANT`, `ADMISSION_OFFICER`, `LIBRARIAN`, `TRANSPORT_MANAGER`, `PARENT`, `STUDENT`. No demo-specific role is added.
- `Profile` is the identity join table. `id` is the Supabase Auth user id (`@id @db.Uuid`), and `email` is **globally** `@unique`.
- `School` is the tenant root. `Branch` is a sub-tenant with its own `code` and its own `@@unique([schoolId, branchId, code])`-style local constraints.
- `Student` has **no `profileId`**. `Parent.profileId` and `Teacher.profileId` are `@unique` and optional.
- `Profile.schoolId` and `Profile.branchId` are nullable, so a platform-level profile can exist without a tenant.

### 3.3 Authentication and authorization

- `proxy.ts` is the Next.js 16 middleware. It **does not query Prisma**. It reads `user.user_metadata.role` purely for coarse route redirects, and its own comments state this is defense-in-depth only.
- `lib/auth.ts` exposes `getCurrentUser()` (Supabase session), `getCurrentProfile()` (Prisma lookup by auth id), `requireAuth()`, and `requireRole(...roles)`. All are the real authorization boundary.
- `lib/school-context.ts` provides `getSchoolId()`, `getBranchId()`, and `getOptionalBranchId()`. For every non-`SUPER_ADMIN` role the tenant is taken from the profile and any `formData` value is **ignored**. This is the isolation primitive the demo subsystem must reuse rather than reinvent.
- `lib/permissions.ts` has `getPermissionsForRole()` which unions `ROLE_DEFAULTS[role]` with database grants. Because role defaults are always applied, **a plan limit cannot be expressed as a permission**; limits need a separate enforcement path (§19).
- `actions/auth.actions.ts` implements `signin()` with lockout (`MAX_FAILED_ATTEMPTS`, `LOCKOUT_DURATION_MINUTES`), active-status checks, 2FA branching, and `logAuditEvent()` on both success and failure. A shared demo password is compatible with lockout as long as the demo sign-in path does not weaken it.
- `proxy.ts` redirects `TEACHER` away from `/dashboard` to `/portal/teacher`, and restricts `/portal` to `STUDENT`, `PARENT`, `TEACHER` (`portalAllowedRoles`). Persona routing must align with this.
- There is no shared rate-limiting module in `lib/`. Demo rate limiting is new work (§15).

### 3.4 Portal identity resolution

`lib/dashboard-validation.ts` exports `validateTeacherPortal()`, `validateStudentPortal()`, `validateParentPortal()`, and `validateDashboardAccess()`.

- Teacher portal resolves `Teacher` by `profileId`.
- Student and parent portals resolve their entities by **matching `email`** against `Profile.email`, because `Student` has no `profileId` and `Parent` may have none.

Consequence: a demo student persona is only usable if the seeded `Student.email` and the `Profile.email` are identical, and the same applies to the parent persona. Phase 5 (§25) enforces this as a hard seeding invariant.

### 3.5 Layout insertion points

- `app/(dashboard)/layout.tsx` already performs the auth check, portal-role redirect, and parallel data fetch. It is the correct place for the demo banner and the demo-mode guard.
- `app/portal/layout.tsx` independently re-checks auth and `PORTAL_ROLES`, and is the correct place for the portal-side banner and switcher.
- Both layouts fetch on every navigation, so a guard placed here covers all child routes without touching individual pages.

### 3.6 Supabase client access

`lib/supabase/server.ts` exports two factories, both of which call `await cookies()`:

- `createClient()` — anon key, cookie-bound. Used for request-scoped user operations.
- `createServiceClient()` — service role key, but **still cookie-bound**.

A cookie-bound service client cannot be used from `after()`, a script, or a cron callback because there is no request. Phase 1 therefore adds a third, stateless admin client (`lib/supabase/admin.ts`). Reusing `createServiceClient()` in background work is a defect, not a shortcut.

### 3.7 Seeding and scripts

- `scripts/seed.ts` is 1,098 lines, opens its own `pg.Pool` with `PrismaPg`, and **truncates ~30 tables with `CASCADE`** at the start. It is a destructive full-database reset, not a reusable fixture builder. Demo seeding must not call into its truncation path.
- Existing verification scripts establish the convention this plan follows: `scripts/check-parents-schema.ts`, `scripts/check-profiles.ts`, `scripts/check-seed-data.ts`, `scripts/seed-auth-users.ts`, `scripts/seed-permissions.ts`, `scripts/create-super-admin.ts`.
- `package.json` has no `test` script. Verification is script-based plus manual.

### 3.8 Environment

`lib/env.ts` validates six variables with Zod: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_APP_URL`. The demo subsystem introduces no new required production variable; optional knobs are added with safe defaults and listed in §26.

---

## 4. Architecture Overview

### 4.1 Component map

```
                       ┌──────────────────────────────────────────┐
   prospect            │  Public route group  app/(demo)/demo      │
   ──────────►         │  landing · request form · persona cards  │
                       └───────────────────┬──────────────────────┘
                                           │ requestDemoTenant (server action)
                                           ▼
                       ┌──────────────────────────────────────────┐
                       │  actions/demo-tenant.actions.ts           │
                       │  Zod validate → rate limit → create       │
                       │  DemoTenant(PROVISIONING) → audit         │
                       └───────────────────┬──────────────────────┘
                                           │ after()
                                           ▼
                       ┌──────────────────────────────────────────┐
                       │  services/demo/seed-runner.ts             │
                       │  idempotent, resumable, progress reported │
                       └───────────────────┬──────────────────────┘
                                           │
             ┌─────────────────────────────┼─────────────────────────────┐
             ▼                             ▼                             ▼
   Prisma  (@prisma/adapter-pg)   supabase.auth.admin        DemoEvent (append-only)
   School/Profile/Student/…       4 persona accounts         request·seed·signin
             │                             │                       ·limit·expiry·purge
             └──────────────┬──────────────┘
                            ▼
              browser polls  /api/demo/status/[token]
                            │
                            ▼
              persona switcher → real signInWithPassword()
                            │
                            ▼
              app/(dashboard)/layout.tsx + app/portal/layout.tsx
              demo guard · banner · countdown · limit enforcement
                            │
                            ▼
              scheduled purge (app/api/cron/demo-purge)
              expired + idle DemoTenant rows → data delete → auth delete
```

### 4.2 New files by layer

| Path                                   | Layer      | Purpose                                                                                |
| -------------------------------------- | ---------- | -------------------------------------------------------------------------------------- |
| `lib/demo/constants.ts`                | lib        | Status enums mirrored as string unions, plan keys, seeded-code prefixes                |
| `lib/demo/plans.ts`                    | lib        | `Plan`/`PlanLimit` definitions and seeding payload (code, not enforcement)             |
| `lib/demo/limits.ts`                   | lib        | `evaluateLimit()` pure function, unit-testable, no I/O                                 |
| `lib/demo/scope.ts`                    | lib        | `getDemoContext()` server-only guard: resolves tenant + `DemoTenant` row for a profile |
| `lib/demo/purge.ts`                    | lib        | Ordered teardown of a demo tenant's rows and auth users                                |
| `lib/demo/slug.ts`                     | lib        | Collision-free, globally-unique code generation (§11)                                  |
| `lib/supabase/admin.ts`                | lib        | Stateless service-role client (no `cookies()`)                                         |
| `services/demo/seed-runner.ts`         | services   | Async seed orchestration, progress, resume, idempotency                                |
| `services/demo/seed-data.ts`           | services   | Fictional dataset definition (no side effects)                                         |
| `services/demo/personas.ts`            | services   | Supabase Auth persona creation/lookup/deletion                                         |
| `actions/demo-tenant.actions.ts`       | actions    | Public request, extension request, admin lifecycle mutations                           |
| `actions/demo-persona.actions.ts`      | actions    | Persona switch, sign-out-all-other-personas                                            |
| `app/api/demo/status/[token]/route.ts` | route      | Poll endpoint, token-scoped, no session required                                       |
| `app/api/cron/demo-purge/route.ts`     | route      | Scheduled expiry/idle purge                                                            |
| `components/demo/*`                    | components | Banner, countdown, switcher, limit notice, request form, status poller                 |
| `scripts/demo-verify.ts`               | scripts    | Post-provision invariant verification (§24)                                            |
| `scripts/seed-plans.ts`                | scripts    | Idempotent `Plan`/`PlanLimit` seeding                                                  |

### 4.3 Request-path guard placement

The demo guard must sit in the two layouts, not in `proxy.ts`:

- `proxy.ts` cannot read Prisma (documented constraint in the file itself, lines 159-162). Adding a database call there would regress every request.
- `app/(dashboard)/layout.tsx` and `app/portal/layout.tsx` already resolve the profile and already run before any child page renders. One guard there covers ~all product routes.
- Server actions remain independently protected: each action already calls `requireRole()` or `getSchoolId()`. The demo guard in layouts is a UX and lifecycle control, not the authorization boundary.

### 4.4 Trust boundaries

| Boundary                          | Trust        | Rule                                                                   |
| --------------------------------- | ------------ | ---------------------------------------------------------------------- |
| Browser → status endpoint         | Untrusted    | Token-only, read-only, returns coarse state, never returns tenant data |
| Browser → public request action   | Untrusted    | Zod validation, rate limit, CAPTCHA, no tenant data in response        |
| Signed-in persona → product pages | Semi-trusted | Normal `requireRole()` + `schoolId` scoping, plus demo lifecycle guard |
| Server → Supabase Admin API       | Trusted      | Service role; only in `services/demo/*` and purge                      |
| Operator console                  | Trusted      | `SUPER_ADMIN` only, re-validated DB-side, fully audited                |

---

## 5. Demo Lifecycle State Machine

### 5.1 States

| State          | Meaning                        | Product access     | Auth users exist      | Data seeded        |
| -------------- | ------------------------------ | ------------------ | --------------------- | ------------------ |
| `REQUESTED`    | Form accepted, not yet started | none               | no                    | no                 |
| `PROVISIONING` | Seed worker running            | none               | partial               | partial            |
| `SEEDING`      | Tenant rows being created      | none               | partial               | partial            |
| `READY`        | Seed and personas complete     | full, plan-limited | yes                   | yes                |
| `EXPIRED`      | `expiresAt` passed, grace over | none               | yes (sign-in refused) | yes, pending purge |
| `REVOKED`      | Operator revoked for abuse     | none               | deleted               | pending purge      |
| `PURGED`       | Data and auth removed          | none               | no                    | no                 |
| `FAILED`       | Seed or persona step failed    | none               | partial, rolled back  | none               |

### 5.2 Transitions

```
REQUESTED ──► PROVISIONING ──► SEEDING ──► READY
    │             │              │           │
    │             ▼              ▼           ▼
    └────────► FAILED ◄───────────┘        EXPIRED (expiresAt + grace)
                  │                            │
                  │ cleanup                     ▼
                  └──────────────────────► PURGED
                                              ▲
                                  REVOKED ────┘
```

Rules attached to the machine:

- `READY → EXPIRED` is evaluated **on read**, not by a job. A request to a product page for a tenant whose `expiresAt <= now` transitions the row and refuses access. The cron job is an optimization, not the enforcement point.
- `EXPIRED → PURGED` occurs only after `purgeAfter`, which is set to `expiresAt + retentionWindow`, so an expired tenant remains auditable.
- Any state transition to a terminal state is written to `DemoEvent` and `AuditLog` in the same transaction where feasible.
- `PROVISIONING`/`SEEDING` have a `seedAttempts` counter. A tenant that fails twice moves to `FAILED` and is auto-purged, preventing orphaned half-seeded tenants.
- Terminal states (`PURGED`, `REVOKED`) are write-once. Re-provisioning the same slug creates a new row; it never resurrects an old one.

---

## 6. Data Model — `DemoTenant`

One row per demo or trial tenant. This table is the single authority for lifecycle; it is separate from `School` so that production schools never carry demo flags, and so a terminated demo leaves no residue in the core schema.

| Column                    | Type                                     | Notes                                                                                                                                              |
| ------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                      | `String` `@id @default(uuid()) @db.Uuid` | PK                                                                                                                                                 |
| `slug`                    | `String` `@unique`                       | Public token-safe identifier used in URLs                                                                                                          |
| `schoolId`                | `String?` `@unique @db.Uuid`             | 1:1 with the created `School`; nulled when the tenant is purged, so the operator console keeps accurate history without a live foreign key (§23.2) |
| `planId`                  | `String?` `@db.Uuid`                     | FK to `Plan`; null means internal/unlimited test tenant                                                                                            |
| `status`                  | `DemoStatus`                             | Default `REQUESTED`                                                                                                                                |
| `seedStatus`              | `DemoSeedStatus`                         | Default `PENDING`                                                                                                                                  |
| `seedProgress`            | `Int`                                    | 0-100, written by the worker                                                                                                                       |
| `seedStep`                | `String?`                                | Human-readable current step for the poller                                                                                                         |
| `seedError`               | `String?`                                | Truncated error text, never a stack trace                                                                                                          |
| `seedAttempts`            | `Int`                                    | Default 0, drives retry and auto-purge                                                                                                             |
| `source`                  | `String`                                 | `PUBLIC_DEMO` or `ADMIN_CREATED` or `SALES_SEEDED`                                                                                                 |
| `requestIp`               | `String?`                                | Hashed or truncated; see §15                                                                                                                       |
| `requestUserAgent`        | `String?`                                | Truncated                                                                                                                                          |
| `contactEmail`            | `String?`                                | Optional, never used for sign-in                                                                                                                   |
| `createdById`             | `String?` `@db.Uuid`                     | Operator profile for `ADMIN_CREATED`                                                                                                               |
| `expiresAt`               | `DateTime`                               | Hard stop for all personas                                                                                                                         |
| `lastAccessedAt`          | `DateTime?`                              | Updated on first page render per session, drives idle purge                                                                                        |
| `purgeAfter`              | `DateTime`                               | `expiresAt + retentionWindow`                                                                                                                      |
| `purgedAt`                | `DateTime?`                              | Set when purge completes                                                                                                                           |
| `createdAt` / `updatedAt` | `DateTime`                               | Standard                                                                                                                                           |

Indexes required:

- `@@unique([slug])` for token lookups
- `@@index([status, expiresAt])` for the expiry sweep
- `@@index([status, purgeAfter])` for the purge sweep
- `@@index([planId])` for plan reporting
- `@@index([createdAt])` for retention reporting

Deliberately **not** included: no soft-delete boolean, no IP allowlist, no billing fields. Those belong to a different subsystem and would invite scope creep.

---

## 7. Data Model — `DemoPersona`

One row per persona account in a demo tenant. Four personas ship in v1 (Admin, Teacher, Student, Parent) matching the user's decision that the demo must exercise both the admin dashboard and the portals.

| Column                    | Type                                     | Notes                                                                      |
| ------------------------- | ---------------------------------------- | -------------------------------------------------------------------------- |
| `id`                      | `String` `@id @default(uuid()) @db.Uuid` | PK                                                                         |
| `demoTenantId`            | `String` `@db.Uuid`                      | FK to `DemoTenant`, `onDelete: Cascade`                                    |
| `personaType`             | `DemoPersonaType`                        | `ADMIN` \| `TEACHER` \| `STUDENT` \| `PARENT`                              |
| `label`                   | `String`                                 | Display name, e.g. "Ms. Aisha Rahman — Principal"                          |
| `description`             | `String?`                                | One line shown on the persona card                                         |
| `authUserId`              | `String?` `@unique @db.Uuid`             | Supabase Auth user id, null until provisioned                              |
| `profileId`               | `String?` `@db.Uuid`                     | The `Profile` row for that auth user                                       |
| `email`                   | `String`                                 | Must equal `Profile.email` exactly (§11)                                   |
| `role`                    | `Role`                                   | Mirrors `Profile.role` for fast UI rendering; never used for authorization |
| `isReady`                 | `Boolean`                                | Default false; true only after auth + profile + link entity succeed        |
| `lastSignedInAt`          | `DateTime?`                              | Switcher "last used" hint                                                  |
| `signInCount`             | `Int`                                    | Default 0                                                                  |
| `createdAt` / `updatedAt` | `DateTime`                               | Standard                                                                   |

Indexes and constraints:

- `@@unique([demoTenantId, personaType])` — one persona per type per tenant, so the switcher is a fixed set.
- `@@index([demoTenantId, isReady])` for switcher rendering.
- `@@index([email])` for operator lookup and duplicate diagnosis.

The `role` column is presentation-only. The server always reads `Profile.role` through `getCurrentProfile()`; if the two ever disagree, the DB profile wins and the mismatch is logged. This prevents the persona table from becoming a second source of truth for authorization.

---

## 8. Data Model — `Plan` and `PlanLimit`

Limits are data, not code, so a new plan or a relaxed cap is a row change, not a deploy.

### 8.1 `Plan`

| Column                    | Type                                     | Notes                                                   |
| ------------------------- | ---------------------------------------- | ------------------------------------------------------- |
| `id`                      | `String` `@id @default(uuid()) @db.Uuid` | PK                                                      |
| `key`                     | `String` `@unique`                       | `DEMO`, `TRIAL_BASIC`, `TRIAL_PRO`, `INTERNAL`          |
| `name`                    | `String`                                 | Human name                                              |
| `description`             | `String?`                                |                                                         |
| `durationDays`            | `Int`                                    | Default lifetime applied when a `DemoTenant` is created |
| `retentionDays`           | `Int`                                    | Days between expiry and purge                           |
| `isPublic`                | `Boolean`                                | Whether selectable from the public form                 |
| `isActive`                | `Boolean`                                | Default true                                            |
| `sortOrder`               | `Int`                                    | Display order on the public form                        |
| `createdAt` / `updatedAt` | `DateTime`                               |                                                         |

### 8.2 `PlanLimit`

| Column                    | Type                                     | Notes                                                                          |
| ------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------ |
| `id`                      | `String` `@id @default(uuid()) @db.Uuid` | PK                                                                             |
| `planId`                  | `String` `@db.Uuid`                      | FK, `onDelete: Cascade`                                                        |
| `key`                     | `String`                                 | Stable machine key, e.g. `STUDENT_MAX`                                         |
| `metric`                  | `String`                                 | Entity or resource, e.g. `STUDENT`, `TEACHER`, `BRANCH`, `FEE_INVOICE_PER_DAY` |
| `limitValue`              | `Int`                                    | `-1` means unlimited; never null                                               |
| `period`                  | `String`                                 | `TOTAL` (lifetime) or `PER_DAY` (rolling window)                               |
| `isEnabled`               | `Boolean`                                | Default true; disabled limits are ignored                                      |
| `createdAt` / `updatedAt` | `DateTime`                               |                                                                                |

Constraints:

- `@@unique([planId, key])`
- `@@index([metric])` for cross-plan reporting

### 8.3 Seed plans

| Plan key      | Students | Teachers | Branches | Invoice/day | Duration | Retention | Public |
| ------------- | -------- | -------- | -------- | ----------- | -------- | --------- | ------ |
| `DEMO`        | 60       | 8        | 1        | 5           | 3 days   | 2 days    | yes    |
| `TRIAL_BASIC` | 200      | 25       | 2        | 50          | 14 days  | 14 days   | yes    |
| `TRIAL_PRO`   | 1000     | 120      | 10       | 500         | 30 days  | 30 days   | no     |
| `INTERNAL`    | -1       | -1       | -1       | -1          | 365 days | 30 days   | no     |

`DEMO` is deliberately small and short-lived. `TRIAL_PRO` exists in the schema from day one but is not publicly selectable, so a real sales conversation can move a tenant upward without a schema change.

### 8.4 Relationship to `School`

`School` gains exactly one nullable column, `planId String? @db.Uuid`, with a relation to `Plan` and an `@@index([planId])`. No demo columns are added to `School`. A `planId` on a `School` with no `DemoTenant` row represents a paid tenant on a plan, which is the desired end state of a trial conversion performed by a human.

---

## 9. Data Model — `DemoEvent` and `DemoExtensionRequest`

### 9.1 `DemoEvent`

Append-only lifecycle log. Separate from `AuditLog` because `AuditLog` is user-attributed and school-scoped, while demo events include provisioning and purge steps that have no acting user.

| Column           | Type                                     | Notes                                                |
| ---------------- | ---------------------------------------- | ---------------------------------------------------- |
| `id`             | `String` `@id @default(uuid()) @db.Uuid` | PK                                                   |
| `demoTenantId`   | `String` `@db.Uuid`                      | FK, `onDelete: Cascade`                              |
| `type`           | `DemoEventType`                          | See list below                                       |
| `fromStatus`     | `DemoStatus?`                            |                                                      |
| `toStatus`       | `DemoStatus?`                            |                                                      |
| `message`        | `String?`                                | Human-readable, safe to show an operator             |
| `metadata`       | `Json?`                                  | Counts, plan key, failure reason; no secrets, no PII |
| `actorProfileId` | `String?` `@db.Uuid`                     | Null for system steps                                |
| `ipAddress`      | `String?`                                |                                                      |
| `createdAt`      | `DateTime`                               | Default now                                          |

`DemoEventType` values: `REQUESTED`, `SEED_STARTED`, `SEED_PROGRESS`, `SEED_COMPLETED`, `SEED_FAILED`, `PERSONA_CREATED`, `PERSONA_READY`, `PERSONA_SIGNIN`, `LIMIT_BLOCKED`, `EXTENSION_REQUESTED`, `EXTENSION_GRANTED`, `EXTENSION_DENIED`, `EXPIRED`, `REVOKED`, `PURGE_STARTED`, `PURGE_COMPLETED`, `PURGE_FAILED`.

Indexes: `@@index([demoTenantId, createdAt])`, `@@index([type, createdAt])`.

This table is the single debugging surface for "why is my demo tenant stuck", which removes the need to infer state from scattered rows.

### 9.2 `DemoExtensionRequest`

A visitor can ask for more time. Self-serve extension without review is an abuse vector, so this is a request, not a grant.

| Column                    | Type                                     | Notes                                                |
| ------------------------- | ---------------------------------------- | ---------------------------------------------------- |
| `id`                      | `String` `@id @default(uuid()) @db.Uuid` | PK                                                   |
| `demoTenantId`            | `String` `@db.Uuid`                      | FK, `onDelete: Cascade`                              |
| `requestedMinutes`        | `Int`                                    | Clamped to `DEMO_MAX_EXTENSION_MINUTES`              |
| `status`                  | `DemoExtensionStatus`                    | `PENDING` \| `GRANTED` \| `DENIED` \| `AUTO_GRANTED` |
| `reason`                  | `String?`                                |                                                      |
| `contactEmail`            | `String?`                                |                                                      |
| `decidedById`             | `String?` `@db.Uuid`                     | Operator profile                                     |
| `decidedAt`               | `DateTime?`                              |                                                      |
| `newExpiresAt`            | `DateTime?`                              | Result of a grant                                    |
| `createdAt` / `updatedAt` | `DateTime`                               |                                                      |

Constraints: `@@unique([demoTenantId, status])` filtered to `PENDING` in application logic to prevent duplicate pending requests; `@@index([status, createdAt])` for the operator queue.

### 9.3 Why not a generic `Subscription` model

A subscription model implies billing authority, plan changes over time, proration, and payment state. None of that exists in this codebase today. Introducing it would mean designing a billing system as a side effect of a demo feature. `Plan` + `PlanLimit` + nullable `School.planId` covers the actual requirement — knowing which caps apply to a tenant — and leaves room for a subscription model to be designed on its own terms later.

---

## 10. Complete Prisma Schema Delta

Appended to `prisma/schema.prisma`. Enums go with the other 24 enums; models with the other 73 models. One nullable column is added to `School`.

```prisma
// ─── Demo / Trial Enums ────────────────────────────────────────

enum DemoStatus {
  REQUESTED
  PROVISIONING
  SEEDING
  READY
  EXPIRED
  REVOKED
  PURGED
  FAILED
}

enum DemoSeedStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  SKIPPED
}

enum DemoPersonaType {
  ADMIN
  TEACHER
  STUDENT
  PARENT
}

enum DemoEventType {
  REQUESTED
  SEED_STARTED
  SEED_PROGRESS
  SEED_COMPLETED
  SEED_FAILED
  PERSONA_CREATED
  PERSONA_READY
  PERSONA_SIGNIN
  LIMIT_BLOCKED
  EXTENSION_REQUESTED
  EXTENSION_GRANTED
  EXTENSION_DENIED
  EXPIRED
  REVOKED
  PURGE_STARTED
  PURGE_COMPLETED
  PURGE_FAILED
}

enum DemoExtensionStatus {
  PENDING
  GRANTED
  DENIED
  AUTO_GRANTED
}

// ─── Plans ─────────────────────────────────────────────────────

model Plan {
  id            String   @id @default(uuid()) @db.Uuid
  key           String   @unique
  name          String
  description   String?
  durationDays  Int      @default(3)
  retentionDays Int      @default(2)
  isPublic      Boolean  @default(false)
  isActive      Boolean  @default(true)
  sortOrder     Int      @default(0)
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  limits   PlanLimit[]
  schools  School[]
  tenants  DemoTenant[]

  @@map("plans")
}

model PlanLimit {
  id         String   @id @default(uuid()) @db.Uuid
  planId     String   @map("plan_id") @db.Uuid
  key        String
  metric     String
  limitValue Int      @default(-1)
  period     String   @default("TOTAL")
  isEnabled  Boolean  @default(true) @map("is_enabled")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  plan Plan @relation(fields: [planId], references: [id], onDelete: Cascade)

  @@unique([planId, key])
  @@index([metric])
  @@map("plan_limits")
}

// ─── Demo / Trial ─────────────────────────────────────────────

model DemoTenant {
  id                String          @id @default(uuid()) @db.Uuid
  slug              String          @unique
  schoolId          String?         @unique @map("school_id") @db.Uuid
  planId            String?         @map("plan_id") @db.Uuid
  status            DemoStatus      @default(REQUESTED)
  seedStatus        DemoSeedStatus  @default(PENDING) @map("seed_status")
  seedProgress      Int             @default(0) @map("seed_progress")
  seedStep          String?         @map("seed_step")
  seedError         String?         @map("seed_error")
  seedAttempts      Int             @default(0) @map("seed_attempts")
  source            String          @default("PUBLIC_DEMO")
  requestIp         String?         @map("request_ip")
  requestUserAgent  String?         @map("request_user_agent")
  contactEmail      String?         @map("contact_email")
  createdById       String?         @map("created_by_id") @db.Uuid
  expiresAt         DateTime        @map("expires_at")
  lastAccessedAt    DateTime?       @map("last_accessed_at")
  purgeAfter        DateTime        @map("purge_after")
  purgedAt          DateTime?       @map("purged_at")
  createdAt         DateTime        @default(now()) @map("created_at")
  updatedAt         DateTime        @updatedAt @map("updated_at")

  plan        Plan?                  @relation(fields: [planId], references: [id])
  school      School?                @relation(fields: [schoolId], references: [id], onDelete: SetNull)
  personas    DemoPersona[]
  events      DemoEvent[]
  extensions  DemoExtensionRequest[]

  @@index([status, expiresAt])
  @@index([status, purgeAfter])
  @@index([planId])
  @@index([createdAt])
  @@map("demo_tenants")
}

model DemoPersona {
  id             String           @id @default(uuid()) @db.Uuid
  demoTenantId   String           @map("demo_tenant_id") @db.Uuid
  personaType    DemoPersonaType  @map("persona_type")
  label          String
  description    String?
  authUserId     String?          @unique @map("auth_user_id") @db.Uuid
  profileId      String?          @map("profile_id") @db.Uuid
  email          String
  role           Role
  isReady        Boolean          @default(false) @map("is_ready")
  lastSignedInAt DateTime?        @map("last_signed_in_at")
  signInCount    Int              @default(0) @map("sign_in_count")
  createdAt      DateTime         @default(now()) @map("created_at")
  updatedAt      DateTime         @updatedAt @map("updated_at")

  demoTenant DemoTenant @relation(fields: [demoTenantId], references: [id], onDelete: Cascade)

  @@unique([demoTenantId, personaType])
  @@index([demoTenantId, isReady])
  @@index([email])
  @@map("demo_personas")
}

model DemoEvent {
  id             String        @id @default(uuid()) @db.Uuid
  demoTenantId   String        @map("demo_tenant_id") @db.Uuid
  type           DemoEventType
  fromStatus     DemoStatus?   @map("from_status")
  toStatus       DemoStatus?   @map("to_status")
  message        String?
  metadata       Json?
  actorProfileId String?       @map("actor_profile_id") @db.Uuid
  ipAddress      String?       @map("ip_address")
  createdAt      DateTime      @default(now()) @map("created_at")

  demoTenant DemoTenant @relation(fields: [demoTenantId], references: [id], onDelete: Cascade)

  @@index([demoTenantId, createdAt])
  @@index([type, createdAt])
  @@map("demo_events")
}

model DemoExtensionRequest {
  id               String               @id @default(uuid()) @db.Uuid
  demoTenantId     String               @map("demo_tenant_id") @db.Uuid
  requestedMinutes Int                  @map("requested_minutes")
  status           DemoExtensionStatus  @default(PENDING)
  reason           String?
  contactEmail     String?              @map("contact_email")
  decidedById      String?              @map("decided_by_id") @db.Uuid
  decidedAt        DateTime?            @map("decided_at")
  newExpiresAt     DateTime?            @map("new_expires_at")
  createdAt        DateTime             @default(now()) @map("created_at")
  updatedAt        DateTime             @updatedAt @map("updated_at")

  demoTenant DemoTenant @relation(fields: [demoTenantId], references: [id], onDelete: Cascade)

  @@index([status, createdAt])
  @@index([demoTenantId, status])
  @@map("demo_extension_requests")
}
```

### 10.1 Change to the existing `School` model

```prisma
// added inside model School
  planId     String?     @map("plan_id") @db.Uuid
  plan       Plan?       @relation(fields: [planId], references: [id])
  demoTenant DemoTenant?
// and in the @@index block
  @@index([planId])
```

This is the only modification to an existing model. Nullable, so existing rows need no backfill and `db push` is non-breaking.

### 10.2 Application order

Because there is no `prisma/migrations/` directory and the project uses `prisma db push`:

1. Add enums and models to `prisma/schema.prisma`.
2. `npm run db:generate` (also runs as part of `npm run build`).
3. `npm run db:push` against a non-production database first.
4. Verify with `scripts/demo-verify.ts` (§24) and a `psql` `\d demo_tenants`.
5. Only then push to production, in a maintenance window, with a `pg_dump` taken first (§23).

Because `db push` rebuilds and reorders tables when a relation's cardinality changes, add the _additive_ schema first and defer any future destructive demo changes to a separate, reviewed change.

---

## 11. Identity, Naming, and Global Uniqueness Strategy

This is the highest-risk mechanical area of the whole plan. The schema has several **globally** unique columns, not tenant-scoped ones, so two concurrent demo tenants will collide on naive seeding.

### 11.1 Global vs tenant-scoped uniqueness (verified)

Globally unique — collides across demo tenants and against real schools:

| Model         | Column            | Line |
| ------------- | ----------------- | ---- |
| `Profile`     | `email`           | 18   |
| `Profile`     | `invitationToken` | 22   |
| `School`      | `code`            | 70   |
| `Branch`      | `code`            | 117  |
| `Parent`      | `profileId`       | 302  |
| `Teacher`     | `profileId`       | 358  |
| `IdCard`      | `cardNumber`      | 362  |
| `IdCard`      | `qrTokenHash`     | 364  |
| `FeeInvoice`  | `invoiceNumber`   | 769  |
| `Payment`     | `receiptNumber`   | 809  |
| `LibraryBook` | `isbn`            | 1165 |

Tenant-scoped — already safe, no handling needed: `@@unique([schoolId, admissionNo])` (292, 441), `@@unique([schoolId, employeeCode])` (537, 567), `@@unique([schoolId, branchId, name])` (591, 861), `@@unique([schoolId, plateNumber])` (1222), `@@unique([schoolId, key])` (197).

### 11.2 Slug-prefixed generation

Every demo tenant gets a short, collision-resistant `prefix` derived from its `DemoTenant.slug`, e.g. `d7k2m9`. All globally unique values are generated as `<PREFIX>-<LOCAL>`.

| Value                      | Pattern                            | Example                     |
| -------------------------- | ---------------------------------- | --------------------------- |
| `School.code`              | `<PREFIX>`                         | `D7K2M9`                    |
| `Branch.code`              | `<PREFIX>-B1`                      | `D7K2M9-B1`                 |
| `School.name`              | `Riverside Demo School (<PREFIX>)` |                             |
| `Student.admissionNo`      | `<PREFIX>-0001`                    | `D7K2M9-0001`               |
| `Staff.employeeCode`       | `<PREFIX>-E001`                    |                             |
| `FeeInvoice.invoiceNumber` | `D7K2M9-INV-000001`                |                             |
| `Payment.receiptNumber`    | `D7K2M9-RCP-000001`                |                             |
| `IdCard.cardNumber`        | `D7K2M9-IC-0001`                   |                             |
| `LibraryBook.isbn`         | `978-D7K2M9-0001`                  |                             |
| `Branch.email`             | `branch.<slug>@demo.invalid`       |                             |
| Persona emails             | `<local>+<slug>@demo.invalid`      | `admin+d7k2m9@demo.invalid` |
| `Profile.email`            | Must equal persona email exactly   |                             |

### 11.3 Reserved domains

- `@demo.invalid` is used for all demo personas. `.invalid` is reserved by RFC 2606 and can never be delivered, which makes leaked credentials harmless to the outside world and guarantees the emails can never collide with real users or pass a real mail check.
- The shared demo password is stored in an environment variable, never in the database and never in this document.
- Persona emails use a `+slug` sub-address so all four personas of a tenant are visually related while remaining distinct for `Profile.email`'s global uniqueness.

### 11.4 Slug generation

`lib/demo/slug.ts`:

1. Source 6 characters from `crypto.randomBytes` using an unambiguous alphabet (no `0/O`, `1/I/L`).
2. Retry up to 5 times on `P2002` from the unique index.
3. Treat the slug as an unguessable capability token for the status endpoint, and additionally require the demo's own signed status cookie. The slug alone is defense-in-depth, not the only control (§15).

### 11.5 Deterministic identity linkage (hard invariants)

These are asserted by `scripts/demo-verify.ts` and cause provisioning to fail loudly rather than produce a broken demo:

1. `DemoPersona.email === Profile.email` (exact, case-insensitive comparison after normalization).
2. `Profile.id === DemoPersona.authUserId` and `DemoPersona.profileId`.
3. `Profile.role === DemoPersona.role`, and `Profile.role` is the authority.
4. `Profile.schoolId === DemoTenant.schoolId`, `Profile.branchId` equals the seeded branch.
5. `Profile.status === 'ACTIVE'` and `isActive === true`, otherwise `requireRole()` rejects the persona.
6. For `STUDENT`: the linked `Student.email` equals the persona email, because `validateStudentPortal()` resolves by email.
7. For `PARENT`: the linked `Parent.email` equals the persona email and a `StudentParent` row links that parent to the seeded student.
8. For `TEACHER`: a `Teacher` row exists with `profileId === Profile.id` and a `TeacherAssignment` in the current session, otherwise the teacher portal renders empty.
9. `School.planId === DemoTenant.planId`.
10. `DemoTenant.slug` prefix matches every generated code from §11.2.

---

## 12. Authentication and Persona Account Strategy

### 12.1 Decision

Personas are **real Supabase Auth users**, per the user's decision. There is no mock session, no bypass header, and no demo-specific authentication branch.

### 12.2 Provisioning sequence per persona

Using a **stateless** service-role client (`lib/supabase/admin.ts`, created in Phase 1 because `createServiceClient()` in `lib/supabase/server.ts` is cookie-bound and unusable here):

1. `auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role, school_id, branch_id, demo_slug } })`.
2. `email_confirm: true` is required. Without it the persona cannot sign in, and the demo breaks on the first click.
3. Create the `Profile` with `id = authUser.id`. This is what `getCurrentProfile()` looks up, so a mismatch means "not signed in" for all product pages.
4. Create the linked domain entity: `Staff` + `Teacher` for the teacher, `Student` for the student, `Parent` + `StudentParent` for the parent. For the admin persona, a `Profile` with `role: SCHOOL_ADMIN` is sufficient; no separate entity is required by the schema.
5. Set `user_metadata.role`, which is what `proxy.ts` reads for coarse redirects (`proxy.ts:159-162`).
6. Mark `DemoPersona.isReady = true` and write a `PERSONA_READY` `DemoEvent`.
7. On any failure, delete the auth user and any partial rows, then fail the tenant.

Rollback at step 7 matters: a half-created persona is the most likely source of a demo that appears provisioned but breaks on first use.

### 12.3 Shared password handling

- Supplied by `DEMO_PERSONA_PASSWORD`; required in production, validated by `lib/env.ts` as an optional-but-checked variable (length ≥ 12, otherwise the demo routes return 503 and log loudly).
- Never written to the database, never logged, never included in a `DemoEvent.metadata`.
- Shown once on the `/demo` landing page. Because it is a shared secret published on a public page, personas are expected to be locked down by the tenant lifecycle, not by password secrecy.
- **Consequence to state plainly:** any prospect can sign in as any demo persona. This is acceptable only because demo data is fictional and the tenant is read-mostly, expires in days, and is purged. It is unacceptable for `TRIAL_PRO`, which is why that plan is not publicly selectable and its personas are provisioned individually with per-user passwords.

### 12.4 Interaction with existing auth behaviors

| Existing behavior                   | Source                    | Effect on the demo                                                                                                                                                                                                                                                    |
| ----------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lockout after `MAX_FAILED_ATTEMPTS` | `auth.actions.ts:371-379` | Public demo sign-in goes through the same `signin()`, so lockout applies. Rate limiting (§15) must sit _before_ it to keep the counter from being a denial-of-service vector against a shared public password.                                                        |
| Inactive-profile rejection          | `auth.actions.ts:355-357` | Personas must be `ACTIVE`/`isActive`, asserted by invariant 5.                                                                                                                                                                                                        |
| 2FA branch                          | `auth.actions.ts:417-420` | Personas have `twoFactorEnabled = false`. A persona with 2FA on would strand the visitor at an OTP prompt, so the switcher refuses 2FA personas.                                                                                                                      |
| `getRedirectPath(role)`             | `auth.actions.ts:447`     | Drives where a persona lands after sign-in; the switcher overrides it with the persona's own target.                                                                                                                                                                  |
| `proxy.ts` portal restriction       | `proxy.ts:174-178`        | `TEACHER` is redirected off `/dashboard` to `/portal/teacher`, and `/portal` is limited to `STUDENT`/`PARENT`/`TEACHER`. The switcher must send the admin persona to `/dashboard` and the other three to their portals, or middleware will immediately redirect them. |
| `Profile.email` global unique       | `schema.prisma:18`        | Requires slug-prefixed emails (§11.2).                                                                                                                                                                                                                                |

### 12.5 Sign-out discipline

Switching personas must sign out first, then sign in. Leaving the previous session alive risks the browser holding a session whose cookies are overwritten mid-flight, and it makes the "who am I" banner state ambiguous. `signout()` (`auth.actions.ts:456`) also writes an `AuditLog` row, which keeps the persona trail in the existing audit surface.

---

## 13. Persona Role Switching

### 13.1 Principle

Switching is a **real authentication event**, not a UI state change and not an impersonation. The browser calls a server action, the server signs the current session out, and the browser performs `signInWithPassword()` through the same credentials a visitor would type. This is the user's stated requirement, and it is also the property that makes the demo trustworthy: every request in the session is authorized by the ordinary `requireRole()` path.

### 13.2 Switch flow

```
1. Banner "Switch persona" → POST switchPersona({ personaId })
2. Server action:
   a. requireAuth()                         — must be signed in
   b. resolve DemoTenant for profile.schoolId
   c. assert tenant.status === READY        — expired/revoked refuses
   d. assert personaId belongs to tenant    — prevents cross-tenant switch
   e. assert persona.isReady && !persona twoFactorEnabled
   f. write DemoEvent PERSONA_SIGNIN, increment signInCount
   g. await signout()                       — real sign-out, audited
3. Action returns { email, password } (from env) + { redirectTo }
4. Client calls a small client helper:
   supabase.auth.signInWithPassword({ email, password })
5. router.replace(redirectTo); router.refresh()
```

Two details that matter:

- **The password crosses the wire to the browser.** That is unavoidable for a published shared password, and it is acceptable only because the credential is already public on the landing page. The action must therefore not treat its return value as a secret, must not log it, and must still refuse unauthenticated and cross-tenant callers.
- **Step 4 uses a browser Supabase client.** This is what makes the resulting session a genuine Supabase session that `getCurrentUser()` and `proxy.ts` both recognize, with no code path that treats demo sessions specially.

### 13.3 Redirect targets

| Persona   | `redirectTo`      | Reason                                                                                  |
| --------- | ----------------- | --------------------------------------------------------------------------------------- |
| `ADMIN`   | `/dashboard`      | `SCHOOL_ADMIN` is allowed on dashboard routes; portal roles are redirected away from it |
| `TEACHER` | `/portal/teacher` | `proxy.ts:165-169` forces teachers off `/dashboard`                                     |
| `STUDENT` | `/portal/student` | `PORTAL_ROLES` gate at `app/portal/layout.tsx:21-23`                                    |
| `PARENT`  | `/portal/parent`  | Same gate                                                                               |

### 13.4 What the switcher is not

- Not a way to obtain a `SUPER_ADMIN` session. The operator console (§25 Phase 10) is the only `SUPER_ADMIN` surface and is not linked from the switcher.
- Not a way to reach another tenant. Step 2d is a strict `demoTenantId` ownership check derived from the signed-in profile, not from client input.
- Not available after expiry. Step 2c refuses, so an expired tenant cannot be revived by switching.

### 13.5 Server-action surface

| Action                                   | File                                   | Auth                               | Validation                 |
| ---------------------------------------- | -------------------------------------- | ---------------------------------- | -------------------------- |
| `switchPersona(personaId)`               | `actions/demo-persona.actions.ts`      | `requireAuth()` + tenant ownership | Zod `uuid`                 |
| `getPersonaSwitcherState()`              | same                                   | `requireAuth()`                    | none (read)                |
| `requestExtension(reason, contactEmail)` | `actions/demo-tenant.actions.ts`       | `requireAuth()` + `READY`          | Zod, length caps           |
| `requestDemoTenant(input)`               | same                                   | public                             | Zod + CAPTCHA + rate limit |
| `getDemoStatus(token)`                   | `app/api/demo/status/[token]/route.ts` | token + signed cookie              | Zod                        |

---

## 14. Tenant Isolation and Security Model

### 14.1 Reuse the existing isolation, do not add a second one

Tenant isolation already exists and works: every non-`SUPER_ADMIN` action derives its tenant from `Profile.schoolId` via `getSchoolId()`, which **ignores** any client-supplied `schoolId` (`lib/school-context.ts:23-34`). A demo tenant is an ordinary `School` with an ordinary `Profile` set, so it is isolated by the same mechanism as a paying customer. No demo-specific scoping code is added.

The rule for the whole subsystem: **demo data is created with a known `schoolId`, and every read/write of that data goes through the existing helpers.** A demo feature that needs a different query path is a bug.

### 14.2 Where the lifecycle guard lives

`lib/demo/scope.ts` exports `getDemoContext(profile)`:

1. If `profile.role === 'SUPER_ADMIN'`, return `{ isDemo: false }` — platform operators are never demo-gated.
2. If `profile.schoolId` is null, return `{ isDemo: false }` — no tenant, nothing to gate.
3. Look up `DemoTenant` by `schoolId`. Not found, return `{ isDemo: false }` — a production school must not pay a `DemoTenant` query penalty on every page forever. See the cost note in §14.5.
4. If `status !== 'READY'` or `expiresAt <= now`, transition to `EXPIRED`, write a `DemoEvent`, and return a "demo ended" result.
5. Otherwise return `{ isDemo: true, tenant, personas }` and opportunistically update `lastAccessedAt` (throttled to once per 15 minutes per tenant to avoid a write on every navigation).

### 14.3 Guard wiring

| Location                                           | Behavior when expired or revoked                                                                                      |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `app/(dashboard)/layout.tsx`                       | Render a dedicated "demo ended" screen with a CTA to `/demo`; do not render `children`                                |
| `app/portal/layout.tsx`                            | Same, portal-flavored                                                                                                 |
| Product server actions                             | `requireDemoActive()` call inside the actions the demo allows writes to (§19.3)                                       |
| `app/api/mobile/*`                                 | Not wired in v1. A demo session has no mobile token, so the surface is unreachable. Documented, not silently ignored. |
| `app/api/*` (invoices, payments, upload, qr, push) | Not wired in v1. Same reasoning: no token is issued to demo personas.                                                 |

The layouts give a guaranteed, single enforcement point for anything reachable by a browser session. Anything that requires a separately issued credential is unreachable by construction.

### 14.4 Explicitly rejected designs

| Rejected                                                    | Why                                                                                                                                                                                                           |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A signed "demo mode" cookie checked by `proxy.ts`           | `proxy.ts` cannot query Prisma; a cookie claim would be the only tenant-identity source in middleware, which is exactly the kind of bypass this plan forbids.                                                 |
| A `SUPER_ADMIN` demo session                                | Would give a public credential full platform access.                                                                                                                                                          |
| Row Level Security for demo tables                          | RLS is off project-wide; enabling it for six tables creates a second, inconsistent isolation model.                                                                                                           |
| Reusing `scripts/seed.ts`                                   | It truncates ~30 tables with `CASCADE` against the whole database. Calling it during a demo provision would destroy real data.                                                                                |
| Hardcoding demo roles in `ROLE_DEFAULTS`                    | `getPermissionsForRole()` always unions `ROLE_DEFAULTS[role]` (`lib/permissions.ts:421-431`), so a permission-based limit can never be _removed_, only added. Limits must live outside the permission system. |
| Letting the visitor pick their own `schoolId` or `branchId` | Ignored by `getSchoolId()` anyway; accepting it would create a false impression that it is honored.                                                                                                           |

### 14.5 Cost of the lifecycle guard

`getDemoContext()` adds one indexed `DemoTenant` lookup per authenticated request. Mitigations:

- Single indexed `findUnique` on the `schoolId` unique index.
- Wrapped in React `cache()` alongside the existing `getCurrentUser()`/`getCurrentProfile()` calls, which the codebase already relies on for deduplication in Loop 5.
- The `throttledTouch` update replaces the second write, not the read.
- Measured in Phase 12; reverted to a cheaper shape (a signed claim refreshed hourly) if it moves p95 layout time by more than 15 ms.

### 14.6 Data-handling rules

- Every seeded name, email, address, and phone uses the reserved `.invalid` domain and fictional names from a fixed list. No real names, no scraped data, no customer data.
- No production `School` id is ever reused for a demo.
- `DemoEvent.metadata` carries counts and reason codes only — never emails, passwords, or tokens.
- Log lines use the `DemoTenant.slug`, never the `requestIp` in full.

---

## 15. Abuse Prevention and Rate Limiting

There is no shared rate-limiting module in `lib/`, so this is new work. It is scoped to the demo subsystem and deliberately does not attempt to solve abuse prevention for the whole product.

### 15.1 Threat model

| Threat                                               | Impact                                          | Control                                                                                                              |
| ---------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Credential stuffing against the shared demo password | Locking real demo users out; inflated auth load | IP + slug rate limit _before_ `signin()`; CAPTCHA on the public request form                                         |
| Demo farm creation                                   | Database and auth bloat; cost                   | Per-IP and per-day provisioning cap; CAPTCHA; hashed-IP record with retention                                        |
| Data exfiltration via a valid demo session           | Fictional data only; still a reputation issue   | Read-mostly by default (§19.3), rate-limited downloads, no export beyond allowlist                                   |
| Cross-tenant probing of `/api/demo/status/[token]`   | Leaking tenant existence and state              | Unguessable slug (§11.4) + signed status cookie + coarse response only                                               |
| Extension-request spam                               | Operator inbox flooding                         | One `PENDING` request per tenant; per-tenant cooldown                                                                |
| Persona farming to create many auth users            | Auth table growth                               | Fixed 4 personas per tenant; `DEMO_MAX_ACTIVE_TENANTS` circuit breaker                                               |
| Automated scraping of the seeded dataset             | Value destruction of the demo                   | ReCAPTCHA v3 score threshold, per-IP concurrency cap, `DemoEvent`-based detection of >200 reads/minute from one slug |

### 15.2 Rate-limit table

| Surface                      | Limit                                  | Window                | Response on breach                                                                                                              |
| ---------------------------- | -------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `POST` public request        | 3                                      | 10 min per IP         | 429, generic message                                                                                                            |
| `POST` public request        | 10                                     | 24 h per IP           | 429, no new tenant for 24 h                                                                                                     |
| Provisioning circuit breaker | `DEMO_MAX_ACTIVE_TENANTS` (default 25) | global                | 503 with wait-and-retry UI                                                                                                      |
| `/api/demo/status/[token]`   | 60                                     | 1 min per token       | 429; poller backs off exponentially                                                                                             |
| `switchPersona`              | 20                                     | 1 min per profile     | 429; UI shows "slow down"                                                                                                       |
| `requestExtension`           | 1 pending                              | per tenant            | 409 with existing request state                                                                                                 |
| Persona sign-in              | 5                                      | 5 min per IP per slug | 429; **must run before `signin()`** so the profile lockout counter is not the first line of defense against a public credential |

### 15.3 Implementation approach

- `lib/demo/rate-limit.ts` with a pluggable store. In-process `Map` with expiry for dev; the store interface is designed so a Postgres or Upstash implementation can be dropped in without touching call sites. Single-instance semantics are documented as dev-only, since a serverless deployment has multiple instances.
- Throttling **must** wrap the public request action and the persona switch action in `lib/demo/*`, not `auth.actions.ts`. Editing `signin()` risks changing behavior for real users, which violates the project constraint against modifying auth.
- CAPTCHA: reCAPTCHA v3 score gate on the public form only, never on persona sign-in (it would be friction on the primary demo conversion path). Verification failure fails closed.
- IP handling: store a truncated or salted hash of the IP, never the raw address, in `DemoTenant.requestIp`.

### 15.4 Data protection for the shared password

The shared password is public by design. The mitigations are lifecycle and scope, not secrecy:

- `DEMO` tenants are read-mostly and capped (§19).
- Expiry in 3 days; purge 2 days later.
- Personas cannot reach `SUPER_ADMIN`, the platform schools list, or another tenant.
- `lastAccessedAt` and `DemoEvent` make unusual usage visible in the operator console.

---

## 16. Asynchronous Seeding and Status Polling

### 16.1 Why async

A full demo dataset is hundreds of inserts across roughly 40 tables. The existing `scripts/seed.ts` is 1,098 lines of sequential `create` calls. Run inline in a request, it will exceed the serverless function timeout and the visitor will see a spinner and then a 504.

### 16.2 Mechanism

1. `requestDemoTenant()` creates `DemoTenant` with `status = REQUESTED`, `seedStatus = PENDING`, `expiresAt`, `purgeAfter`. Returns a `slug` immediately. The HTTP response is fast.
2. The action schedules the worker with Next.js's stable `after()` from `next/server`, which runs work after the response is flushed.
3. `services/demo/seed-runner.ts` flips `status = PROVISIONING`, `seedStatus = RUNNING`, then works through ordered phases, writing `seedProgress` and `seedStep` as it goes.
4. The browser polls `GET /api/demo/status/[token]` every 2 s (with jitter and exponential backoff, capped at 10 s) and renders progress.
5. On completion the worker sets `status = READY`, `seedStatus = COMPLETED`, `seedProgress = 100`, and the poller shows the persona cards.
6. On failure, `status = FAILED` with a truncated `seedError`; a `FAILED` tenant is auto-purged.

### 16.3 Durability

`after()` runs in the same process as the response. If the process is recycled mid-seed, the tenant is stuck in `SEEDING` with a stale `updatedAt`. The purge route therefore also reaps **stale in-flight tenants**: `status IN ('PROVISIONING','SEEDING') AND updatedAt < now - 10 min` are marked `FAILED` and purged. The worker is also written to be resumable: each phase commits, and re-running skips phases whose rows already exist by checking the slug prefix.

For a production deployment that must guarantee completion, the documented alternative is a Supabase cron or pg_cron job invoking the same runner over a queue. That is Phase 12 hardening, not a v1 requirement, and the runner is deliberately shaped so swapping the trigger does not change the seeding logic.

### 16.4 Idempotency

Every insert is keyed by the slug-prefixed identifier from §11.2 and created with `upsert` on the natural key, so a re-run updates rather than duplicating. A partially seeded tenant re-seeded produces the same final state.

### 16.5 Progress reporting contract

`GET /api/demo/status/[token]` returns only:

```json
{
  "status": "SEEDING",
  "seedStatus": "RUNNING",
  "progress": 45,
  "step": "Seeding attendance records",
  "personasReady": false,
  "expiresAt": "2026-01-08T12:00:00.000Z",
  "pollAfterMs": 2000
}
```

It never returns tenant data, user emails, the slug of another tenant, or the shared password. The password is fetched from the page's own server component, not from this endpoint.

### 16.6 Batching inside the worker

- `createMany` for high-volume tables (attendance, notifications, timetable slots) instead of per-row `create`.
- A single transaction per logical phase, not one transaction for the whole seed, so a failure at phase 9 does not roll back eight successful phases.
- The adapter's `pg.Pool` is reused for the worker's lifetime and closed in `finally`.

---

## 17. Realistic Seed Data Catalog

The demo must look like a real school in the first 30 seconds, so the dataset is a full academic year with plausible distributions, not uniform filler.

### 17.1 Fictional school

| Attribute      | Value                                                                         |
| -------------- | ----------------------------------------------------------------------------- |
| Name           | `Riverside Demo School` + slug suffix                                         |
| Session        | One `AcademicSession`, `isCurrent = true`, spanning the current academic year |
| Branches       | 1 (`Main Campus`) for `DEMO`, 2 for trials                                    |
| Classes        | Grades 1-10, 2 sections each for `DEMO`; 1-12 for trials                      |
| Subjects       | 9 core subjects, 2 languages                                                  |
| Class subjects | Full `ClassSubject` matrix with assigned teachers                             |

### 17.2 People

| Entity                     | `DEMO` count | Notes                                                                     |
| -------------------------- | ------------ | ------------------------------------------------------------------------- |
| `Profile` (`SCHOOL_ADMIN`) | 1            | The Admin persona                                                         |
| `Profile` (`TEACHER`)      | 8            | One is the Teacher persona; the rest give timetables and gradebooks depth |
| `Profile` (`STUDENT`)      | 4            | Persona is one of them                                                    |
| `Profile` (`PARENT`)       | 6            | Persona is the parent of the persona student                              |
| `Staff`                    | 12           | Principal, admin staff, accountant, librarian, driver                     |
| `Teacher`                  | 8            | Each linked to a `Profile` via `profileId`                                |
| `Student`                  | 60           | Realistic names, mixed gender, blood groups, addresses                    |
| `Parent`                   | 60           | One primary + one secondary for some, one `StudentParent` row each        |
| `StudentParent`            | 72           | Includes the persona link (invariant 7)                                   |

### 17.3 Academic and operational data

| Domain                                            | Volume       | Purpose                                                           |
| ------------------------------------------------- | ------------ | ----------------------------------------------------------------- |
| `Timetable`                                       | ~700 slots   | Realistic weekly grid; makes the teacher portal header meaningful |
| `TeacherAssignment`                               | 24           | Feeds `validateTeacherPortal()` and teacher workload              |
| `StudentEnrollment`                               | 60           | Required for class-scoped queries                                 |
| `StudentAttendance`                               | ~2,700       | 60 students × 45 school days, ~92% present                        |
| `Homework` + `HomeworkSubmission`                 | 30 + ~400    | Powers the student and parent portals                             |
| `ExamType`, `Exam`, `ExamSchedule`                | 2, 3, 12     | Term structure                                                    |
| `ExamResult`                                      | ~540         | 60 students × 3 exams, normal distribution of marks               |
| `ReportCard`                                      | 3            | One per exam per student                                          |
| `FeeStructure`, `StudentFeePlan`                  | 4, 60        | Tuition, transport, lab, library                                  |
| `FeeInvoice` + `FeeInvoiceItem`                   | 90 + 130     | Mixed paid/partial/unpaid, so receivables charts vary             |
| `Payment`                                         | 70           | Realistic receipt numbers and methods                             |
| `Expense`                                         | 40           | Salary, utilities, supplies                                       |
| `LibraryBook` + `BookIssue`                       | 120 + 30     | Includes overdue items                                            |
| `Vehicle` + `TransportRoute` + `StudentTransport` | 3, 4, 40     |                                                                   |
| `Announcement`                                    | 12           | School-wide and class-targeted                                    |
| `Notification`                                    | ~300         | Unread counts must be non-zero for the header dropdown            |
| `Message`                                         | ~50          | Threads for the messages page                                     |
| `Event`, `Meeting`, `CalendarEvent`               | 6, 5, 10     |                                                                   |
| `AuditLog`                                        | ~40          | Believable history                                                |
| `Setting`                                         | 12           | School settings keyed per `schoolId`                              |
| `Permission` + `RolePermission`                   | existing set | Seeded once globally, not per tenant                              |

### 17.4 Determinism

The dataset is generated from a seeded PRNG (`mulberry32` with a seed derived from the tenant slug) so a given tenant always produces the same data. This makes screenshots, bug reports, and the verification script reproducible, and it removes a class of "works on my machine" demo bugs.

### 17.5 Persona-focused data

The personas are chosen so each lands on a non-empty, interesting screen:

| Persona | Lands on          | Why it is not empty                                               |
| ------- | ----------------- | ----------------------------------------------------------------- |
| Admin   | `/dashboard`      | Charts have 12 months of invoices, 45 days of attendance, 3 exams |
| Teacher | `/portal/teacher` | 5+ periods today, 3 classes, pending homework to grade            |
| Student | `/portal/student` | Today's timetable, 3 unread notifications, 4 grades, fee balance  |
| Parent  | `/portal/parent`  | One child with attendance, grades, and an outstanding fee         |

---

## 18. Provisioning Workflow (End to End)

### 18.1 Sequence

| #   | Actor         | Action                                                                                      | Result                                                                      |
| --- | ------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | Visitor       | Opens `/demo`                                                                               | Sees plan cards, persona preview, and the shared password                   |
| 2   | Visitor       | Submits request form                                                                        | Zod validation, CAPTCHA score check, rate limit (§15.2)                     |
| 3   | Server action | Circuit-breaker check                                                                       | If `READY`+`SEEDING` count ≥ `DEMO_MAX_ACTIVE_TENANTS`, return 503          |
| 4   | Server action | Create `DemoTenant` + `Plan` link + `DemoEvent(REQUESTED)`                                  | One transaction. `slug` returned, `expiresAt` = now + `plan.durationDays`   |
| 5   | Server action | Schedule `after(runSeed, slug)`                                                             | HTTP response returns immediately with the status URL                       |
| 6   | Visitor       | Polls `/api/demo/status/[slug]`                                                             | Renders `progress` and `step`                                               |
| 7   | Worker        | `status = PROVISIONING`, `seedStatus = RUNNING`                                             | `DemoEvent(SEED_STARTED)`                                                   |
| 8   | Worker        | Seed phase A: `School`, `Branch`, `Setting`                                                 | Foundation rows with slug-prefixed codes                                    |
| 9   | Worker        | Seed phase B: `Profile` rows (non-auth)                                                     | Needed as FK targets for staff and teachers                                 |
| 10  | Worker        | Seed phase C: `AcademicSession`, `Class`, `Section`, `Subject`, `ClassSubject`              | Academic structure                                                          |
| 11  | Worker        | Seed phase D: `Staff`, `Teacher`, `TeacherAssignment`                                       | Teacher entities linked to profiles                                         |
| 12  | Worker        | Seed phase E: `Student`, `Parent`, `StudentParent`, `StudentEnrollment`, `StudentTransport` | People graph, including the persona links                                   |
| 13  | Worker        | Seed phase F: `Timetable`, `StudentAttendance`, `Homework`                                  | High volume via `createMany`                                                |
| 14  | Worker        | Seed phase G: exams, results, report cards                                                  | `ExamResult` normal distribution                                            |
| 15  | Worker        | Seed phase H: fees, invoices, payments, expenses                                            | Mixed settlement states                                                     |
| 16  | Worker        | Seed phase I: library, transport, announcements, notifications, messages, events            | Remaining modules                                                           |
| 17  | Worker        | Create `DemoPersona` rows, `status = PROVISIONING` still                                    | `DemoEvent(PERSONA_CREATED)`                                                |
| 18  | Worker        | Provision 4 auth users via `lib/supabase/admin.ts`                                          | `Profile.id = authUser.id`, `user_metadata.role` set, `email_confirm: true` |
| 19  | Worker        | Set `persona.isReady = true` for each                                                       | `DemoEvent(PERSONA_READY)` per persona                                      |
| 20  | Worker        | Verify §11.5 invariants                                                                     | Any failure ⇒ rollback personas and `status = FAILED`                       |
| 21  | Worker        | `status = READY`, `seedStatus = COMPLETED`, `progress = 100`                                | `DemoEvent(SEED_COMPLETED)`                                                 |
| 22  | Poller        | Sees `READY`                                                                                | Renders persona cards and the "Enter demo" CTA                              |
| 23  | Visitor       | Clicks a persona                                                                            | `switchPersona` → real sign-out → real sign-in → redirect                   |
| 24  | Layout        | `getDemoContext()` returns `isDemo: true`                                                   | Banner + countdown + limit enforcement active                               |
| 25  | Cron          | Sweeps expired tenants                                                                      | `EXPIRED` → after `purgeAfter` → `PURGED`                                   |

### 18.2 Failure handling per phase

Each phase wraps itself in a transaction and catches its own errors:

- Failure in A-I ⇒ mark `FAILED`, write `DemoEvent(SEED_FAILED)` with a truncated reason, roll back only that phase, increment `seedAttempts`.
- `seedAttempts >= 2` ⇒ automatic purge; a persistently failing tenant must not linger.
- Failure during persona provisioning ⇒ delete the created auth users via `auth.admin.deleteUser()` and delete the `Profile` rows created in phase B for that tenant, then `FAILED`.
- Failure in step 20 (invariant verification) ⇒ same rollback path. A tenant that passes seeding but fails invariants is worse than no tenant, because it looks provisioned.

### 18.3 Concurrency

Two simultaneous requests for the same tenant are impossible (each request creates a distinct tenant), but a retried form submission could race on the circuit-breaker count. The breaker reads a count of non-terminal tenants; the count is advisory, not a lock, and the worst outcome is `DEMO_MAX_ACTIVE_TENANTS + a few` tenants. That is acceptable. A hard guarantee would require a counter table or advisory lock, which is added only if the overshoot is observed in practice.

---

## 19. Usage Limits and Plan Enforcement

### 19.1 Why limits are not permissions

`getPermissionsForRole()` returns `ROLE_DEFAULTS[role]` unioned with DB grants (`lib/permissions.ts:421-431`). Role defaults are unconditional, so a limit implemented as a removed permission would be silently re-granted. Limits therefore get their own path, evaluated against `PlanLimit` rows, with the plan resolved from `School.planId` through `DemoTenant`.

### 19.2 Evaluation

`lib/demo/limits.ts` exports a pure, I/O-free function:

```ts
type LimitVerdict =
  | { allowed: true; remaining: number | null }
  | { allowed: false; metric: string; limit: number; period: string }
```

It takes the plan's limits plus a current-usage count and returns a verdict. Purity makes it directly unit-testable, which matters because this is exactly the logic that is painful to verify through the UI.

`resolvePlanLimits(schoolId)` reads `Plan` + `PlanLimit` and is wrapped in React `cache()` for the request.

### 19.3 Read-mostly demo policy

A `DEMO`-plan tenant is limited to a read-mostly allowlist. Writes permitted:

- `Attendance` for today's date (so the attendance screen is demonstrable)
- `HomeworkSubmission` create/update
- `Message` send within the tenant
- `Notification` mark-as-read
- `IdCard` generation for a seeded student

Everything else returns a structured `DEMO_LIMITED` result that the UI renders as a "not available in the demo" notice, not an error. This is a product decision: a demo where a prospect can delete 60 students is a demo nobody trusts.

`TRIAL_*` plans allow full CRUD subject to plan limits.

### 19.4 Enforcement points

| Where                                                                                                                                           | Mechanism                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Create actions (`student.actions.ts`, `staff.actions.ts`, `fees.actions.ts`, `library.actions.ts`, `transport.actions.ts`, `branch.actions.ts`) | `assertWithinLimit(profile, "STUDENT")` before the insert; reads the plan from cache            |
| Bulk/import actions                                                                                                                             | Same, with the incoming count added to current usage                                            |
| High-frequency generators (`fees.actions.ts` invoice generation, attendance QR)                                                                 | `PER_DAY` period limits                                                                         |
| UI                                                                                                                                              | `getLimitNotices()` returns the user's remaining headroom, rendered as "60 of 60 students used" |
| Every denial                                                                                                                                    | `DemoEvent(LIMIT_BLOCKED)` with metric and limit, no PII                                        |

### 19.5 Denials

A denial is a structured, non-exceptional return:

```ts
{ ok: false, code: "DEMO_LIMIT_REACHED", metric: "STUDENT", limit: 60, upgradePath: "/demo" }
```

Server actions in this codebase already return result objects rather than throwing for user errors, so this matches the local convention. The UI shows a specific message ("This demo allows 60 students. Request a trial for higher limits.") and never a raw exception.

### 19.6 Limit changes without deploy

Because limits are rows, `DEMO` can be tightened (say from 60 to 40 students) by `UPDATE plan_limits SET limit_value = 40 WHERE ...` and it takes effect on the next request. `scripts/seed-plans.ts` is idempotent and uses `upsert`, so re-running it never silently widens a limit an operator deliberately lowered; it reports drift instead.

---

## 20. UI/UX Design — Public Demo and In-App Shell

Additive only. No existing page is redesigned, and no route or folder is renamed.

### 20.1 Public route group `app/(demo)/demo`

| Route                         | Purpose                                                                                |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| `app/(demo)/demo/page.tsx`    | Landing: value proposition, persona preview, plan cards, shared password, request form |
| `app/(demo)/demo/loading.tsx` | Provisioning skeleton matching the poll states                                         |
| `app/(demo)/demo/error.tsx`   | Branded failure state with retry                                                       |
| `app/(demo)/layout.tsx`       | Minimal chrome, no sidebar, no auth requirement                                        |

Routes are declared public in `proxy.ts` by adding `/demo` to the `publicRoutes` array — a one-line, additive change that does not alter behavior for any existing route. `/demo` must be added **after** the demo subsystem is verified, and the change is listed as an explicit Phase 12 item so that a broken demo cannot break the production login flow.

### 20.2 Landing page composition

1. **Hero**: what the product is, one honest paragraph, no inflated metrics.
2. **What you'll see**: four persona cards with role, screen, and sample data description.
3. **Credentials**: the shared password, in a copyable block with a visible "demo data is fictional and resets" note.
4. **Plan selector**: only plans with `isPublic = true` (§8.3), showing duration and caps.
5. **Request form**: name, work email (optional), plan choice, CAPTCHA. Kept to four fields; every extra field costs conversions.
6. **Privacy note**: what is stored, for how long, and that it is deleted after expiry.

### 20.3 Provisioning status view

- Deterministic, non-shimmering skeleton that mirrors the real layout, so there is no visual jump when the demo becomes `READY`.
- Progress bar driven by `progress` with `step` as the label.
- Explicit states for `SEEDING`, `FAILED` (with a "try again" that creates a fresh tenant), and `EXPIRED`.
- Backoff to 10 s on repeated polls; stops polling on terminal states to avoid pointless traffic.
- On `READY`, cross-fade to the persona cards rather than a hard cut.

### 20.4 In-app demo banner

Rendered from `getDemoContext()` in both layouts, above the header content:

- Left: "Demo school — data is fictional" plus the school name.
- Center: countdown `mm:ss` to `expiresAt`, updating client-side, and a one-click "Request more time".
- Right: the persona switcher (avatar, role, dropdown) and a "Leave demo" action.
- Style: high-contrast but not alarming; it must not read as an error. A `tone` prop keeps it visually distinct from the error states already used in the dashboard layout.
- `aria-live="polite"` on the countdown, throttled to announce minutes rather than seconds, so screen readers are not flooded.

### 20.5 Persona switcher

- Dropdown listing the four personas with role badge, label, and "last used".
- Selecting one posts `switchPersona`, shows a brief signing-in state, then redirects.
- Disabled with an explanatory tooltip when the tenant is not `READY` or the persona is not `isReady`.
- No 2FA personas are ever listed (invariant: personas have `twoFactorEnabled = false`).

### 20.6 Limit notices

- Non-blocking inline notice in the module header: "Demo limit: 60 students. You have used 60."
- The create button stays visible but disabled with a tooltip, so the visitor sees the shape of the paid product.
- On a denied action, a `sonner` toast (already a dependency) plus the specific message from §19.5.

### 20.7 Accessibility

The banner and switcher are additions to already-working pages, so they inherit the WCAG 2.1 AA bar in `00_MASTER_RULES.md`: keyboard reachable, focus trapped in the dropdown, `aria-expanded`/`aria-controls` wired, 4.5:1 contrast, and a visible focus ring. The countdown is `aria-hidden` with a static text equivalent ("Demo expires in 42 minutes") for assistive tech.

### 20.8 Responsive behavior

The banner collapses to a single row on mobile with the countdown and a switcher icon button; the dropdown becomes a bottom sheet, matching the existing mobile sidebar treatment in `components/layout/mobile-sidebar.tsx`.

---

## 21. Server Actions, Route Handlers, and Background Execution

### 21.1 Server actions

| Action                 | File                                   | Auth                         | Notes                                                 |
| ---------------------- | -------------------------------------- | ---------------------------- | ----------------------------------------------------- |
| `requestDemoTenant`    | `actions/demo-tenant.actions.ts`       | Public                       | Zod, CAPTCHA, rate limit, breaker; returns `{ slug }` |
| `getDemoStatus`        | `app/api/demo/status/[token]/route.ts` | Token + cookie               | GET only, coarse payload (§16.5)                      |
| `getDemoLandingData`   | server component                       | Public                       | Public plans, personas preview, password from env     |
| `switchPersona`        | `actions/demo-persona.actions.ts`      | `requireAuth` + ownership    | Real sign-out, returns credentials + `redirectTo`     |
| `requestExtension`     | `actions/demo-tenant.actions.ts`       | `requireAuth` + `READY`      | One pending per tenant, cooldown                      |
| `listDemoTenants`      | `actions/demo-tenant.actions.ts`       | `requireRole('SUPER_ADMIN')` | Operator table, paginated                             |
| `extendDemoTenant`     | same                                   | `SUPER_ADMIN`                | Clamped, audited                                      |
| `revokeDemoTenant`     | same                                   | `SUPER_ADMIN`                | Immediate `REVOKED`, audited                          |
| `reseedDemoTenant`     | same                                   | `SUPER_ADMIN`                | Re-runs the idempotent runner                         |
| `forcePurgeDemoTenant` | same                                   | `SUPER_ADMIN`                | Used by the cron and by abuse response                |
| `getDemoTenantEvents`  | same                                   | `SUPER_ADMIN`                | Event timeline for debugging                          |

Every action re-validates authorization from the database. No action trusts a role claim from `user_metadata` for anything beyond what `proxy.ts` already does for redirects.

### 21.2 Route handlers

| Route                                  | Method | Purpose                                                                                                                     |
| -------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------- |
| `app/api/demo/status/[token]/route.ts` | GET    | Provisioning progress polling                                                                                               |
| `app/api/cron/demo-purge/route.ts`     | GET    | Expiry sweep, idle sweep, stale-inflight reap. Verified by `CRON_SECRET` bearer; `404` if the secret is unset in production |
| `app/api/demo/heartbeat/route.ts`      | POST   | Throttled `lastAccessedAt` touch, called by the banner                                                                      |

All three set `Cache-Control: no-store` and are excluded from any static optimization; the status route in particular must never be cached.

### 21.3 Background execution

**`lib/supabase/admin.ts` (new).** A stateless service-role client:

```ts
import { createClient } from "@supabase/supabase-js"

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}
```

It uses `@supabase/supabase-js` (already a dependency) rather than `@supabase/ssr`, because there is no cookie jar and none is wanted. It is `server-only` in intent: the service role key must never reach the client bundle, so the file is imported only from `services/demo/*`, `app/api/cron/*`, and scripts, and the build is verified to keep it out of any `"use client"` graph.

This is why the existing `createServiceClient()` cannot be reused: it calls `await cookies()` (`lib/supabase/server.ts:32-33`) and would throw outside a request scope.

**`after()`.** Used in `requestDemoTenant` to launch the seed worker after the response flushes. The worker:

- Owns its own `pg.Pool` + `PrismaPg` adapter, matching `scripts/seed.ts`, and closes it in `finally`.
- Wraps each phase in a transaction and commits before the next.
- Writes `seedProgress` and `seedStep` as it advances.
- Catches everything, records `seedError`, and never leaves the process unhandled.

**`"server-only"`.** `lib/demo/scope.ts`, `lib/demo/purge.ts`, and `lib/supabase/admin.ts` start with `import "server-only"` so an accidental client import fails at build time rather than leaking the service key.

---

## 22. Observability, Audit, and Analytics

### 22.1 Three log surfaces, three purposes

| Surface                     | Owns                                                          | Why separate                                                                    |
| --------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `DemoEvent`                 | Lifecycle facts per tenant                                    | Queryable from the operator console; the answer to "what happened to this demo" |
| `AuditLog` (`lib/audit.ts`) | User-attributed actions, using the existing `logAuditEvent()` | Consistent with the rest of the product's security trail                        |
| Structured console/`stderr` | Worker phase timing, purge outcomes                           | Cheap operational signal without a DB write per log line                        |

### 22.2 Metrics to derive from existing data

No new analytics dependency. All of these are queries over tables that already exist:

| Metric                    | Query shape                                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Provisioning success rate | `DemoEvent` grouped by `type` where `type IN ('SEED_COMPLETED','SEED_FAILED')`                                   |
| Time to ready             | `SEED_COMPLETED.createdAt - REQUESTED.createdAt` per tenant                                                      |
| Demo → trial conversion   | `DemoTenant` with `source = 'ADMIN_CREATED'` and `planId` moved off `DEMO`, or a `Plan` change plus a human flag |
| Persona usage             | `DemoPersona.signInCount`, `lastSignedInAt`                                                                      |
| Limit friction            | count of `DemoEvent` where `type = 'LIMIT_BLOCKED'`, grouped by `metadata.metric`                                |
| Purge backlog             | `count(DemoTenant where status IN ('EXPIRED') and purgeAfter < now())`                                           |
| Auth growth               | `DemoTenant` count over time vs. auth user count                                                                 |

Purge backlog is the metric to alert on. A growing backlog means the cron is not running, and the database is growing without bound.

### 22.3 Operator console

`app/(dashboard)/demo/page.tsx`, `SUPER_ADMIN` only:

- Table of tenants with status, plan, progress, expiry, last access, and event count. Paginated, following the `@tanstack/react-table` pattern already used elsewhere in the dashboard.
- Row actions: extend, revoke, re-seed, force purge, view events.
- Filters: status, plan, created range.
- Every action writes `DemoEvent` and `AuditLog` with the operator's profile id.

### 22.4 Logging rules

- Prefix every demo log line with `[demo]` and the tenant `slug`.
- Never log the shared password, access tokens, refresh tokens, or raw IPs.
- Truncate `seedError` to 500 characters and strip anything resembling a connection string.
- Log the Supabase auth user id when provisioning personas, so a leaked or mis-provisioned account is traceable.

### 22.5 Alerts

| Alert                      | Condition                                                      | Severity |
| -------------------------- | -------------------------------------------------------------- | -------- |
| Purge backlog              | > 20 expired tenants past `purgeAfter`                         | High     |
| Provisioning failure spike | > 25% of requests in 1 h end in `SEED_FAILED`                  | High     |
| Active tenant ceiling      | Active non-terminal tenants ≥ 90% of `DEMO_MAX_ACTIVE_TENANTS` | Medium   |
| Auth error spike           | > 10 auth errors/min against demo personas                     | Medium   |
| Circuit breaker open       | 5 breaker rejections in 15 min                                 | Low      |

---

## 23. Data Retention, Cleanup, and Rollback

### 23.1 Retention policy

| Data                           | Retained until                                  | Then                      |
| ------------------------------ | ----------------------------------------------- | ------------------------- |
| Demo tenant rows (tenant data) | `purgeAfter` = `expiresAt + plan.retentionDays` | Hard delete               |
| Demo auth users                | Same instant                                    | `auth.admin.deleteUser()` |
| `DemoEvent`                    | `purgeAfter` + 30 days                          | Hard delete               |
| `DemoExtensionRequest`         | `purgeAfter` + 30 days                          | Hard delete               |
| Hashed request IPs             | 30 days                                         | Hard delete               |
| Operator `AuditLog` rows       | Existing product policy                         | Unchanged                 |

The 30-day event tail after purge is deliberate: it preserves "was this tenant abused?" evidence without keeping the tenant's data.

### 23.2 Purge ordering

`lib/demo/purge.ts` deletes in dependency order using explicit `deleteMany` calls, not `TRUNCATE ... CASCADE`. `TRUNCATE` is what `scripts/seed.ts` uses, and it is exactly the wrong tool here: a single mis-specified table name would destroy real data.

1. Mark `status = REVOKED`, `purgeAfter = now`, write `DemoEvent(PURGE_STARTED)`. This makes the tenant immediately unusable even if the rest of the purge fails.
2. Delete auth users for each persona (`auth.admin.deleteUser()`), recording ids first.
3. Delete `DemoPersona` rows.
4. Delete child rows in dependency order: `StudentAttendance`, `HomeworkSubmission`, `Homework`, `ExamResult`, `ReportCard`, `ExamSchedule`, `Exam`, `Payment`, `FeeInvoiceItem`, `FeeInvoice`, `StudentFeePlan`, `FeeStructure`, `BookIssue`, `LibraryBook`, `StudentTransport`, `TransportRoute`, `Vehicle`, `Expense`, `Timetable`, `TeacherAssignment`, `ClassSubject`, `StudentParent`, `StudentEnrollment`, `StudentDocument`, `Notification`, `Message`, `Announcement`, `Event`, `Meeting`, `CalendarEvent`, `Staff`, `Teacher`, `Student`, `Parent`, `Setting`, `Section`, `Class`, `Subject`, `AcademicSession`, `Profile`, `Branch`, `School`.
5. Every delete is `where: { schoolId: demoSchoolId }` or a relation-scoped `where`. A delete without a tenant predicate is a code-review blocker.
6. Delete `DemoEvent`, `DemoExtensionRequest`, then the `DemoTenant` row (which cascades to nothing else, since the `School` is already gone).
7. Set `purgedAt` and null `schoolId` on the `DemoTenant` row rather than deleting it, so the operator console shows accurate history for 30 days without keeping a live foreign key to deleted data. `DemoTenant.schoolId` is therefore nullable with `onDelete: SetNull`. The row itself is deleted when that 30-day window closes.

### 23.3 Idempotency and safety

- Purge is idempotent: re-running on a purged tenant is a no-op.
- Purge is chunked (batched deletes of 500 rows) to stay inside statement timeouts and connection limits.
- A `DRY_RUN` mode deletes nothing and logs the row counts per table, so the first production run is verified before it is destructive.
- Purge never runs when `DEMO_DISABLED = true`.

### 23.4 Rollback plan per phase

| Phase                   | Rollback                                                                                                                                                                                |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1-3 (schema + libs)     | Revert `schema.prisma`; `db push` drops the new tables. `School.planId` is nullable, so removing it is non-destructive. Restore the `proxy.ts` line if Phase 12 flipped `/demo` public. |
| 4-5 (seeder + personas) | Delete `services/demo/*` and `actions/demo-persona.actions.ts`; no product code is touched.                                                                                             |
| 6-7 (public site)       | Remove the `app/(demo)` group and the `/demo` entry in `publicRoutes`; routes 404 again.                                                                                                |
| 8 (switcher)            | Remove the switcher from the two layouts; the layouts revert to their current shape.                                                                                                    |
| 9 (shell)               | Remove the banner and the notice components; `getDemoContext()` is no longer called.                                                                                                    |
| 10 (console)            | Remove `app/(dashboard)/demo`; `SUPER_ADMIN` routes return to normal.                                                                                                                   |
| 11-12 (ops)             | Disable via `DEMO_DISABLED = true`, a flag checked in the request action, the guard, and the cron. This is a same-day kill switch that does not require a deploy.                       |

Because the guard is additive and flag-gated, the entire subsystem can be disabled in production without a rollback deploy. That property is a design requirement, not a convenience.

### 23.5 Pre-production safety

Before the first production `db push`: take a `pg_dump` via `DIRECT_URL`, verify the dump restores into a scratch database, and record the restore time. A destructive `db push` on a schema with 73 models and no migration history is the single highest-risk operation in this plan.

---

## 24. Testing Strategy

There is no test framework installed. Adding Vitest in Phase 1 (not later) is the recommendation: the limit-evaluation and lifecycle-guard logic is pure and worth locking down, and retrofitting a runner after twelve phases is far more disruptive. If the project prefers to stay script-based, the fallback is the same assertions expressed in `scripts/demo-verify.ts`.

### 24.1 Automated coverage

| Level       | Target                                                        | Notes                                                      |
| ----------- | ------------------------------------------------------------- | ---------------------------------------------------------- |
| Unit        | `lib/demo/limits.ts`, `lib/demo/slug.ts`, `lib/demo/plans.ts` | Pure functions; no I/O; the highest value per line         |
| Integration | `getDemoContext()`, `assertWithinLimit()`, persona invariants | Against a real test database, since isolation is the point |
| Contract    | `app/api/demo/status/[token]` response shape                  | The poller depends on this exact shape                     |
| E2E         | One script per persona                                        | Provision → sign in → assert a non-empty screen            |

### 24.2 `scripts/demo-verify.ts`

Follows the existing `scripts/check-*.ts` convention. For a given tenant (or the newest one) it asserts the §11.5 invariants and prints a pass/fail table:

1. `DemoTenant` exists, `status = READY`, `seedProgress = 100`.
2. All four `DemoPersona` rows are `isReady` with non-null `authUserId`.
3. For each persona: `authUserId` exists in Supabase Auth, `Profile.id` matches, `Profile.email` matches, `Profile.role` matches, `Profile.schoolId` matches, `Profile.status = 'ACTIVE'`.
4. `Teacher` persona has a `Teacher` row with matching `profileId` and ≥ 1 `TeacherAssignment`.
5. `Student` persona has a `Student` row with matching `email` and ≥ 1 `StudentEnrollment`.
6. `Parent` persona has a `Parent` row with matching `email` and a `StudentParent` link.
7. No duplicate `School.code`, `Branch.code`, `FeeInvoice.invoiceNumber`, `Payment.receiptNumber`, `IdCard.cardNumber`, or `LibraryBook.isbn` across the whole database.
8. Every generated code starts with the tenant slug prefix.
9. Row counts match the §17 catalog within tolerance.
10. Cross-tenant negative check: query one row type with a _different_ tenant's `schoolId` and assert zero results.

Check 10 is the one that matters most and is the direct test of §14.

### 24.3 Manual test matrix

| #   | Scenario                                         | Expected                                             |
| --- | ------------------------------------------------ | ---------------------------------------------------- |
| M1  | Request a demo as a new visitor                  | Status page → `READY` → persona cards                |
| M2  | Enter as Admin                                   | `/dashboard` with populated charts                   |
| M3  | Switch to Teacher                                | Redirects to `/portal/teacher`, non-empty schedule   |
| M4  | Switch to Student                                | `/portal/student`, grades and fees visible           |
| M5  | Switch to Parent                                 | `/portal/parent`, child data visible                 |
| M6  | Try a non-allowlisted write as Admin             | `DEMO_LIMITED` notice, no data change                |
| M7  | Hit the student cap                              | `DEMO_LIMIT_REACHED`, create button disabled         |
| M8  | Request an extension                             | `PENDING`, then granted by an operator               |
| M9  | Request an extension twice                       | Second returns 409                                   |
| M10 | Wait for expiry (use a short-duration test plan) | Banner → ended screen, no product data               |
| M11 | Attempt a direct URL after expiry                | Ended screen, no data leak                           |
| M12 | Sign in after expiry                             | Refused                                              |
| M13 | Expiry + `purgeAfter`                            | Cron purges; auth user deleted; direct sign-in fails |
| M14 | Manually sign in as a purged persona's email     | Supabase rejects (user deleted)                      |
| M15 | Forge a status token                             | 404, no tenant data                                  |
| M16 | Request 4 demos in 10 min from one IP            | 429                                                  |
| M17 | Cross-tenant probe with tenant A's session       | No data from tenant B                                |
| M18 | Set `DEMO_DISABLED=true`                         | All demo routes refuse, product unaffected           |
| M19 | Re-seed a `READY` tenant                         | Idempotent; no duplicates (check 7)                  |
| M20 | Worker killed mid-seed                           | Stale-tenant reap marks `FAILED` and purges          |

### 24.4 Security review checklist

- No service-role key in any client bundle (verified by inspecting the build output for `SUPABASE_SERVICE_ROLE_KEY`).
- `proxy.ts` still contains no Prisma import.
- No demo action accepts a client-supplied `schoolId` or `branchId` as authoritative.
- Every delete in `lib/demo/purge.ts` has a tenant predicate.
- The shared password never appears in a log, a `DemoEvent`, or an error message.
- The status endpoint leaks nothing beyond lifecycle state.
- `TRIAL_PRO` is not reachable from the public form.

### 24.5 CI

`npm run typecheck`, `npm run lint`, and `npm run build` must pass at every phase boundary, matching the existing constraint. Once Vitest exists, `npm test` joins the gate. The demo suite runs against a dedicated test database in CI, never production.

---

## 25. Delivery Plan — 12 Phases

Phases are ordered so that every phase is independently shippable and dark-launchable. `DEMO_DISABLED` defaults to `true` until Phase 12, so none of Phases 1-11 is user-visible.

---

### Phase 1 — Foundation, Schema, and Test Harness

**Objective.** Land the additive schema, the shared demo libraries, and a test runner, with nothing user-facing.

**Files (new).** `lib/demo/constants.ts`, `lib/demo/plans.ts`, `lib/demo/slug.ts`, `lib/supabase/admin.ts`, `scripts/seed-plans.ts`, `scripts/demo-verify.ts` (skeleton), `lib/demo/__tests__/slug.test.ts`, `vitest.config.ts`.

**Files (modified).** `prisma/schema.prisma` (5 enums, 6 models, `School.planId`), `package.json` (`test` script, Vitest devDependency), `.env.example` (new optional variables), `lib/env.ts` (optional demo variables with safe defaults), `tsconfig.json` (test path alias if needed).

**Database.** Adds `plans`, `plan_limits`, `demo_tenants`, `demo_personas`, `demo_events`, `demo_extension_requests`; adds nullable `schools.plan_id` plus index. Applied with `npm run db:generate` then `npm run db:push` to a non-production database first.

**Server actions.** None.

**UI.** None.

**Security.** `lib/supabase/admin.ts` sets `autoRefreshToken: false, persistSession: false` and is imported only from server contexts. `lib/demo/constants.ts` holds no secrets. Environment variables are validated in `lib/env.ts`; `DEMO_DISABLED` defaults to `true`.

**Tests.** Unit tests for `slug()` uniqueness, retry behavior, and alphabet safety. `tsc --noEmit`, `eslint`, and `next build` clean. `scripts/demo-verify.ts` runs against a test database with no demo tenants and exits 0.

**Dependencies.** None.

**Acceptance criteria.**

- `npm run typecheck`, `npm run lint`, `npm run build`, `npm test` all pass.
- All six tables exist with the expected indexes; `\d demo_tenants` matches §6.
- `School.planId` is nullable and no existing row is null-unsafe.
- `scripts/seed-plans.ts` is idempotent: run twice, `count(plan_limits)` is unchanged.
- A build-output grep for `SUPABASE_SERVICE_ROLE_KEY` finds no client chunk.
- No existing route's behavior has changed; `git diff` touches only the files listed above.

---

### Phase 2 — Demo Tenant Lifecycle and Scope Library

**Objective.** Model the state machine and the request-path guard, still with no UI.

**Files (new).** `lib/demo/scope.ts`, `lib/demo/events.ts`, `lib/demo/transition.ts`, `lib/demo/__tests__/transition.test.ts`.

**Files (modified).** None outside `lib/demo/`. Layouts are wired in Phase 9.

**Database.** Uses the Phase 1 tables. Adds a repository layer with tenant-scoped predicates; no schema change.

**Server actions.** None. `lib/demo/transition.ts` exposes `transitionTo(tenantId, status, metadata)` used later by actions and the cron.

**UI.** None.

**Security.** `lib/demo/scope.ts` begins with `import "server-only"`. `getDemoContext()` treats a missing `DemoTenant` as "not a demo" so production schools are unaffected. The `throttledTouch` write is capped at once per 15 minutes per tenant. Expiry is evaluated at read time, not only by the cron.

**Tests.** State-machine tests covering every legal transition and every illegal one (terminal states are write-once; `READY` cannot go back to `SEEDING`; `PURGED` never resurrects). Test that a profile with a `schoolId` that has no `DemoTenant` returns `{ isDemo: false }`.

**Dependencies.** Phase 1.

**Acceptance criteria.**

- Every transition in §5.2 is implemented and rejects the illegal ones.
- `getDemoContext()` returns `isDemo: false` for a production school and for `SUPER_ADMIN`.
- A tenant with `expiresAt` in the past is transitioned to `EXPIRED` on read and reports "demo ended".
- Each transition writes exactly one `DemoEvent`.
- Guard adds < 15 ms p95 to a layout render (measured).

---

### Phase 3 — Plan and Limit Engine

**Objective.** Make limits data-driven and enforceable, with a pure, tested evaluator.

**Files (new).** `lib/demo/limits.ts`, `lib/demo/__tests__/limits.test.ts`, `components/demo/limit-notice.tsx` (presentational only).

**Files (modified).** `scripts/seed-plans.ts` (expand to the §8.3 catalog with drift reporting).

**Database.** Reads `plans` and `plan_limits`; writes nothing except `DemoEvent(LIMIT_BLOCKED)`. `resolvePlanLimits()` is wrapped in React `cache()`.

**Server actions.** `assertWithinLimit(profile, metric, incoming?)` and `getLimitNotices(profile)` — library functions first; wiring into product actions happens in Phase 9.

**UI.** `LimitNotice` component, not yet mounted.

**Security.** `limitValue = -1` is the only unlimited sentinel; `null` is never treated as unlimited. Denials return a structured `DEMO_LIMIT_REACHED` object rather than throwing. `metadata` on `LIMIT_BLOCKED` carries the metric and limit only.

**Tests.** Table-driven unit tests: at-limit, over-limit, unlimited, disabled limit, `PER_DAY` window, and a metric with no row configured (allowed, since an absent limit is not a denial). Drift test for `seed-plans.ts`.

**Dependencies.** Phase 1.

**Acceptance criteria.**

- Changing `plan_limits.limit_value` in the database changes enforcement on the next request with no deploy.
- `DEMO` plan rejects student 61 with a structured result.
- `INTERNAL` plan (all `-1`) allows everything.
- A missing `PlanLimit` row does not block the action.
- 100% branch coverage on `limits.ts`.

---

### Phase 4 — Asynchronous Seed Runner

**Objective.** Produce a realistic, deterministic, resumable dataset without blocking the request.

**Files (new).** `services/demo/seed-data.ts`, `services/demo/seed-runner.ts`, `services/demo/prng.ts`, `scripts/demo-seed.ts` (CLI wrapper for local runs), `lib/demo/__tests__/prng.test.ts`.

**Files (modified).** `scripts/demo-verify.ts` (adds count and uniqueness checks).

**Database.** Writes the seeded tenant rows. No schema change. High-volume inserts use `createMany`; each phase commits in its own transaction.

**Server actions.** None yet; `requestDemoTenant` is wired in Phase 6.

**UI.** None.

**Security.** Slug-prefixed generation for every globally unique column (§11.2). Reserved `.invalid` domains. `createMany` is always tenant-scoped by `schoolId`. `scripts/demo-seed.ts` refuses to run unless `DEMO_SEED_ALLOW` is set, so it cannot be pointed at production casually.

**Tests.** Determinism test: two runs with the same slug produce identical row counts and identical hashed content. Idempotency test: run twice, assert no duplicate `School.code`, `FeeInvoice.invoiceNumber`, `Payment.receiptNumber`, `IdCard.cardNumber`, or `LibraryBook.isbn`. Resume test: interrupt after phase E and re-run, assert convergence.

**Dependencies.** Phases 1-2. Requires `next/server`'s stable `after()` to be confirmed against the installed Next.js 16 docs in `node_modules/next/dist/docs/` before wiring.

**Acceptance criteria.**

- A full `DEMO` seed completes in under 90 s locally and under 180 s on the target deployment.
- Row counts match §17 within tolerance; `scripts/demo-verify.ts` checks 7-9 pass.
- `seedProgress` and `seedStep` advance monotonically.
- A failure in phase G leaves phases A-F committed and the tenant in `FAILED`.
- Two runs of the same slug produce byte-identical generated codes.

---

### Phase 5 — Persona Account Provisioning

**Objective.** Create four real Supabase Auth users with correct profiles and linked entities.

**Files (new).** `services/demo/personas.ts`, `actions/demo-persona.actions.ts` (action bodies only; UI in Phase 8), `lib/demo/__tests__/persona-invariants.test.ts`.

**Files (modified).** `services/demo/seed-runner.ts` (call persona provisioning after seeding), `scripts/demo-verify.ts` (adds checks 2-6).

**Database.** Creates `DemoPersona` rows, `Profile` rows, and the linked `Teacher`/`Student`/`Parent`/`Staff`/`StudentParent` entities. Writes `DemoEvent` per persona.

**Server actions.** Provisioning functions (`provisionPersonas`, `deletePersonas`). `switchPersona` is defined in Phase 8.

**UI.** None.

**Security.** `email_confirm: true` is mandatory. `user_metadata.role` is set for `proxy.ts` compatibility but is never used for authorization. Personas are created with `twoFactorEnabled = false` so the switcher cannot strand a visitor. On any failure the created auth users and profiles are deleted before the tenant is marked `FAILED`.

**Tests.** Integration tests against a test project: provision all four personas, assert auth users exist and are confirmed, assert §11.5 invariants 1-8, then delete and assert no residue. A test that a partially failed provisioning leaves zero auth users.

**Dependencies.** Phases 1, 2, 4. Requires `DEMO_PERSONA_PASSWORD` in the environment.

**Acceptance criteria.**

- Four personas exist, each with a working `signInWithPassword`.
- `scripts/demo-verify.ts` checks 1-6 pass.
- A forced failure mid-provisioning leaves no auth users and no orphan `Profile` rows.
- No seeded row collides with a real school's codes or emails (§11.1, verified globally).
- `Profile.email` uniqueness is never violated, confirmed by running the seeder against a database that already contains production data.

---

### Phase 6 — Public Request Flow and Polling Endpoint

**Objective.** Let a visitor self-serve a demo and watch it being built.

**Files (new).** `actions/demo-tenant.actions.ts` (public request action), `lib/demo/rate-limit.ts`, `app/api/demo/status/[token]/route.ts`, `app/api/cron/demo-purge/route.ts` (skeleton), `lib/demo/__tests__/request.test.ts`.

**Files (modified).** `lib/env.ts` (demo variables), `.env.example` (documented defaults), `package.json` (cron-friendly script if needed).

**Database.** Creates `DemoTenant` and `DemoEvent(REQUESTED)` in one transaction; schedules `after()`.

**Server actions.** `requestDemoTenant(input)`.

**UI.** None yet; the status route is consumable but has no page.

**Security.** Zod validation on every field. CAPTCHA score gate. Rate limits from §15.2 applied _before_ any auth call. Circuit breaker on active tenant count. Hashed IP only. The status route requires the unguessable slug **and** a signed status cookie, returns only the §16.5 shape, and sets `Cache-Control: no-store`. The cron route verifies `CRON_SECRET` and 404s if unset in production.

**Tests.** Integration: happy path creates a tenant in `REQUESTED`; oversize input rejected; rate limit trips at the documented thresholds; missing CAPTCHA fails closed; the breaker returns 503 at the ceiling; the status route 404s for a bad token and returns no tenant data; the cron route 401s without the secret.

**Dependencies.** Phases 1-5.

**Acceptance criteria.**

- `POST` equivalent returns `{ slug }` in under 500 ms with no seeding on the request path.
- The status route's response contains no email, password, or tenant data.
- 11 consecutive requests from one IP yield 429 on the fourth.
- `DEMO_DISABLED = true` makes the action return 503 and the status route 404.
- `tsc`, `lint`, `build`, and tests pass.

---

### Phase 7 — Public Demo Pages

**Objective.** Ship the visitor-facing experience.

**Files (new).** `app/(demo)/layout.tsx`, `app/(demo)/demo/page.tsx`, `app/(demo)/demo/loading.tsx`, `app/(demo)/demo/error.tsx`, `components/demo/request-form.tsx`, `components/demo/persona-cards.tsx`, `components/demo/provisioning-status.tsx`, `components/demo/demo-credentials.tsx`.

**Files (modified).** `proxy.ts` — one additive line adding `/demo` to `publicRoutes`, deliberately deferred to this phase so the product's auth flow is never touched by an early-phase bug.

**Database.** Read-only on the server component: public `Plan` rows and persona previews.

**Server actions.** `getDemoLandingData()` (server component data loader) and the Phase 6 request action.

**UI.** The full landing and provisioning experience per §20.2-20.3, using existing UI primitives (`Card`, `Badge`, `Button`) and `sonner` for toasts.

**Security.** The shared password is rendered from the server component only, never returned by the status route. The page states plainly that data is fictional and auto-deleted. No secret is embedded in a `"use client"` prop beyond the intentionally public password. The public route list change is additive and reviewed.

**Tests.** Component tests for the form validation and the poller's state machine; E2E: request a demo and reach the persona cards; a test that the poller stops on terminal states; a test that backoff caps at 10 s.

**Dependencies.** Phase 6. Requires `DEMO_PERSONA_PASSWORD` and the CAPTCHA keys.

**Acceptance criteria.**

- A new visitor can reach a working persona selection without any manual step.
- The status poller handles `PENDING` → `PROVISIONING` → `SEEDING` → `READY` and both `FAILED` and `EXPIRED`.
- `/demo` is reachable unauthenticated; `/login` and `/dashboard` behavior is unchanged.
- Lighthouse on `/demo`: performance ≥ 90, accessibility ≥ 95.
- The page passes the §20.7 accessibility checks (keyboard, focus, contrast, `aria-live` throttling).

---

### Phase 8 — Persona Switcher

**Objective.** Let a visitor move between personas with real authentication.

**Files (new).** `components/demo/persona-switcher.tsx`, `components/demo/switch-persona-button.tsx`, `actions/demo-persona.actions.ts` (adds `switchPersona`, `getPersonaSwitcherState`).

**Files (modified).** `app/(dashboard)/layout.tsx` and `app/portal/layout.tsx` — additive switcher mount plus the `getDemoContext()` guard (guard fully validated in Phase 9).

**Database.** Updates `DemoPersona.signInCount` and `lastSignedInAt`; writes `DemoEvent(PERSONA_SIGNIN)`.

**Server actions.** `switchPersona(personaId)`, `getPersonaSwitcherState()`.

**UI.** The switcher dropdown per §20.5, redirecting per §13.3.

**Security.** Ownership check derives the tenant from the signed-in profile, never from client input. An unauthenticated or cross-tenant persona id is rejected before any credential is returned. The existing `signout()` is used so the audit trail is preserved. Refused when the tenant is not `READY`. Personas with 2FA are never listed. The action returns a structured result, and failures are logged without the password.

**Tests.** Integration: switching to each persona yields a session whose `getCurrentProfile().role` matches and whose redirect is correct; a cross-tenant persona id is rejected; an expired tenant refuses to switch; an unauthenticated call throws. A test that `proxy.ts` still redirects the teacher persona to `/portal/teacher` and the student/parent personas to their portals, and never to a page the role cannot reach.

**Dependencies.** Phases 5 and 7.

**Acceptance criteria.**

- All four personas sign in and land on a populated, role-correct screen.
- The switcher appears only for demo tenants.
- A cross-tenant persona id produces no credential and an audit event.
- Signing out before signing in leaves no residual session for the previous persona.
- `DemoPersona.signInCount` increments exactly once per switch.

---

### Phase 9 — In-App Demo Shell and Limit Enforcement

**Objective.** Make the demo unmistakable from the inside and enforce plan limits on real actions.

**Files (new).** `components/demo/demo-banner.tsx`, `components/demo/countdown.tsx`, `components/demo/leave-demo.tsx`, `components/demo/request-extension-form.tsx`, `app/api/demo/heartbeat/route.ts`.

**Files (modified).** `app/(dashboard)/layout.tsx` and `app/portal/layout.tsx` (mount the banner and the ended-state screen), plus create paths in `actions/student.actions.ts`, `actions/staff.actions.ts`, `actions/branch.actions.ts`, `actions/fees.actions.ts`, `actions/library.actions.ts`, `actions/transport.actions.ts` (`assertWithinLimit` and the `DEMO_LIMITED` allowlist).

**Database.** Throttled `lastAccessedAt` touch; `DemoExtensionRequest` on extension; `DemoEvent` for `LIMIT_BLOCKED` and `EXTENSION_*`.

**Server actions.** `requestExtension(reason, contactEmail)`, `getLimitNotices()`.

**UI.** Banner, countdown, switcher placement, limit notices, and the ended-state screen per §20.4-20.6.

**Security.** The guard refuses `children` from rendering when the tenant is not `READY`; the ended screen shows no tenant data. Only the allowlist in §19.3 permits writes. Extension requests are rate limited and capped at one pending per tenant. `TRIAL_PRO` is never selectable from the public form. No product route, folder, or existing page is renamed or redesigned.

**Tests.** Manual matrix M2-M12. Automated: the banner renders only for demo tenants; the ended screen renders when expired; the countdown is `aria-hidden` with a static text equivalent; extension request 1 succeeds and request 2 returns 409; creating student 61 in a `DEMO` tenant is denied and writes a `LIMIT_BLOCKED` event; an allowlisted write (attendance for today) still succeeds.

**Dependencies.** Phases 3, 8.

**Acceptance criteria.**

- Every screen reached by a demo persona shows the banner with a correct countdown.
- Expired tenants cannot render any product data, by direct URL or navigation.
- Plan limits are enforced server-side and change with a database edit only.
- Denial messages are specific and never expose an exception.
- `npm run typecheck`, `npm run lint`, `npm run build`, `npm test` all pass, and the demo audit trail is complete for one full manual pass.

---

### Phase 10 — Operator Console

**Objective.** Give `SUPER_ADMIN` full operational control.

**Files (new).** `app/(dashboard)/demo/page.tsx`, `app/(dashboard)/demo/tenants/[id]/page.tsx`, `components/demo/tenant-table.tsx`, `components/demo/tenant-detail.tsx`, `components/demo/event-timeline.tsx`, `components/demo/lifecycle-actions.tsx`.

**Files (modified).** `actions/demo-tenant.actions.ts` (adds `listDemoTenants`, `getDemoTenantEvents`, `extendDemoTenant`, `revokeDemoTenant`, `reseedDemoTenant`, `forcePurgeDemoTenant`), `lib/menu-items.ts` (adds the demo entry for `SUPER_ADMIN`).

**Database.** All lifecycle mutations, each writing `DemoEvent` and `AuditLog` with the operator's `actorProfileId`.

**Server actions.** The six operator actions above.

**UI.** Paginated tenant table with status, plan, progress, expiry, last access, and event count; filters; row actions; event timeline.

**Security.** Every action requires `requireRole('SUPER_ADMIN')`, re-validated from the database. Extension minutes are clamped. Revoke is immediate. The console is not linked from the persona switcher and is not reachable by any demo persona. Purge supports a `DRY_RUN` mode.

**Tests.** Integration: a non-`SUPER_ADMIN` profile is refused on every operator action; extend clamps to the maximum; revoke transitions to `REVOKED` and locks the personas out; re-seed is idempotent; `forcePurge` in `DRY_RUN` deletes nothing and reports counts.

**Dependencies.** Phases 2, 3, 4, 9.

**Acceptance criteria.**

- An operator can find, extend, revoke, re-seed, and purge a tenant without database access.
- Every operator action appears in `AuditLog` with the operator's id.
- A `DEMO` tenant never appears as selectable for a trial upgrade by a demo persona.
- Manual matrix M13, M19, and M20 pass.

---

### Phase 11 — Retention, Purge, and Observability

**Objective.** Bound growth and make the subsystem diagnosable.

**Files (new).** `lib/demo/purge.ts`, `lib/demo/retention.ts`, `app/api/cron/demo-purge/route.ts` (complete), `scripts/demo-metrics.ts`, `docs/DEMO_OPERATIONS.md` (runbook).

**Files (modified).** `lib/env.ts` (`CRON_SECRET`, `DEMO_MAX_ACTIVE_TENANTS`, `DEMO_DISABLED`, retention defaults), `.env.example`, `docs/DEPLOYMENT.md` (cron registration).

**Database.** Ordered tenant-scoped deletes; `DemoTenant.schoolId` is nulled and the row retained as `PURGED` for 30 days; `DemoEvent` and `DemoExtensionRequest` deleted 30 days after purge.

**Server actions.** `getDemoMetrics()` for the console header.

**UI.** Backlog and failure-rate indicators on the console page.

**Security.** Every delete in `lib/demo/purge.ts` requires a tenant predicate; a delete without one is a code-review blocker. Deletes are batched at 500 rows. Purge is idempotent and no-ops when `DEMO_DISABLED = true`. The cron route requires `CRON_SECRET` and 404s in production if unset. No raw IPs are stored beyond the 30-day hashed window.

**Tests.** Integration: purge removes every seeded row and the auth users; a re-run is a no-op; `DRY_RUN` changes nothing; stale in-flight tenants are reaped; a partial purge failure still leaves the tenant unusable. Manual matrix M13 and M14.

**Dependencies.** Phases 4, 5, 10.

**Acceptance criteria.**

- `SELECT count(*) FROM students WHERE school_id = <purged>` returns 0, and the Supabase auth users are gone.
- A direct sign-in attempt with a purged persona email fails.
- Purge backlog returns to zero after one cron run.
- The runbook covers provisioning failure, auth lockout, purge backlog, and the kill switch.
- The alerts in §22.5 are wired to a real channel.

---

### Phase 12 — Hardening, Security Review, and Launch

**Objective.** Prove the properties the plan claims, then turn the feature on.

**Files (new).** `docs/DEMO_TRIAL_SYSTEM_PLAN_REVIEW.md` (the security review output), `docs/DEMO_RUNBOOK.md` if not already produced in Phase 11.

**Files (modified).** `proxy.ts` (final `publicRoutes` verification only), `README.md` and `docs/01_PROJECT_OVERVIEW.md` (document the demo surface), `CHANGELOG.md`.

**Database.** Final `db push` to production in a maintenance window, preceded by a verified `pg_dump` (§23.5).

**Server actions.** None new. Hardening only: stricter CAPTCHA threshold, tightened rate limits based on Phase 9-11 telemetry.

**UI.** Design polish from the Phase 7 Lighthouse and Phase 9 accessibility results; no structural change.

**Security.** Full pass of the §24.4 checklist. Confirm the service key is absent from client bundles. Confirm `proxy.ts` has no Prisma import. Confirm the status endpoint leaks nothing. Confirm `TRIAL_PRO` is not publicly reachable. Run `scripts/demo-verify.ts` against production-shaped data.

**Tests.** The complete §24.3 manual matrix (M1-M20) executed against the production-shaped deployment, plus the automated suite. Re-run §24.2 check 10 (cross-tenant negative) explicitly as a security test.

**Dependencies.** Phases 1-11.

**Acceptance criteria.**

- All 20 manual matrix scenarios pass against the production-shaped environment.
- Every §24.4 checklist item is verified in writing, in `docs/DEMO_TRIAL_SYSTEM_PLAN_REVIEW.md`.
- `DEMO_DISABLED = false` can be flipped, verified, and reverted to `true` without a deploy.
- `pg_dump` restore is verified before the production `db push`.
- `npm run typecheck`, `npm run lint`, `npm run build`, `npm test` pass; no existing route's behavior has regressed.
- Named sign-off from the operator on the kill switch and the runbook.

---

### 25.13 Phase dependency summary

| Phase                 | Depends on | Can ship dark? | User-visible                    |
| --------------------- | ---------- | -------------- | ------------------------------- |
| 1 Foundation          | —          | yes            | no                              |
| 2 Lifecycle           | 1          | yes            | no                              |
| 3 Limit engine        | 1          | yes            | no                              |
| 4 Seed runner         | 1, 2       | yes            | no                              |
| 5 Personas            | 1, 2, 4    | yes            | no                              |
| 6 Request + status    | 1-5        | yes            | no                              |
| 7 Public pages        | 6          | yes            | yes (after the `proxy.ts` line) |
| 8 Switcher            | 5, 7       | yes            | yes                             |
| 9 Shell + enforcement | 3, 8       | yes            | yes                             |
| 10 Operator console   | 2, 3, 4, 9 | yes            | operator only                   |
| 11 Retention          | 4, 5, 10   | yes            | operator only                   |
| 12 Launch             | 1-11       | —              | yes                             |

---

## 26. Risks, Mitigations, and Open Questions

### 26.1 Risk register

| #   | Risk                                                                                             | Likelihood | Impact     | Mitigation                                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------ | ---------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | `db push` on a 73-model schema with no migration history drops or rebuilds a table in production | Medium     | Critical   | Verified `pg_dump` + restore drill first (§23.5); additive-only schema in the first push; maintenance window; `School.planId` nullable |
| R2  | Globally unique columns collide across concurrent demo tenants                                   | High       | High       | Slug-prefixed generation for all 11 global uniques (§11.2); a `scripts/demo-verify.ts` global duplicate check                          |
| R3  | The shared demo password is published, so anyone can sign in                                     | Certain    | Low-medium | Read-mostly allowlist, 3-day expiry, automatic purge, fictional data only, tenant-scoped isolation                                     |
| R4  | Demo personas land on empty or broken screens                                                    | Medium     | High       | Seed catalog targets each persona's landing screen (§17.5); `demo-verify.ts` invariant checks 4-8                                      |
| R5  | `after()` is killed mid-seed, leaving a stuck tenant                                             | Medium     | Medium     | Stale in-flight reap in the cron; phase-level commits; resumable idempotent runner                                                     |
| R6  | The lifecycle guard slows every authenticated request                                            | Low        | Medium     | Single indexed lookup, React `cache()`, throttled write; measured in Phase 2 with a 15 ms p95 budget and a documented fallback         |
| R7  | A limit is implemented as a permission by mistake later                                          | Medium     | High       | §19.1 rationale; the limit engine is separate and tested; a review checklist item                                                      |
| R8  | Demo farm creation inflates auth and database cost                                               | High       | Medium     | CAPTCHA, per-IP provisioning caps, global active-tenant breaker, retention sweep                                                       |
| R9  | The service-role key leaks into a client bundle                                                  | Low        | Critical   | `import "server-only"`, `@supabase/supabase-js` without session persistence, build-output grep in Phase 1 and Phase 12                 |
| R10 | Rate limiting on a serverless deployment is per-instance and ineffective                         | Medium     | Medium     | Pluggable store; a Postgres-backed store before public launch; documented dev-only semantics                                           |
| R11 | A demo write path is reached that bypasses `assertWithinLimit`                                   | Medium     | Medium     | Allowlist approach (default deny) plus `scripts/demo-verify.ts` counts plus the manual matrix                                          |
| R12 | Seeded notifications or emails attempt real delivery                                             | Low        | Medium     | `.invalid` domains; demo tenant detection in the notification sender                                                                   |
| R13 | Students or parents in seed data look like real people                                           | Low        | Medium     | Fixed fictional name list, no real addresses, no real phone numbers                                                                    |
| R14 | Trial conversion leaves synthetic data in a production school                                    | Low        | High       | No convert-in-place path; conversion creates a fresh `School`                                                                          |
| R15 | Scope creep into billing/subscriptions                                                           | Medium     | Medium     | `Plan` + `PlanLimit` only; no subscription model; §9.3 rationale                                                                       |

### 26.2 Open questions

These need a decision before the indicated phase. Each has a stated default so work is not blocked.

| #   | Question                                                                                                 | Default if unanswered                                        | Needed by |
| --- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | --------- |
| Q1  | Demo duration: is 3 days the right default?                                                              | 3 days                                                       | Phase 1   |
| Q2  | Should the public demo require a work email, or allow anonymous?                                         | Optional work email                                          | Phase 7   |
| Q3  | CAPTCHA provider: reCAPTCHA v3, Turnstile, or none?                                                      | Turnstile if available, else reCAPTCHA v3                    | Phase 6   |
| Q4  | Is a visible countdown countdown timer desirable to prospects, or does expiry work better as a surprise? | Visible countdown                                            | Phase 9   |
| Q5  | Should the demo be indexed by search engines?                                                            | `noindex` on `app/(demo)`                                    | Phase 7   |
| Q6  | How many demo personas in v1?                                                                            | 4 (Admin, Teacher, Student, Parent)                          | Phase 5   |
| Q7  | Should `TRIAL_PRO` become publicly selectable?                                                           | No; requires per-user passwords                              | Phase 8   |
| Q8  | Where does purge run: Vercel cron, Supabase cron, or pg_cron?                                            | Platform cron hitting `app/api/cron/demo-purge`              | Phase 11  |
| Q9  | Retention after expiry: 2 days or longer?                                                                | 2 days for `DEMO`, 14-30 for trials                          | Phase 11  |
| Q10 | Is a disposable-email blocklist needed on the optional contact email?                                    | No; the field is not used for sign-in                        | Phase 6   |
| Q11 | Should demo tenants appear in the existing `AuditLog` search, or stay in `DemoEvent` only?               | Both; `DemoEvent` for lifecycle, `AuditLog` for user actions | Phase 10  |
| Q12 | Rate-limit store: in-process, Postgres, or Upstash?                                                      | In-process in dev, Postgres before public launch             | Phase 6   |
| Q13 | Should persona switching record the previous persona for a "return to" affordance?                       | No; keep the switcher a fixed four-item list                 | Phase 8   |
| Q14 | Who approves extension requests, and within what SLA?                                                    | `SUPER_ADMIN`, same day                                      | Phase 10  |

### 26.3 New environment variables

All optional with safe defaults, so no deployment breaks by upgrading the code.

| Variable                            | Default                       | Purpose                                                      |
| ----------------------------------- | ----------------------------- | ------------------------------------------------------------ |
| `DEMO_DISABLED`                     | `true`                        | Kill switch; the only switch that must exist                 |
| `DEMO_PERSONA_PASSWORD`             | none (required when enabled)  | Shared persona password                                      |
| `DEMO_MAX_ACTIVE_TENANTS`           | `25`                          | Circuit breaker ceiling                                      |
| `DEMO_DEFAULT_PLAN_KEY`             | `DEMO`                        | Plan applied to public requests                              |
| `DEMO_MAX_EXTENSION_MINUTES`        | `1440`                        | Clamp on extensions                                          |
| `DEMO_RETENTION_DAYS`               | per plan                      | Fallback when a plan has no value                            |
| `DEMO_IDLE_PURGE_HOURS`             | `72`                          | Idle purge for tenants nobody returns to                     |
| `DEMO_STALE_SEED_MINUTES`           | `10`                          | Reap threshold for interrupted seeds                         |
| `CRON_SECRET`                       | none (required in production) | Authenticates the purge route                                |
| `DEMO_CAPTCHA_SECRET`               | none (required when enabled)  | CAPTCHA verification                                         |
| `NEXT_PUBLIC_DEMO_CAPTCHA_SITE_KEY` | none                          | CAPTCHA widget                                               |
| `DEMO_SEED_ALLOW`                   | `false`                       | Guards `scripts/demo-seed.ts` against pointing at production |

### 26.4 Explicitly not changing

To restate the project constraints this plan respects: no rewrite of working auth, permissions, middleware, or schema logic; no route or folder renames; no new module; no UI redesign of existing pages; no automatic continuation of work past a phase; `npm run build` stays green; Prisma stays consistent; and reports are produced at each phase boundary.

---

## Appendix A — New file inventory

| Path                                   | Lines (est.) | Phase   |
| -------------------------------------- | ------------ | ------- |
| `lib/demo/constants.ts`                | 60           | 1       |
| `lib/demo/plans.ts`                    | 90           | 1       |
| `lib/demo/slug.ts`                     | 50           | 1       |
| `lib/demo/rate-limit.ts`               | 120          | 6       |
| `lib/demo/scope.ts`                    | 90           | 2       |
| `lib/demo/transition.ts`               | 120          | 2       |
| `lib/demo/events.ts`                   | 60           | 2       |
| `lib/demo/limits.ts`                   | 130          | 3       |
| `lib/demo/purge.ts`                    | 180          | 11      |
| `lib/demo/retention.ts`                | 80           | 11      |
| `lib/supabase/admin.ts`                | 20           | 1       |
| `services/demo/seed-runner.ts`         | 400          | 4       |
| `services/demo/seed-data.ts`           | 450          | 4       |
| `services/demo/prng.ts`                | 40           | 4       |
| `services/demo/personas.ts`            | 200          | 5       |
| `actions/demo-tenant.actions.ts`       | 300          | 6, 10   |
| `actions/demo-persona.actions.ts`      | 150          | 5, 8    |
| `app/(demo)/demo/page.tsx`             | 120          | 7       |
| `app/api/demo/status/[token]/route.ts` | 80           | 6       |
| `app/api/cron/demo-purge/route.ts`     | 150          | 6, 11   |
| `app/(dashboard)/demo/page.tsx`        | 150          | 10      |
| `components/demo/*` (10 files)         | 900          | 7-10    |
| `scripts/demo-verify.ts`               | 250          | 1, 4, 5 |
| `scripts/seed-plans.ts`                | 120          | 1, 3    |
| `scripts/demo-seed.ts`                 | 60           | 4       |
| `scripts/demo-metrics.ts`              | 100          | 11      |
| Tests                                  | 500          | 1-6     |

Roughly 4,700 new lines, of which about 40% is tests.

## Appendix B — Persona identity map

| Persona | `Profile.role` | Linked entity                    | Portal            | Resolved by  |
| ------- | -------------- | -------------------------------- | ----------------- | ------------ |
| Admin   | `SCHOOL_ADMIN` | none required                    | `/dashboard`      | `Profile.id` |
| Teacher | `TEACHER`      | `Teacher.profileId`              | `/portal/teacher` | `Profile.id` |
| Student | `STUDENT`      | `Student.email`                  | `/portal/student` | email match  |
| Parent  | `PARENT`       | `Parent.email` + `StudentParent` | `/portal/parent`  | email match  |

The asymmetry in the last column is the reason §11.5 exists: two of four personas are resolved by email because `Student` has no `profileId` and `Parent.profileId` is optional.

## Appendix C — Verification commands

```bash
npm run typecheck          # must be clean at every phase boundary
npm run lint               # must be clean
npm run build              # includes prisma generate
npm test                   # after Phase 1
npm run db:push            # non-production first
npx tsx --env-file=.env scripts/seed-plans.ts
npx tsx --env-file=.env scripts/demo-verify.ts
npx tsx --env-file=.env scripts/demo-seed.ts --slug <slug>   # requires DEMO_SEED_ALLOW
npx tsx --env-file=.env scripts/demo-metrics.ts
```

---

_End of plan. Planning document only — no code in this plan has been implemented._
