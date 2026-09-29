import { describe, expect, it } from "vitest"

import { DEMO_LIMIT_METRIC, DEMO_LIMIT_PERIOD, UNLIMITED } from "../constants"
import { LIMIT_KEY, PLAN_CATALOG, PLAN_KEY, getPlanDefinition } from "../plans"
import {
  DEFAULT_DEMO_UTC_OFFSET_MINUTES,
  DEMO_LIMIT_REACHED,
  buildLimitNotices,
  evaluateAll,
  evaluateLimit,
  firstDenial,
  isWithinDay,
  limitBlockedMetadata,
  startOfDay,
  type LimitRule,
} from "../limits"

const rule = (overrides: Partial<LimitRule> = {}): LimitRule => ({
  key: "STUDENT_MAX",
  metric: DEMO_LIMIT_METRIC.STUDENT,
  limitValue: 60,
  period: DEMO_LIMIT_PERIOD.TOTAL,
  isEnabled: true,
  ...overrides,
})

describe("evaluateLimit", () => {
  // ── At and over the limit ────────────────────────────────────────────────
  const belowAtOver: Array<[string, number, number, boolean]> = [
    ["under the limit", 0, 0, true],
    ["one under the limit", 59, 0, true],
    ["exactly at the limit", 60, 0, true],
    ["one over the limit", 61, 0, false],
    ["far over the limit", 500, 0, false],
    ["exactly at the limit, adding one", 59, 1, true],
    ["one below the limit, adding one", 60, 1, false],
    ["one below the limit, adding two", 59, 2, false],
  ]

  it.each(belowAtOver)("%s", (_label, current, incoming, allowed) => {
    const decision = evaluateLimit(rule(), {
      metric: DEMO_LIMIT_METRIC.STUDENT,
      current,
      incoming,
    })
    expect(decision.allowed).toBe(allowed)
  })

  it("allows exactly at the limit, because a cap is on the resulting total", () => {
    const decision = evaluateLimit(rule(), { metric: DEMO_LIMIT_METRIC.STUDENT, current: 60 })
    expect(decision.allowed).toBe(true)
    if (decision.allowed) {
      expect(decision.remaining).toBe(0)
      expect(decision.projected).toBe(60)
    }
  })

  it("denies the 61st student on the DEMO plan, per the acceptance criteria", () => {
    const demo = getPlanDefinition(PLAN_KEY.DEMO)!
    const studentRule = demo.limits.find((l) => l.key === LIMIT_KEY.STUDENT_MAX)!

    const decision = evaluateLimit(
      { ...studentRule },
      { metric: DEMO_LIMIT_METRIC.STUDENT, current: 61 },
    )

    expect(decision.allowed).toBe(false)
    if (!decision.allowed) {
      expect(decision.code).toBe(DEMO_LIMIT_REACHED)
      expect(decision.limit).toBe(60)
      expect(decision.current).toBe(61)
    }
  })

  // ── Unlimited ────────────────────────────────────────────────────────────
  it("allows everything on an unlimited rule and reports no cap", () => {
    const decision = evaluateLimit(rule({ limitValue: UNLIMITED }), {
      metric: DEMO_LIMIT_METRIC.STUDENT,
      current: 10_000_000,
    })

    expect(decision.allowed).toBe(true)
    if (decision.allowed) {
      expect(decision.limit).toBeNull()
      expect(decision.remaining).toBeNull()
      expect(decision.enforced).toBe(false)
    }
  })

  it("allows everything on the INTERNAL plan, per the acceptance criteria", () => {
    const internal = getPlanDefinition(PLAN_KEY.INTERNAL)!
    expect(internal.limits.length).toBeGreaterThan(0)

    for (const definition of internal.limits) {
      expect(definition.limitValue).toBe(UNLIMITED)

      const decision = evaluateLimit(
        { ...definition },
        { metric: definition.metric, current: 999_999 },
      )
      expect(decision.allowed).toBe(true)
    }
  })

  it("treats only -1 as unlimited", () => {
    // Every other negative and zero is a real number, not a sentinel.
    for (const limitValue of [0, -2, -100, 1]) {
      const decision = evaluateLimit(rule({ limitValue }), {
        metric: DEMO_LIMIT_METRIC.STUDENT,
        current: 1,
      })
      expect(decision.allowed, `limitValue ${limitValue}`).toBe(limitValue >= 1)
    }
  })

  it("never treats a missing limit value as unlimited", () => {
    // A null limit is not representable on the model (the column is non-nullable),
    // but the evaluator must still not read it as "no cap" if that ever changes.
    const decision = evaluateLimit(
      { ...rule(), limitValue: null as unknown as number },
      { metric: DEMO_LIMIT_METRIC.STUDENT, current: 61 },
    )
    expect(decision.allowed).toBe(false)
  })

  // ── Disabled and absent rules ────────────────────────────────────────────
  it("allows the action when the rule is disabled", () => {
    const decision = evaluateLimit(rule({ isEnabled: false }), {
      metric: DEMO_LIMIT_METRIC.STUDENT,
      current: 10_000,
    })
    expect(decision.allowed).toBe(true)
    if (decision.allowed) expect(decision.enforced).toBe(false)
  })

  it("allows the action when there is no rule row at all", () => {
    const decision = evaluateLimit(undefined, {
      metric: DEMO_LIMIT_METRIC.SUBJECT,
      current: 5_000,
    })
    expect(decision.allowed).toBe(true)
    if (decision.allowed) {
      expect(decision.enforced).toBe(false)
      expect(decision.limit).toBeNull()
      expect(decision.period).toBeNull()
    }
  })

  it("distinguishes 'at the cap' from 'no cap' via enforced", () => {
    const capped = evaluateLimit(rule(), { metric: DEMO_LIMIT_METRIC.STUDENT, current: 60 })
    const uncapped = evaluateLimit(undefined, { metric: DEMO_LIMIT_METRIC.STUDENT, current: 60 })

    expect(capped.allowed && capped.enforced).toBe(true)
    expect(uncapped.allowed && uncapped.enforced).toBe(false)
  })

  // ── Remaining / projected arithmetic ─────────────────────────────────────
  it("reports the correct remaining count below the cap", () => {
    const decision = evaluateLimit(rule({ limitValue: 60 }), {
      metric: DEMO_LIMIT_METRIC.STUDENT,
      current: 42,
    })
    if (decision.allowed) expect(decision.remaining).toBe(18)
  })

  it("reports remaining after the incoming amount is applied", () => {
    const decision = evaluateLimit(rule({ limitValue: 60 }), {
      metric: DEMO_LIMIT_METRIC.STUDENT,
      current: 42,
      incoming: 8,
    })
    if (decision.allowed) {
      expect(decision.projected).toBe(50)
      expect(decision.remaining).toBe(10)
    }
  })

  it("defaults incoming to zero", () => {
    const decision = evaluateLimit(rule(), { metric: DEMO_LIMIT_METRIC.STUDENT, current: 10 })
    if (decision.allowed) expect(decision.projected).toBe(10)
  })

  it("carries the period through on both outcomes", () => {
    const perDay = evaluateLimit(rule({ period: DEMO_LIMIT_PERIOD.PER_DAY, limitValue: 5 }), {
      metric: DEMO_LIMIT_METRIC.FEE_INVOICE_PER_DAY,
      current: 6,
    })
    expect(perDay.allowed).toBe(false)
    if (!perDay.allowed) expect(perDay.period).toBe(DEMO_LIMIT_PERIOD.PER_DAY)

    const within = evaluateLimit(rule({ period: DEMO_LIMIT_PERIOD.PER_DAY, limitValue: 5 }), {
      metric: DEMO_LIMIT_METRIC.FEE_INVOICE_PER_DAY,
      current: 5,
    })
    expect(within.allowed).toBe(true)
    if (within.allowed) expect(within.period).toBe(DEMO_LIMIT_PERIOD.PER_DAY)
  })

  it("reports the period of a disabled rule but does not enforce it", () => {
    const decision = evaluateLimit(rule({ isEnabled: false, period: DEMO_LIMIT_PERIOD.PER_DAY }), {
      metric: DEMO_LIMIT_METRIC.STUDENT,
      current: 1,
    })
    if (decision.allowed) expect(decision.period).toBe(DEMO_LIMIT_PERIOD.PER_DAY)
  })

  it("does not deny on a negative incoming count", () => {
    // Deleting a record should never be blocked by a creation limit.
    const decision = evaluateLimit(rule({ limitValue: 3 }), {
      metric: DEMO_LIMIT_METRIC.STUDENT,
      current: 3,
      incoming: -1,
    })
    expect(decision.allowed).toBe(true)
  })
})

describe("evaluateAll", () => {
  const rules = [
    rule({ key: LIMIT_KEY.STUDENT_MAX, metric: DEMO_LIMIT_METRIC.STUDENT, limitValue: 60 }),
    rule({ key: LIMIT_KEY.TEACHER_MAX, metric: DEMO_LIMIT_METRIC.TEACHER, limitValue: 8 }),
    rule({
      key: LIMIT_KEY.FEE_INVOICE_PER_DAY,
      metric: DEMO_LIMIT_METRIC.FEE_INVOICE_PER_DAY,
      limitValue: 5,
      period: DEMO_LIMIT_PERIOD.PER_DAY,
    }),
  ]

  it("evaluates every usage", () => {
    const decisions = evaluateAll(rules, [
      { metric: DEMO_LIMIT_METRIC.STUDENT, current: 10 },
      { metric: DEMO_LIMIT_METRIC.TEACHER, current: 9 },
      { metric: DEMO_LIMIT_METRIC.FEE_INVOICE_PER_DAY, current: 1 },
    ])
    expect(decisions).toHaveLength(3)
    expect(decisions.map((d) => d.allowed)).toEqual([true, false, true])
  })

  it("returns an empty array for no usages", () => {
    expect(evaluateAll(rules, [])).toEqual([])
  })

  it("indexes rules by metric rather than by key", () => {
    // Key and metric are different columns; a rule whose key is unfamiliar but whose
    // metric matches must still apply.
    const decisions = evaluateAll(
      [rule({ key: "SOMETHING_ELSE", metric: DEMO_LIMIT_METRIC.STUDENT, limitValue: 1 })],
      [{ metric: DEMO_LIMIT_METRIC.STUDENT, current: 2 }],
    )
    expect(decisions[0].allowed).toBe(false)
  })

  it("lets the last duplicate rule for a metric win", () => {
    const decisions = evaluateAll(
      [
        rule({ metric: DEMO_LIMIT_METRIC.STUDENT, limitValue: 1 }),
        rule({ metric: DEMO_LIMIT_METRIC.STUDENT, limitValue: 100 }),
      ],
      [{ metric: DEMO_LIMIT_METRIC.STUDENT, current: 50 }],
    )
    expect(decisions[0].allowed).toBe(true)
  })

  it("allows a usage whose metric has no rule", () => {
    const decisions = evaluateAll(rules, [{ metric: DEMO_LIMIT_METRIC.SUBJECT, current: 999 }])
    expect(decisions[0].allowed).toBe(true)
  })
})

describe("firstDenial", () => {
  const allow = evaluateLimit(rule(), { metric: DEMO_LIMIT_METRIC.STUDENT, current: 1 })
  const deny = evaluateLimit(rule(), { metric: DEMO_LIMIT_METRIC.TEACHER, current: 99 })

  it("returns null when everything passed", () => {
    expect(firstDenial([allow, allow])).toBeNull()
  })

  it("returns null for an empty list", () => {
    expect(firstDenial([])).toBeNull()
  })

  it("returns the first denial", () => {
    const found = firstDenial([allow, deny, deny])
    expect(found).not.toBeNull()
    expect(found!.allowed).toBe(false)
  })

  it("returns the earliest denial, not the last", () => {
    const first = evaluateLimit(rule({ metric: "A", limitValue: 1 }), {
      metric: "A",
      current: 5,
    })
    const second = evaluateLimit(rule({ metric: "B", limitValue: 1 }), {
      metric: "B",
      current: 5,
    })
    const found = firstDenial([first, second])
    expect(found).toBe(first)
  })
})

describe("buildLimitNotices", () => {
  const rules = [
    rule({ metric: DEMO_LIMIT_METRIC.STUDENT, limitValue: 60 }),
    rule({ metric: DEMO_LIMIT_METRIC.TEACHER, limitValue: 8 }),
    rule({ metric: DEMO_LIMIT_METRIC.STAFF, limitValue: UNLIMITED }),
    rule({ metric: DEMO_LIMIT_METRIC.PARENT, limitValue: 60, isEnabled: false }),
  ]

  it("omits unlimited and disabled rules", () => {
    const notices = buildLimitNotices(rules, [
      { metric: DEMO_LIMIT_METRIC.STUDENT, current: 10 },
      { metric: DEMO_LIMIT_METRIC.TEACHER, current: 1 },
      { metric: DEMO_LIMIT_METRIC.STAFF, current: 999 },
      { metric: DEMO_LIMIT_METRIC.PARENT, current: 999 },
    ])

    const metrics = notices.map((n) => n.metric)
    expect(metrics).toContain(DEMO_LIMIT_METRIC.STUDENT)
    expect(metrics).toContain(DEMO_LIMIT_METRIC.TEACHER)
    expect(metrics).not.toContain(DEMO_LIMIT_METRIC.STAFF)
    expect(metrics).not.toContain(DEMO_LIMIT_METRIC.PARENT)
  })

  it("omits rules with no reported usage", () => {
    const notices = buildLimitNotices(rules, [{ metric: DEMO_LIMIT_METRIC.STUDENT, current: 0 }])
    expect(notices).toHaveLength(1)
    expect(notices[0].metric).toBe(DEMO_LIMIT_METRIC.STUDENT)
  })

  it("sorts by how close to the cap, tightest first", () => {
    const notices = buildLimitNotices(rules, [
      { metric: DEMO_LIMIT_METRIC.STUDENT, current: 10 }, // 50 remaining
      { metric: DEMO_LIMIT_METRIC.TEACHER, current: 7 }, // 1 remaining
    ])

    expect(notices.map((n) => n.metric)).toEqual([
      DEMO_LIMIT_METRIC.TEACHER,
      DEMO_LIMIT_METRIC.STUDENT,
    ])
  })

  it("marks atLimit once usage reaches the cap", () => {
    const notices = buildLimitNotices(
      [rule({ limitValue: 10 })],
      [{ metric: DEMO_LIMIT_METRIC.STUDENT, current: 10 }],
    )
    expect(notices[0].atLimit).toBe(true)
    expect(notices[0].remaining).toBe(0)
  })

  it("reports a negative remaining when already over the cap", () => {
    const notices = buildLimitNotices(
      [rule({ limitValue: 10 })],
      [{ metric: DEMO_LIMIT_METRIC.STUDENT, current: 15 }],
    )
    expect(notices[0].remaining).toBe(-5)
    expect(notices[0].atLimit).toBe(true)
  })

  it("is not atLimit below the cap", () => {
    const notices = buildLimitNotices(
      [rule({ limitValue: 10 })],
      [{ metric: DEMO_LIMIT_METRIC.STUDENT, current: 9 }],
    )
    expect(notices[0].atLimit).toBe(false)
  })

  it("returns an empty array when there are no rules", () => {
    expect(buildLimitNotices([], [{ metric: DEMO_LIMIT_METRIC.STUDENT, current: 1 }])).toEqual([])
  })

  it("ignores incoming, since a notice describes existing usage", () => {
    const notices = buildLimitNotices(
      [rule({ limitValue: 10 })],
      [{ metric: DEMO_LIMIT_METRIC.STUDENT, current: 5, incoming: 100 }],
    )
    expect(notices[0].current).toBe(5)
  })
})

describe("startOfDay", () => {
  it("uses UTC+05:00 by default", () => {
    expect(DEFAULT_DEMO_UTC_OFFSET_MINUTES).toBe(300)
  })

  it("truncates to local midnight under the offset", () => {
    // 2026-01-01T18:30Z is 2026-01-01T23:30 at UTC+05:00, so the local day is Jan 1
    // and its midnight is 2025-12-31T19:00Z. Returning 2026-01-01T00:00Z instead
    // would be five hours late.
    const start = startOfDay(new Date("2026-01-01T18:30:00.000Z"))
    expect(start.toISOString()).toBe("2025-12-31T19:00:00.000Z")
  })

  it("is idempotent for an instant already at midnight", () => {
    // 2026-01-01T19:00Z is exactly 2026-01-02T00:00 at +05:00.
    const midnight = new Date("2026-01-01T19:00:00.000Z")
    expect(startOfDay(midnight).getTime()).toBe(midnight.getTime())
  })

  it("stays on the same day for an early-morning instant", () => {
    const start = startOfDay(new Date("2026-01-01T00:30:00.000Z"))
    expect(start.toISOString()).toBe("2025-12-31T19:00:00.000Z")
  })

  it("honours a different offset", () => {
    const start = startOfDay(new Date("2026-01-01T12:00:00.000Z"), 0)
    expect(start.toISOString()).toBe("2026-01-01T00:00:00.000Z")
  })

  it("handles a negative offset", () => {
    // 2026-01-01T12:00Z is 07:00 at -05:00, so the day is Jan 1 and its midnight
    // is 2026-01-01T05:00Z.
    const start = startOfDay(new Date("2026-01-01T12:00:00.000Z"), -300)
    expect(start.toISOString()).toBe("2026-01-01T05:00:00.000Z")
  })

  it("never returns a time later than the input", () => {
    for (const iso of [
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T12:34:56.789Z",
      "2026-06-15T23:59:59.999Z",
      "2026-12-31T18:00:00.000Z",
    ]) {
      const now = new Date(iso)
      expect(startOfDay(now).getTime()).toBeLessThanOrEqual(now.getTime())
    }
  })
})

describe("isWithinDay", () => {
  const now = new Date("2026-01-02T10:00:00.000Z")
  const start = new Date("2026-01-01T19:00:00.000Z") // 2026-01-02 00:00 at +05:00

  it("is true for an instant inside the window", () => {
    expect(isWithinDay(new Date("2026-01-02T05:00:00.000Z"), now)).toBe(true)
  })

  it("is true at the boundary", () => {
    expect(isWithinDay(start, now)).toBe(true)
  })

  it("is false one millisecond before the boundary", () => {
    expect(isWithinDay(new Date(start.getTime() - 1), now)).toBe(false)
  })

  it("is false for yesterday's rows", () => {
    expect(isWithinDay(new Date("2026-01-01T05:00:00.000Z"), now)).toBe(false)
  })
})

describe("limitBlockedMetadata", () => {
  it("carries only the metric and the cap", () => {
    const decision = evaluateLimit(rule({ limitValue: 60 }), {
      metric: DEMO_LIMIT_METRIC.STUDENT,
      current: 61,
    })
    if (decision.allowed) expect.unreachable("should have been denied")

    const metadata = limitBlockedMetadata(decision)
    expect(metadata).toEqual({ metric: DEMO_LIMIT_METRIC.STUDENT, limit: 60 })
    expect(Object.keys(metadata).sort()).toEqual(["limit", "metric"])
  })
})

describe("catalog consistency", () => {
  it("gives every plan at least one limit", () => {
    for (const plan of PLAN_CATALOG) {
      expect(plan.limits.length, plan.key).toBeGreaterThan(0)
    }
  })

  it("uses unique keys within each plan, matching the [planId, key] index", () => {
    for (const plan of PLAN_CATALOG) {
      const keys = plan.limits.map((l) => l.key)
      expect(new Set(keys).size, plan.key).toBe(keys.length)
    }
  })

  it("gives every plan a unique metric set", () => {
    for (const plan of PLAN_CATALOG) {
      const metrics = plan.limits.map((l) => l.metric)
      expect(new Set(metrics).size, plan.key).toBe(metrics.length)
    }
  })

  it("uses only known periods", () => {
    const known = new Set(Object.values(DEMO_LIMIT_PERIOD))
    for (const plan of PLAN_CATALOG) {
      for (const limit of plan.limits) {
        expect(known.has(limit.period as never), `${plan.key}.${limit.key}`).toBe(true)
      }
    }
  })

  it("never sets a negative limit other than the unlimited sentinel", () => {
    for (const plan of PLAN_CATALOG) {
      for (const limit of plan.limits) {
        if (limit.limitValue < 0) {
          expect(limit.limitValue, `${plan.key}.${limit.key}`).toBe(UNLIMITED)
        }
      }
    }
  })

  it("covers the same metrics across every plan, so no plan silently lacks a cap", () => {
    const reference = new Set(PLAN_CATALOG[0].limits.map((l) => l.metric))
    for (const plan of PLAN_CATALOG) {
      expect(new Set(plan.limits.map((l) => l.metric)), plan.key).toEqual(reference)
    }
  })

  it("orders caps from smallest to largest plan, excluding INTERNAL", () => {
    const capped = PLAN_CATALOG.filter((p) => p.key !== PLAN_KEY.INTERNAL)
    for (let i = 1; i < capped.length; i++) {
      const previous = getPlanDefinition(capped[i - 1].key)!
      const current = getPlanDefinition(capped[i].key)!
      const previousStudent = previous.limits.find((l) => l.key === LIMIT_KEY.STUDENT_MAX)!
      const currentStudent = current.limits.find((l) => l.key === LIMIT_KEY.STUDENT_MAX)!
      expect(currentStudent.limitValue, `${current.key}`).toBeGreaterThan(
        previousStudent.limitValue,
      )
    }
  })
})
