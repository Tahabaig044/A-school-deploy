/**
 * The limit evaluator — pure logic, no database, no environment, no `server-only`.
 *
 * Splitting it from `enforce.ts` is deliberate. `lib/prisma.ts` builds a `pg` Pool at
 * import time and calls `new URL(process.env.DATABASE_URL || "")`, which throws when
 * the variable is unset — so anything importing it cannot be unit tested. The rules
 * below are the part worth proving, so they live in a module that can be.
 *
 * The three rules that matter most:
 *
 * 1. `-1` is the only value that means unlimited. `null` is never unlimited — an
 *    operator who clears a limit has disabled it, and treating that as "no cap"
 *    would silently turn a deliberate cap into an open door.
 * 2. An absent `PlanLimit` row is not a denial. A missing configuration row must
 *    never be the reason a user cannot do their job.
 * 3. Denials are returned, not thrown. Callers are UI-adjacent and need to render a
 *    message, not unwind a stack.
 */

/** A `plan_limits` row, as read from the database. */
export interface LimitRule {
  key: string
  metric: string
  limitValue: number
  period: string
  isEnabled: boolean
}

/** The count a rule is being measured against, plus any already-known usage. */
export interface LimitUsage {
  metric: string
  /** How many exist now, within the rule's period. */
  current: number
  /** How many the caller wants to add. Defaults to 0 for pure checks. */
  incoming?: number
}

export const DEMO_LIMIT_REACHED = "DEMO_LIMIT_REACHED" as const

export type LimitDecision =
  | {
      allowed: true
      metric: string
      /** `null` when there is no cap. Never `UNLIMITED`. */
      limit: number | null
      /** What the count will be after the request. */
      projected: number
      /** `null` when there is no cap. Negative would mean over, which cannot happen here. */
      remaining: number | null
      period: string | null
      /** False when nothing was actually checked, so the UI does not imply a cap. */
      enforced: boolean
    }
  | {
      allowed: false
      code: typeof DEMO_LIMIT_REACHED
      metric: string
      limit: number
      current: number
      period: string
    }

const isUnlimited = (limitValue: number): boolean => limitValue === -1

/**
 * Evaluates one metric.
 *
 * A rule is only enforced when it exists, is enabled, and holds a real cap. Anything
 * else allows the action, and reports `enforced: false` so the caller can tell the
 * difference between "no cap" and "you're at the cap".
 */
export function evaluateLimit(rule: LimitRule | undefined, usage: LimitUsage): LimitDecision {
  const incoming = usage.incoming ?? 0
  const projected = usage.current + incoming

  const ruleMissing = rule === undefined
  const ruleDisabled = rule !== undefined && !rule.isEnabled
  const ruleUnlimited = rule !== undefined && isUnlimited(rule.limitValue)

  if (ruleMissing || ruleDisabled || ruleUnlimited) {
    return {
      allowed: true,
      metric: usage.metric,
      limit: null,
      projected,
      remaining: null,
      period: rule?.period ?? null,
      enforced: false,
    }
  }

  const remaining = rule.limitValue - projected

  // At the limit is allowed; the limit is a cap on the resulting total, not a
  // precondition. Denying at exactly `limit` would make "max 60" mean 59.
  if (projected <= rule.limitValue) {
    return {
      allowed: true,
      metric: usage.metric,
      limit: rule.limitValue,
      projected,
      remaining,
      period: rule.period,
      enforced: true,
    }
  }

  return {
    allowed: false,
    code: DEMO_LIMIT_REACHED,
    metric: usage.metric,
    limit: rule.limitValue,
    current: projected,
    period: rule.period,
  }
}

/**
 * Evaluates a set of usages against a rule set.
 *
 * Rules are indexed by metric first, so this stays linear in the number of checks
 * rather than rescanning the plan for each one.
 */
export function evaluateAll(
  rules: readonly LimitRule[],
  usages: readonly LimitUsage[],
): LimitDecision[] {
  const byMetric = new Map<string, LimitRule>()

  for (const rule of rules) byMetric.set(rule.metric, rule)

  return usages.map((usage) => evaluateLimit(byMetric.get(usage.metric), usage))
}

/**
 * The first denial, or `null` if every check passed.
 *
 * Returns the denial rather than a boolean so the caller can render the metric and
 * the cap without re-deriving them.
 */
export function firstDenial(decisions: readonly LimitDecision[]): LimitDecision | null {
  for (const decision of decisions) {
    if (!decision.allowed) return decision
  }
  return null
}

export type LimitNotice = {
  metric: string
  limit: number
  period: string
  current: number
  remaining: number
  /** True once usage has reached the cap, so the UI can escalate the wording. */
  atLimit: boolean
}

/**
 * Builds the "you are running low" list for the demo banner.
 *
 * Only enforced, non-unlimited metrics appear: a row with no cap should never make
 * the UI claim the tenant is close to a limit it does not have. Metrics that are
 * already over are included so the banner can say so honestly.
 */
export function buildLimitNotices(
  rules: readonly LimitRule[],
  usages: readonly LimitUsage[],
): LimitNotice[] {
  const usageByMetric = new Map(usages.map((usage) => [usage.metric, usage]))

  const notices: LimitNotice[] = []

  for (const rule of rules) {
    if (!rule.isEnabled || isUnlimited(rule.limitValue)) continue

    const usage = usageByMetric.get(rule.metric)
    if (!usage) continue

    const current = usage.current
    const remaining = rule.limitValue - current

    notices.push({
      metric: rule.metric,
      limit: rule.limitValue,
      period: rule.period,
      current,
      remaining,
      atLimit: current >= rule.limitValue,
    })
  }

  return notices.sort((a, b) => a.remaining - b.remaining)
}

/**
 * Start of the current day in a fixed UTC offset, as a `Date`.
 *
 * `PER_DAY` limits need a window boundary, and "start of day" is not the same instant
 * everywhere. The offset is passed in rather than read from the environment so this
 * stays pure and the school can be pinned to its own timezone. The default matches
 * the demo's fictional location, which keeps seeded data self-consistent.
 */
export const DEFAULT_DEMO_UTC_OFFSET_MINUTES = 300 // UTC+05:00

export function startOfDay(
  now: Date,
  offsetMinutes: number = DEFAULT_DEMO_UTC_OFFSET_MINUTES,
): Date {
  // Shift into local wall-clock, read the calendar date off that, build UTC midnight
  // for it, then shift back. Reading the date off the shifted value and returning
  // `Date.UTC(...)` directly would be local midnight expressed as a UTC instant —
  // five hours late, which would let rows just before midnight escape the daily cap.
  const shifted = new Date(now.getTime() + offsetMinutes * 60_000)
  const localMidnightAsUtc = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
  )

  return new Date(localMidnightAsUtc - offsetMinutes * 60_000)
}

/** True when `instant` falls inside the day window containing `now`. */
export function isWithinDay(
  instant: Date,
  now: Date,
  offsetMinutes: number = DEFAULT_DEMO_UTC_OFFSET_MINUTES,
): boolean {
  const start = startOfDay(now, offsetMinutes).getTime()
  return instant.getTime() >= start
}

/**
 * The audit metadata for a `LIMIT_BLOCKED` event.
 *
 * Deliberately only the metric and the cap. Counts, tenant ids, and profile ids
 * already live in their own columns, and copying them into free-form JSON is how
 * audit rows end up leaking into places they should not be.
 */
export function limitBlockedMetadata(decision: Extract<LimitDecision, { allowed: false }>): {
  metric: string
  limit: number
} {
  return { metric: decision.metric, limit: decision.limit }
}
