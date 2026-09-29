import "server-only"

import { cache } from "react"

import { DemoEventType } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { DEMO_LIMIT_METRIC, DEMO_LIMIT_PERIOD } from "./constants"
import { logDemoEvent } from "./events"
import {
  buildLimitNotices,
  evaluateLimit,
  limitBlockedMetadata,
  startOfDay,
  type LimitDecision,
  type LimitNotice,
  type LimitRule,
  type LimitUsage,
} from "./limits"

/**
 * The database-facing half of the limit engine.
 *
 * `limits.ts` holds the rules; this file resolves the caller's plan and measures
 * current usage. Kept separate so the rules stay unit testable — see the note at the
 * top of `limits.ts` for why importing `@/lib/prisma` into a tested module is a
 * problem.
 *
 * Wiring this into product mutations happens in Phase 9. Nothing here is called by
 * the app yet.
 */

/** The profile fields limit enforcement needs. Narrows `getCurrentProfile` to a subset. */
export type LimitSubject = {
  schoolId: string | null
}

/**
 * The limits configured for a school's plan.
 *
 * Wrapped in `cache()` so a render that checks several metrics issues one query
 * instead of one per check. Cached per request only — a limit lowered in the database
 * takes effect on the next request, with no deploy and no restart.
 */
export const resolvePlanLimits = cache(async (schoolId: string): Promise<LimitRule[]> => {
  const tenant = await prisma.demoTenant.findUnique({
    where: { schoolId },
    select: {
      plan: {
        select: {
          limits: {
            select: { key: true, metric: true, limitValue: true, period: true, isEnabled: true },
          },
        },
      },
    },
  })

  // No demo tenant, or no plan attached: nothing to enforce.
  return tenant?.plan?.limits ?? []
})

/**
 * Counts current usage for one metric, scoped to the school.
 *
 * `FeeInvoice` and `StudentAttendance` have no `school_id` column of their own, so
 * they are scoped through `student.schoolId` instead. Getting that wrong would count
 * rows from every school in the deployment, which is the exact failure this guard
 * exists to prevent.
 */
async function countUsage(schoolId: string, metric: string, now: Date): Promise<number> {
  switch (metric) {
    case DEMO_LIMIT_METRIC.STUDENT:
      return prisma.student.count({ where: { schoolId } })

    case DEMO_LIMIT_METRIC.TEACHER:
      return prisma.teacher.count({ where: { schoolId } })

    case DEMO_LIMIT_METRIC.STAFF:
      return prisma.staff.count({ where: { schoolId } })

    case DEMO_LIMIT_METRIC.PARENT:
      return prisma.parent.count({ where: { schoolId } })

    case DEMO_LIMIT_METRIC.BRANCH:
      return prisma.branch.count({ where: { schoolId } })

    case DEMO_LIMIT_METRIC.CLASS:
      return prisma.class.count({ where: { schoolId } })

    case DEMO_LIMIT_METRIC.SUBJECT:
      return prisma.subject.count({ where: { schoolId } })

    case DEMO_LIMIT_METRIC.FEE_INVOICE_PER_DAY:
      return prisma.feeInvoice.count({
        where: { student: { schoolId }, invoiceDate: { gte: startOfDay(now) } },
      })

    case DEMO_LIMIT_METRIC.ATTENDANCE_SCAN_PER_DAY:
      return prisma.studentAttendance.count({
        where: { student: { schoolId }, date: { gte: startOfDay(now) } },
      })

    // An unrecognised metric has no measurement, so it cannot be enforced. The
    // evaluator treats the absent rule as "no cap" as well.
    default:
      return 0
  }
}

/**
 * Checks one metric and returns a decision. Never throws for a denial.
 *
 * On denial it writes a `LIMIT_BLOCKED` event carrying only the metric and the cap.
 */
export async function assertWithinLimit(
  subject: LimitSubject,
  metric: string,
  incoming = 0,
  now: Date = new Date(),
): Promise<LimitDecision> {
  // No school means no tenant, so there is nothing to enforce against.
  if (!subject.schoolId) {
    return evaluateLimit(undefined, { metric, current: 0, incoming })
  }

  const [rules, current] = await Promise.all([
    resolvePlanLimits(subject.schoolId),
    countUsage(subject.schoolId, metric, now),
  ])

  const rule = rules.find((candidate) => candidate.metric === metric)
  const decision = evaluateLimit(rule, { metric, current, incoming })

  if (decision.allowed) return decision

  const tenant = await prisma.demoTenant.findUnique({
    where: { schoolId: subject.schoolId },
    select: { id: true },
  })

  if (tenant) {
    await logDemoEvent({
      demoTenantId: tenant.id,
      type: DemoEventType.LIMIT_BLOCKED,
      fromStatus: null,
      toStatus: null,
      // Metric and cap only — see limitBlockedMetadata for why nothing else.
      message: `Blocked ${metric} at limit ${decision.limit}`,
      metadata: limitBlockedMetadata(decision),
    })
  }

  return decision
}

/** The "running low" list for the demo banner. Empty for non-demo schools. */
export async function getLimitNotices(
  subject: LimitSubject,
  now: Date = new Date(),
): Promise<LimitNotice[]> {
  if (!subject.schoolId) return []

  const rules = await resolvePlanLimits(subject.schoolId)
  if (rules.length === 0) return []

  // Only measure metrics that will actually be shown, so a banner costs one query
  // per visible cap rather than one per configured cap.
  const metrics = [...new Set(rules.map((rule) => rule.metric))]
  const counts = await Promise.all(
    metrics.map((metric) => countUsage(subject.schoolId!, metric, now)),
  )

  const usages: LimitUsage[] = metrics.map((metric, index) => ({
    metric,
    current: counts[index],
  }))

  return buildLimitNotices(rules, usages)
}

/** Re-exported so callers need only one import to enforce and to explain a denial. */
export { DEMO_LIMIT_PERIOD, type LimitDecision, type LimitNotice }
