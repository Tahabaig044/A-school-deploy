/**
 * The plan catalog.
 *
 * This file is the *seed payload* for `Plan` and `PlanLimit`, not the enforcement
 * path. `scripts/seed-plans.ts` upserts from here; `lib/demo/limits.ts` reads the
 * resulting rows at request time. A limit can therefore be changed in the database
 * without a deploy and without touching this file.
 *
 * The one rule this file must never break: an operator who deliberately lowers a
 * `limit_value` must not have it silently widened by re-running the seed script.
 * That is why `seed-plans.ts` reports drift instead of overwriting (see its docs).
 */

import { DEMO_LIMIT_METRIC, DEMO_LIMIT_PERIOD, UNLIMITED } from "./constants"

/** Stable plan keys. Referenced by `DEMO_DEFAULT_PLAN_KEY` and by the public form. */
export const PLAN_KEY = {
  DEMO: "DEMO",
  TRIAL_BASIC: "TRIAL_BASIC",
  TRIAL_PRO: "TRIAL_PRO",
  INTERNAL: "INTERNAL",
} as const

export type PlanKey = (typeof PLAN_KEY)[keyof typeof PLAN_KEY]

/** Stable limit keys. Never rename a key in place — the unique index is `[planId, key]`. */
export const LIMIT_KEY = {
  STUDENT_MAX: "STUDENT_MAX",
  TEACHER_MAX: "TEACHER_MAX",
  STAFF_MAX: "STAFF_MAX",
  PARENT_MAX: "PARENT_MAX",
  BRANCH_MAX: "BRANCH_MAX",
  CLASS_MAX: "CLASS_MAX",
  SUBJECT_MAX: "SUBJECT_MAX",
  SCHOOL_MAX: "SCHOOL_MAX",
  FEE_INVOICE_PER_DAY: "FEE_INVOICE_PER_DAY",
  ATTENDANCE_SCAN_PER_DAY: "ATTENDANCE_SCAN_PER_DAY",
} as const

export type LimitKey = (typeof LIMIT_KEY)[keyof typeof LIMIT_KEY]

export interface PlanLimitDefinition {
  key: LimitKey
  metric: string
  limitValue: number
  period: string
  isEnabled: boolean
}

export interface PlanDefinition {
  key: PlanKey
  name: string
  description: string
  durationDays: number
  retentionDays: number
  isPublic: boolean
  isActive: boolean
  sortOrder: number
  limits: PlanLimitDefinition[]
}

const unlimited = (key: LimitKey, metric: string, period: string): PlanLimitDefinition => ({
  key,
  metric,
  limitValue: UNLIMITED,
  period,
  isEnabled: true,
})

/**
 * `DEMO` is deliberately small and short-lived. It is the plan behind the public
 * `/demo` form, so its caps are the real abuse-control surface.
 */
const demoPlan: PlanDefinition = {
  key: PLAN_KEY.DEMO,
  name: "Demo",
  description: "Fictional school, 4 personas, read-mostly. Resets automatically.",
  durationDays: 3,
  retentionDays: 2,
  isPublic: true,
  isActive: true,
  sortOrder: 10,
  limits: [
    {
      key: LIMIT_KEY.STUDENT_MAX,
      metric: DEMO_LIMIT_METRIC.STUDENT,
      limitValue: 60,
      period: DEMO_LIMIT_PERIOD.TOTAL,
      isEnabled: true,
    },
    {
      key: LIMIT_KEY.TEACHER_MAX,
      metric: DEMO_LIMIT_METRIC.TEACHER,
      limitValue: 8,
      period: DEMO_LIMIT_PERIOD.TOTAL,
      isEnabled: true,
    },
    {
      key: LIMIT_KEY.STAFF_MAX,
      metric: DEMO_LIMIT_METRIC.STAFF,
      limitValue: 12,
      period: DEMO_LIMIT_PERIOD.TOTAL,
      isEnabled: true,
    },
    {
      key: LIMIT_KEY.PARENT_MAX,
      metric: DEMO_LIMIT_METRIC.PARENT,
      limitValue: 60,
      period: DEMO_LIMIT_PERIOD.TOTAL,
      isEnabled: true,
    },
    {
      key: LIMIT_KEY.BRANCH_MAX,
      metric: DEMO_LIMIT_METRIC.BRANCH,
      limitValue: 1,
      period: DEMO_LIMIT_PERIOD.TOTAL,
      isEnabled: true,
    },
    {
      key: LIMIT_KEY.CLASS_MAX,
      metric: DEMO_LIMIT_METRIC.CLASS,
      limitValue: 20,
      period: DEMO_LIMIT_PERIOD.TOTAL,
      isEnabled: true,
    },
    {
      key: LIMIT_KEY.SUBJECT_MAX,
      metric: DEMO_LIMIT_METRIC.SUBJECT,
      limitValue: 12,
      period: DEMO_LIMIT_PERIOD.TOTAL,
      isEnabled: true,
    },
    {
      key: LIMIT_KEY.FEE_INVOICE_PER_DAY,
      metric: DEMO_LIMIT_METRIC.FEE_INVOICE_PER_DAY,
      limitValue: 5,
      period: DEMO_LIMIT_PERIOD.PER_DAY,
      isEnabled: true,
    },
    {
      key: LIMIT_KEY.ATTENDANCE_SCAN_PER_DAY,
      metric: DEMO_LIMIT_METRIC.ATTENDANCE_SCAN_PER_DAY,
      limitValue: 50,
      period: DEMO_LIMIT_PERIOD.PER_DAY,
      isEnabled: true,
    },
  ],
}

/** Self-serve trial. Full CRUD within these caps. */
const trialBasicPlan: PlanDefinition = {
  key: PLAN_KEY.TRIAL_BASIC,
  name: "Trial (Basic)",
  description: "Full access for a single campus, 14 days.",
  durationDays: 14,
  retentionDays: 14,
  isPublic: true,
  isActive: true,
  sortOrder: 20,
  limits: [
    {
      key: LIMIT_KEY.STUDENT_MAX,
      metric: DEMO_LIMIT_METRIC.STUDENT,
      limitValue: 200,
      period: DEMO_LIMIT_PERIOD.TOTAL,
      isEnabled: true,
    },
    {
      key: LIMIT_KEY.TEACHER_MAX,
      metric: DEMO_LIMIT_METRIC.TEACHER,
      limitValue: 25,
      period: DEMO_LIMIT_PERIOD.TOTAL,
      isEnabled: true,
    },
    {
      key: LIMIT_KEY.STAFF_MAX,
      metric: DEMO_LIMIT_METRIC.STAFF,
      limitValue: 30,
      period: DEMO_LIMIT_PERIOD.TOTAL,
      isEnabled: true,
    },
    {
      key: LIMIT_KEY.PARENT_MAX,
      metric: DEMO_LIMIT_METRIC.PARENT,
      limitValue: 200,
      period: DEMO_LIMIT_PERIOD.TOTAL,
      isEnabled: true,
    },
    {
      key: LIMIT_KEY.BRANCH_MAX,
      metric: DEMO_LIMIT_METRIC.BRANCH,
      limitValue: 2,
      period: DEMO_LIMIT_PERIOD.TOTAL,
      isEnabled: true,
    },
    {
      key: LIMIT_KEY.CLASS_MAX,
      metric: DEMO_LIMIT_METRIC.CLASS,
      limitValue: 50,
      period: DEMO_LIMIT_PERIOD.TOTAL,
      isEnabled: true,
    },
    {
      key: LIMIT_KEY.SUBJECT_MAX,
      metric: DEMO_LIMIT_METRIC.SUBJECT,
      limitValue: 30,
      period: DEMO_LIMIT_PERIOD.TOTAL,
      isEnabled: true,
    },
    {
      key: LIMIT_KEY.FEE_INVOICE_PER_DAY,
      metric: DEMO_LIMIT_METRIC.FEE_INVOICE_PER_DAY,
      limitValue: 50,
      period: DEMO_LIMIT_PERIOD.PER_DAY,
      isEnabled: true,
    },
    {
      key: LIMIT_KEY.ATTENDANCE_SCAN_PER_DAY,
      metric: DEMO_LIMIT_METRIC.ATTENDANCE_SCAN_PER_DAY,
      limitValue: 500,
      period: DEMO_LIMIT_PERIOD.PER_DAY,
      isEnabled: true,
    },
  ],
}

/**
 * Present in the schema from day one but never publicly selectable: it would
 * require per-user passwords rather than the shared demo password.
 */
const trialProPlan: PlanDefinition = {
  key: PLAN_KEY.TRIAL_PRO,
  name: "Trial (Pro)",
  description: "Multi-campus trial, 30 days. Provisioned by sales.",
  durationDays: 30,
  retentionDays: 30,
  isPublic: false,
  isActive: true,
  sortOrder: 30,
  limits: [
    {
      key: LIMIT_KEY.STUDENT_MAX,
      metric: DEMO_LIMIT_METRIC.STUDENT,
      limitValue: 1000,
      period: DEMO_LIMIT_PERIOD.TOTAL,
      isEnabled: true,
    },
    {
      key: LIMIT_KEY.TEACHER_MAX,
      metric: DEMO_LIMIT_METRIC.TEACHER,
      limitValue: 120,
      period: DEMO_LIMIT_PERIOD.TOTAL,
      isEnabled: true,
    },
    {
      key: LIMIT_KEY.STAFF_MAX,
      metric: DEMO_LIMIT_METRIC.STAFF,
      limitValue: 150,
      period: DEMO_LIMIT_PERIOD.TOTAL,
      isEnabled: true,
    },
    {
      key: LIMIT_KEY.PARENT_MAX,
      metric: DEMO_LIMIT_METRIC.PARENT,
      limitValue: 1000,
      period: DEMO_LIMIT_PERIOD.TOTAL,
      isEnabled: true,
    },
    {
      key: LIMIT_KEY.BRANCH_MAX,
      metric: DEMO_LIMIT_METRIC.BRANCH,
      limitValue: 10,
      period: DEMO_LIMIT_PERIOD.TOTAL,
      isEnabled: true,
    },
    {
      key: LIMIT_KEY.CLASS_MAX,
      metric: DEMO_LIMIT_METRIC.CLASS,
      limitValue: 200,
      period: DEMO_LIMIT_PERIOD.TOTAL,
      isEnabled: true,
    },
    {
      key: LIMIT_KEY.SUBJECT_MAX,
      metric: DEMO_LIMIT_METRIC.SUBJECT,
      limitValue: 60,
      period: DEMO_LIMIT_PERIOD.TOTAL,
      isEnabled: true,
    },
    {
      key: LIMIT_KEY.FEE_INVOICE_PER_DAY,
      metric: DEMO_LIMIT_METRIC.FEE_INVOICE_PER_DAY,
      limitValue: 500,
      period: DEMO_LIMIT_PERIOD.PER_DAY,
      isEnabled: true,
    },
    {
      key: LIMIT_KEY.ATTENDANCE_SCAN_PER_DAY,
      metric: DEMO_LIMIT_METRIC.ATTENDANCE_SCAN_PER_DAY,
      limitValue: 5000,
      period: DEMO_LIMIT_PERIOD.PER_DAY,
      isEnabled: true,
    },
  ],
}

/** Internal / QA tenants. Unlimited, long-lived, never publicly selectable. */
const internalPlan: PlanDefinition = {
  key: PLAN_KEY.INTERNAL,
  name: "Internal",
  description: "Unlimited. For QA and staff only.",
  durationDays: 365,
  retentionDays: 30,
  isPublic: false,
  isActive: true,
  sortOrder: 90,
  limits: [
    unlimited(LIMIT_KEY.STUDENT_MAX, DEMO_LIMIT_METRIC.STUDENT, DEMO_LIMIT_PERIOD.TOTAL),
    unlimited(LIMIT_KEY.TEACHER_MAX, DEMO_LIMIT_METRIC.TEACHER, DEMO_LIMIT_PERIOD.TOTAL),
    unlimited(LIMIT_KEY.STAFF_MAX, DEMO_LIMIT_METRIC.STAFF, DEMO_LIMIT_PERIOD.TOTAL),
    unlimited(LIMIT_KEY.PARENT_MAX, DEMO_LIMIT_METRIC.PARENT, DEMO_LIMIT_PERIOD.TOTAL),
    unlimited(LIMIT_KEY.BRANCH_MAX, DEMO_LIMIT_METRIC.BRANCH, DEMO_LIMIT_PERIOD.TOTAL),
    unlimited(LIMIT_KEY.CLASS_MAX, DEMO_LIMIT_METRIC.CLASS, DEMO_LIMIT_PERIOD.TOTAL),
    unlimited(LIMIT_KEY.SUBJECT_MAX, DEMO_LIMIT_METRIC.SUBJECT, DEMO_LIMIT_PERIOD.TOTAL),
    unlimited(
      LIMIT_KEY.FEE_INVOICE_PER_DAY,
      DEMO_LIMIT_METRIC.FEE_INVOICE_PER_DAY,
      DEMO_LIMIT_PERIOD.PER_DAY,
    ),
    unlimited(
      LIMIT_KEY.ATTENDANCE_SCAN_PER_DAY,
      DEMO_LIMIT_METRIC.ATTENDANCE_SCAN_PER_DAY,
      DEMO_LIMIT_PERIOD.PER_DAY,
    ),
  ],
}

/** Ordered by `sortOrder`, which is the public form's display order. */
export const PLAN_CATALOG: readonly PlanDefinition[] = [
  demoPlan,
  trialBasicPlan,
  trialProPlan,
  internalPlan,
] as const

/** Plans the public `/demo` form may offer. `isPublic` in the DB is authoritative. */
export const PUBLIC_PLAN_KEYS: readonly PlanKey[] = PLAN_CATALOG.filter((p) => p.isPublic).map(
  (p) => p.key,
)

export function getPlanDefinition(key: string): PlanDefinition | undefined {
  return PLAN_CATALOG.find((plan) => plan.key === key)
}

/** The fields of a limit that the seeder treats as drift-relevant. */
export const DRIFT_FIELDS = ["metric", "limitValue", "period", "isEnabled"] as const

export type DriftField = (typeof DRIFT_FIELDS)[number]

export interface PlanLimitDrift {
  planKey: string
  limitKey: string
  field: DriftField
  catalog: string | number | boolean
  database: string | number | boolean
}

/**
 * Compares one stored limit against the catalog.
 *
 * Extracted from `scripts/seed-plans.ts` so the rule can be unit tested: the script
 * calls `main()` at import time, so nothing in it is reachable from a test.
 *
 * This function is the reason an operator's tuning survives a re-seed. It reports
 * differences rather than resolving them — the script only overwrites when given
 * `--force`, so lowering `limit_value` in the database is never silently undone.
 */
export function findLimitDrift(
  planKey: string,
  catalog: PlanLimitDefinition,
  current: { metric: string; limitValue: number; period: string; isEnabled: boolean },
): PlanLimitDrift[] {
  const drifts: PlanLimitDrift[] = []

  for (const field of DRIFT_FIELDS) {
    if (current[field] === catalog[field]) continue

    drifts.push({
      planKey,
      limitKey: catalog.key,
      field,
      catalog: catalog[field],
      database: current[field],
    })
  }

  return drifts
}
