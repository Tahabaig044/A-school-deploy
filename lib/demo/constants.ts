/**
 * Shared constants for the demo / trial subsystem.
 *
 * Enum values are mirrored as string unions so that client components can
 * import them without pulling in the Prisma client. The Prisma-generated enums
 * remain the source of truth; these must be kept in sync with `prisma/schema.prisma`.
 */

export const DEMO_STATUS = {
  REQUESTED: "REQUESTED",
  PROVISIONING: "PROVISIONING",
  SEEDING: "SEEDING",
  READY: "READY",
  EXPIRED: "EXPIRED",
  REVOKED: "REVOKED",
  PURGED: "PURGED",
  FAILED: "FAILED",
} as const

export type DemoStatus = (typeof DEMO_STATUS)[keyof typeof DEMO_STATUS]

export const DEMO_SEED_STATUS = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  SKIPPED: "SKIPPED",
} as const

export type DemoSeedStatus = (typeof DEMO_SEED_STATUS)[keyof typeof DEMO_SEED_STATUS]

export const DEMO_PERSONA_TYPE = {
  ADMIN: "ADMIN",
  TEACHER: "TEACHER",
  STUDENT: "STUDENT",
  PARENT: "PARENT",
} as const

export type DemoPersonaType = (typeof DEMO_PERSONA_TYPE)[keyof typeof DEMO_PERSONA_TYPE]

/**
 * The one status with no outgoing transition. A purged tenant is gone; the row is
 * later deleted outright once its 30-day history window closes.
 */
export const FINAL_DEMO_STATUS = DEMO_STATUS.PURGED

/**
 * Statuses that are finished and can never be revived. A tenant in one of these
 * states can still be handed to the purge path (`-> PURGED`) and nothing else.
 *
 * `FAILED` is here rather than in the terminal set because a failed tenant still
 * has to be auto-purged. `REVOKED` is here because an operator can revoke and an
 * operator-initiated purge may follow.
 */
export const DEAD_DEMO_STATUSES: readonly DemoStatus[] = [
  DEMO_STATUS.FAILED,
  DEMO_STATUS.REVOKED,
  DEMO_STATUS.PURGED,
] as const

/**
 * Statuses whose only remaining legal transition is to `PURGED`. Everything else
 * is refused, which is what stops a revoked or failed tenant from being revived.
 */
export const PURGE_ONLY_DEMO_STATUSES: readonly DemoStatus[] = [
  DEMO_STATUS.FAILED,
  DEMO_STATUS.REVOKED,
] as const

/** Statuses that still hold a usable tenant (i.e. counted against the circuit breaker). */
export const ACTIVE_DEMO_STATUSES: readonly DemoStatus[] = [
  DEMO_STATUS.REQUESTED,
  DEMO_STATUS.PROVISIONING,
  DEMO_STATUS.SEEDING,
  DEMO_STATUS.READY,
] as const

/** Statuses that count as "the tenant exists" when purging. */
export const PURGEABLE_DEMO_STATUSES: readonly DemoStatus[] = [
  DEMO_STATUS.REQUESTED,
  DEMO_STATUS.PROVISIONING,
  DEMO_STATUS.SEEDING,
  DEMO_STATUS.READY,
  DEMO_STATUS.EXPIRED,
  DEMO_STATUS.FAILED,
] as const

/**
 * Legal transitions of the demo lifecycle state machine.
 * Anything not listed here must be rejected by `transitionTo()`.
 */
export const DEMO_TRANSITIONS: Readonly<Record<DemoStatus, readonly DemoStatus[]>> = {
  REQUESTED: [DEMO_STATUS.PROVISIONING, DEMO_STATUS.FAILED, DEMO_STATUS.REVOKED],
  PROVISIONING: [DEMO_STATUS.SEEDING, DEMO_STATUS.READY, DEMO_STATUS.FAILED, DEMO_STATUS.REVOKED],
  SEEDING: [DEMO_STATUS.READY, DEMO_STATUS.FAILED, DEMO_STATUS.EXPIRED, DEMO_STATUS.REVOKED],
  READY: [DEMO_STATUS.EXPIRED, DEMO_STATUS.REVOKED],
  EXPIRED: [DEMO_STATUS.PURGED, DEMO_STATUS.REVOKED],
  REVOKED: [DEMO_STATUS.PURGED],
  PURGED: [],
  FAILED: [DEMO_STATUS.PURGED],
} as const

/**
 * Statuses a signed-in user may reach product pages from.
 * Anything else renders the "demo ended" screen instead.
 */
export const USABLE_DEMO_STATUSES: readonly DemoStatus[] = [DEMO_STATUS.READY] as const

/**
 * The reserved TLD for every demo identity (RFC 2606). Guaranteed undeliverable,
 * so a leaked demo credential can never reach a real inbox or a real person.
 */
export const DEMO_EMAIL_DOMAIN = "demo.invalid"

/** Optional contact email collected on the public form. Never used for sign-in. */
export const DEMO_CONTACT_EMAIL_DOMAIN = "example.com"

/** The shared, intentionally-public persona password. Read from env, never stored. */
export const DEMO_PERSONA_PASSWORD_ENV = "DEMO_PERSONA_PASSWORD"

/** Minimum length enforced for the shared persona password when the demo is enabled. */
export const DEMO_PERSONA_PASSWORD_MIN_LENGTH = 12

/** Persona email shape: `<type>+<slug>@demo.invalid`. */
export const DEMO_PERSONA_EMAIL_LOCAL = {
  ADMIN: "admin",
  TEACHER: "teacher",
  STUDENT: "student",
  PARENT: "parent",
} as const satisfies Record<DemoPersonaType, string>

/** Where each persona lands after a successful switch. Must respect `proxy.ts` role routing. */
export const DEMO_PERSONA_REDIRECT: Readonly<Record<DemoPersonaType, string>> = {
  ADMIN: "/dashboard",
  TEACHER: "/portal/teacher",
  STUDENT: "/portal/student",
  PARENT: "/portal/parent",
} as const

/** Fixed persona set shipped in v1. Order is the switcher's display order. */
export const DEMO_PERSONA_ORDER: readonly DemoPersonaType[] = [
  DEMO_PERSONA_TYPE.ADMIN,
  DEMO_PERSONA_TYPE.TEACHER,
  DEMO_PERSONA_TYPE.STUDENT,
  DEMO_PERSONA_TYPE.PARENT,
] as const

/** Metric keys used by `PlanLimit`. Stable identifiers; never rename in place. */
export const DEMO_LIMIT_METRIC = {
  STUDENT: "STUDENT",
  TEACHER: "TEACHER",
  STAFF: "STAFF",
  PARENT: "PARENT",
  BRANCH: "BRANCH",
  CLASS: "CLASS",
  SUBJECT: "SUBJECT",
  SCHOOL: "SCHOOL",
  FEE_INVOICE_PER_DAY: "FEE_INVOICE_PER_DAY",
  ATTENDANCE_SCAN_PER_DAY: "ATTENDANCE_SCAN_PER_DAY",
} as const

export type DemoLimitMetric = (typeof DEMO_LIMIT_METRIC)[keyof typeof DEMO_LIMIT_METRIC]

/** The only value that means "unlimited". `null` is never treated as unlimited. */
export const UNLIMITED = -1

export const DEMO_LIMIT_PERIOD = {
  TOTAL: "TOTAL",
  PER_DAY: "PER_DAY",
} as const

export type DemoLimitPeriod = (typeof DEMO_LIMIT_PERIOD)[keyof typeof DEMO_LIMIT_PERIOD]

/** Poll cadence for the provisioning status endpoint, in milliseconds. */
export const DEMO_POLL_INTERVAL_MS = 2000
export const DEMO_POLL_INTERVAL_MAX_MS = 10_000

/** How often `lastAccessedAt` may be written, per tenant. Guards against a write per navigation. */
export const DEMO_TOUCH_THROTTLE_MS = 15 * 60 * 1000

/** An in-flight seed older than this is considered abandoned and reaped. */
export const DEMO_STALE_SEED_MS = 10 * 60 * 1000

/** A tenant failing this many seed attempts is auto-purged. */
export const DEMO_MAX_SEED_ATTEMPTS = 2

/** Maximum characters retained in `DemoTenant.seedError`. */
export const DEMO_SEED_ERROR_MAX_LENGTH = 500
