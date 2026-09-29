/**
 * The demo lifecycle state machine — pure logic, no database, no environment.
 *
 * This module is intentionally free of `import "server-only"` and of any Prisma
 * import so it can be unit tested directly. The database-touching wrapper lives in
 * `transition.ts`; the two are kept separate so that the rules below are provable
 * without a running database.
 *
 * The single most important rule: a tenant that is not `READY` must never reach
 * product pages, and nothing may move a dead tenant back to life. Both are enforced
 * here rather than at each call site, because there will be many call sites.
 */

import {
  ACTIVE_DEMO_STATUSES,
  DEAD_DEMO_STATUSES,
  DEMO_MAX_SEED_ATTEMPTS,
  DEMO_SEED_ERROR_MAX_LENGTH,
  DEMO_SEED_STATUS,
  DEMO_STATUS,
  DEMO_TRANSITIONS,
  FINAL_DEMO_STATUS,
  PURGE_ONLY_DEMO_STATUSES,
  USABLE_DEMO_STATUSES,
  type DemoSeedStatus,
  type DemoStatus,
} from "./constants"

export class IllegalDemoTransitionError extends Error {
  readonly from: DemoStatus
  readonly to: DemoStatus

  constructor(from: DemoStatus, to: DemoStatus) {
    const allowed = DEMO_TRANSITIONS[from]
    super(
      `Illegal demo transition ${from} -> ${to}.` +
        (allowed.length > 0
          ? ` Allowed from ${from}: ${allowed.join(", ")}.`
          : ` ${from} is final.`),
    )
    this.name = "IllegalDemoTransitionError"
    this.from = from
    this.to = to
  }
}

/** True when `to` is reachable from `from`. */
export function canTransition(from: DemoStatus, to: DemoStatus): boolean {
  return DEMO_TRANSITIONS[from]?.includes(to) ?? false
}

/** Throws `IllegalDemoTransitionError` when the transition is not allowed. */
export function assertTransition(from: DemoStatus, to: DemoStatus): void {
  if (!canTransition(from, to)) throw new IllegalDemoTransitionError(from, to)
}

/**
 * True when a tenant in this status may render product pages.
 *
 * Only `READY` qualifies. `EXPIRED` is excluded on purpose: an expired tenant still
 * holds data, so the temptation is to treat it as "still fine, just read-only". It
 * must not be.
 */
export function isUsableStatus(status: DemoStatus): boolean {
  return USABLE_DEMO_STATUSES.includes(status)
}

/** True when a tenant in this status counts against the provisioning circuit breaker. */
export function isActiveStatus(status: DemoStatus): boolean {
  return ACTIVE_DEMO_STATUSES.includes(status)
}

/** True when the tenant is finished and can never be revived. */
export function isDeadStatus(status: DemoStatus): boolean {
  return DEAD_DEMO_STATUSES.includes(status)
}

/** True when nothing can happen to this tenant ever again. */
export function isFinalStatus(status: DemoStatus): boolean {
  return status === FINAL_DEMO_STATUS
}

/**
 * Whether a tenant that has been serving pages should be treated as expired.
 *
 * Called on the read path rather than by a job, so a tenant cannot serve data past
 * its `expiresAt` even if the cron never runs.
 */
export function isPastExpiry(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime()
}

/**
 * The status a tenant should be treated as, given its stored status and its clock.
 * A `READY` tenant past `expiresAt` is logically `EXPIRED` even before any job has
 * written that down.
 */
export function effectiveStatus(
  stored: DemoStatus,
  expiresAt: Date,
  now: Date = new Date(),
): DemoStatus {
  if (stored === DEMO_STATUS.READY && isPastExpiry(expiresAt, now)) return DEMO_STATUS.EXPIRED
  return stored
}

/**
 * The status the seed worker should move a tenant to, or `null` when the recorded
 * status is already correct. Keeps `seedStatus` and `status` from disagreeing.
 */
export function nextSeedStatus(
  current: DemoSeedStatus,
  outcome: "completed" | "failed" | "skipped",
): DemoSeedStatus | null {
  const target: DemoSeedStatus =
    outcome === "completed"
      ? DEMO_SEED_STATUS.COMPLETED
      : outcome === "failed"
        ? DEMO_SEED_STATUS.FAILED
        : DEMO_SEED_STATUS.SKIPPED

  return current === target ? null : target
}

/** Clamps `seedProgress` into 0..100. Guards against a worker reporting nonsense. */
export function clampProgress(value: number): number {
  // NaN specifically, so a broken worker reads as 0% rather than a corrupt column.
  // Infinities fall through and clamp normally.
  if (Number.isNaN(value)) return 0
  return Math.min(100, Math.max(0, Math.round(value)))
}

/** Progress must never move backwards, or a stalled worker looks like a reset. */
export function monotonicProgress(current: number, next: number): number {
  return Math.max(clampProgress(current), clampProgress(next))
}

/** Seeds `DemoTenant.seedError` and strips anything that looks like a secret. */
export function sanitizeSeedError(error: unknown): string | null {
  if (error === null || error === undefined) return null

  const raw =
    error instanceof Error
      ? (error.stack ?? error.message)
      : typeof error === "string"
        ? error
        : JSON.stringify(error)

  if (!raw) return null

  return (
    raw
      // Connection strings carry credentials.
      .replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted-connection-string]")
      // Service-role and anon keys, JWTs, and anything key-shaped.
      .replace(/\b(?:eyJ|sb_|sk_)[A-Za-z0-9._-]{8,}/g, "[redacted-secret]")
      // Explicit secret assignments. The optional quote is required for JSON
      // payloads (`"password":"x"`), which would otherwise slip straight through.
      .replace(/\b(password|secret|token|api[_-]?key)["']?\s*[=:]\s*[^\s,}]*/gi, "$1=[redacted]")
      .slice(0, DEMO_SEED_ERROR_MAX_LENGTH)
  )
}

/** True when a failed tenant has used up its retries and must be auto-purged. */
export function shouldAutoPurge(attempts: number, status: DemoStatus): boolean {
  if (isFinalStatus(status)) return false
  return attempts >= DEMO_MAX_SEED_ATTEMPTS
}

/** True when only a purge may move this tenant any further. */
export function isPurgeOnly(status: DemoStatus): boolean {
  return PURGE_ONLY_DEMO_STATUSES.includes(status)
}
