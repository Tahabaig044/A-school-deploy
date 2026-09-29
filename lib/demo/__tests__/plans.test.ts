import { describe, expect, it } from "vitest"

import { DEMO_LIMIT_METRIC, DEMO_LIMIT_PERIOD, UNLIMITED } from "../constants"
import {
  DRIFT_FIELDS,
  LIMIT_KEY,
  PLAN_CATALOG,
  PLAN_KEY,
  findLimitDrift,
  getPlanDefinition,
  type PlanLimitDefinition,
} from "../plans"

const stored = (overrides: Partial<PlanLimitDefinition> = {}) => ({
  key: LIMIT_KEY.STUDENT_MAX,
  metric: DEMO_LIMIT_METRIC.STUDENT,
  limitValue: 60,
  period: DEMO_LIMIT_PERIOD.TOTAL,
  isEnabled: true,
  ...overrides,
})

describe("findLimitDrift", () => {
  it("reports nothing when the row matches the catalog", () => {
    expect(findLimitDrift(PLAN_KEY.DEMO, stored(), stored())).toEqual([])
  })

  it("reports a lowered operator limit, which is the case it exists for", () => {
    const catalog = stored({ limitValue: 60 })
    const inDatabase = stored({ limitValue: 5 })

    expect(findLimitDrift(PLAN_KEY.DEMO, catalog, inDatabase)).toEqual([
      {
        planKey: PLAN_KEY.DEMO,
        limitKey: LIMIT_KEY.STUDENT_MAX,
        field: "limitValue",
        catalog: 60,
        database: 5,
      },
    ])
  })

  it("reports a raised limit too", () => {
    const drifts = findLimitDrift(
      PLAN_KEY.DEMO,
      stored({ limitValue: 60 }),
      stored({ limitValue: 999 }),
    )
    expect(drifts.map((d) => d.field)).toEqual(["limitValue"])
    expect(drifts[0].database).toBe(999)
  })

  it("reports a changed metric", () => {
    const drifts = findLimitDrift(
      PLAN_KEY.DEMO,
      stored({ metric: DEMO_LIMIT_METRIC.STUDENT }),
      stored({ metric: DEMO_LIMIT_METRIC.TEACHER }),
    )
    expect(drifts).toHaveLength(1)
    expect(drifts[0].field).toBe("metric")
  })

  it("reports a changed period", () => {
    const drifts = findLimitDrift(
      PLAN_KEY.DEMO,
      stored({ period: DEMO_LIMIT_PERIOD.TOTAL }),
      stored({ period: DEMO_LIMIT_PERIOD.PER_DAY }),
    )
    expect(drifts[0].field).toBe("period")
  })

  it("reports a disabled limit", () => {
    const drifts = findLimitDrift(PLAN_KEY.DEMO, stored(), stored({ isEnabled: false }))
    expect(drifts[0].field).toBe("isEnabled")
  })

  it("reports every differing field at once", () => {
    const drifts = findLimitDrift(
      PLAN_KEY.DEMO,
      stored(),
      stored({
        limitValue: 1,
        period: DEMO_LIMIT_PERIOD.PER_DAY,
        isEnabled: false,
        metric: DEMO_LIMIT_METRIC.SUBJECT,
      }),
    )

    expect(drifts.map((d) => d.field).sort()).toEqual([
      "isEnabled",
      "limitValue",
      "metric",
      "period",
    ])
  })

  it("detects exactly the fields the seeder overwrites", () => {
    // If a field were added to the --force update but not to DRIFT_FIELDS, the
    // seeder would overwrite a value it never reported. This is the guard.
    expect([...DRIFT_FIELDS].sort()).toEqual(["isEnabled", "limitValue", "metric", "period"])
  })

  it("reports an unlimited limit replaced by a numeric one", () => {
    // -1 and 500 are genuinely different values, so this is drift and must be
    // surfaced — quietly accepting it would hide a cap that had disappeared.
    const drifts = findLimitDrift(
      PLAN_KEY.INTERNAL,
      stored({ limitValue: UNLIMITED }),
      stored({ limitValue: 500 }),
    )
    expect(drifts).toHaveLength(1)
    expect(drifts[0].field).toBe("limitValue")
    expect(drifts[0].catalog).toBe(UNLIMITED)
    expect(drifts[0].database).toBe(500)
  })

  it("ignores a very large cap when both sides agree", () => {
    const huge = stored({ limitValue: 1_000_000_000 })
    expect(findLimitDrift(PLAN_KEY.TRIAL_PRO, huge, huge)).toEqual([])
  })

  it("carries the plan key through for the report", () => {
    const drifts = findLimitDrift(PLAN_KEY.TRIAL_PRO, stored(), stored({ limitValue: 0 }))
    expect(drifts[0].planKey).toBe(PLAN_KEY.TRIAL_PRO)
  })

  it("finds no drift anywhere in the catalog against itself", () => {
    for (const plan of PLAN_CATALOG) {
      for (const limit of plan.limits) {
        expect(findLimitDrift(plan.key, limit, limit), `${plan.key}.${limit.key}`).toEqual([])
      }
    }
  })
})

describe("catalog shape", () => {
  it("exposes the four planned plans", () => {
    expect(PLAN_CATALOG.map((p) => p.key)).toEqual([
      PLAN_KEY.DEMO,
      PLAN_KEY.TRIAL_BASIC,
      PLAN_KEY.TRIAL_PRO,
      PLAN_KEY.INTERNAL,
    ])
  })

  it("keeps DEMO public and the rest off the public form", () => {
    const demo = getPlanDefinition(PLAN_KEY.DEMO)!
    expect(demo.isPublic).toBe(true)
    expect(getPlanDefinition(PLAN_KEY.TRIAL_PRO)!.isPublic).toBe(false)
    expect(getPlanDefinition(PLAN_KEY.INTERNAL)!.isPublic).toBe(false)
  })

  it("keeps every plan active and ordered", () => {
    const orders = PLAN_CATALOG.map((p) => p.sortOrder)
    expect([...orders].sort((a, b) => a - b)).toEqual(orders)
    for (const plan of PLAN_CATALOG) expect(plan.isActive).toBe(true)
  })

  it("retains for less than it runs, so data is not purged while still served", () => {
    for (const plan of PLAN_CATALOG) {
      expect(plan.retentionDays, plan.key).toBeLessThanOrEqual(plan.durationDays)
    }
  })

  it("returns undefined for an unknown key", () => {
    expect(getPlanDefinition("NOPE")).toBeUndefined()
  })
})
