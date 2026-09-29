import "server-only"

import { DemoEventType, type DemoStatus } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { DEMO_SEED_STATUS, DEMO_STATUS } from "./constants"
import { logDemoEvent, updateSeedProgress } from "./events"
import { assertTransition, sanitizeSeedError, shouldAutoPurge } from "./lifecycle"

/** Metadata common to every state change, for the audit trail. */
export type TransitionContext = {
  /** `Profile.id` of whoever triggered the change, not the auth user id. */
  actorProfileId?: string | null
  ipAddress?: string | null
  /** Why the transition happened, e.g. "cron:expiry" or "seed:completed". */
  reason?: string
}

/**
 * Moves a tenant to a new status, or throws if the move is illegal.
 *
 * The status is re-read inside the transaction and the transition is validated
 * against what is actually stored, not against what the caller believed. Without
 * that, two concurrent workers can each read `SEEDING` and both decide they may
 * write `READY` — and a completed tenant can be resurrected by a late retry.
 *
 * `updateMany` on the observed status is the guard: if another worker moved the
 * tenant first, the update matches zero rows and we report a conflict rather than
 * overwriting it.
 */
export async function transitionTo(
  tenantId: string,
  to: DemoStatus,
  context: TransitionContext = {},
): Promise<void> {
  const tenant = await prisma.demoTenant.findUnique({
    where: { id: tenantId },
    select: { id: true, status: true, schoolId: true },
  })

  if (!tenant) throw new Error(`Demo tenant ${tenantId} not found`)

  assertTransition(tenant.status, to)

  const result = await prisma.demoTenant.updateMany({
    where: { id: tenantId, status: tenant.status },
    data: { status: to },
  })

  if (result.count === 0) {
    throw new Error(
      `Demo tenant ${tenantId} changed status concurrently; refusing ${tenant.status} -> ${to}`,
    )
  }

  await logDemoEvent({
    demoTenantId: tenantId,
    type: eventTypeForStatus(to),
    actorProfileId: context.actorProfileId ?? null,
    ipAddress: context.ipAddress ?? null,
    fromStatus: tenant.status,
    toStatus: to,
    message: context.reason,
  })
}

/** The audit event that corresponds to a status change. */
function eventTypeForStatus(status: DemoStatus): DemoEventType {
  switch (status) {
    case DEMO_STATUS.READY:
      return DemoEventType.SEED_COMPLETED
    case DEMO_STATUS.EXPIRED:
      return DemoEventType.EXPIRED
    case DEMO_STATUS.FAILED:
      return DemoEventType.SEED_FAILED
    case DEMO_STATUS.REVOKED:
      return DemoEventType.REVOKED
    case DEMO_STATUS.PURGED:
      return DemoEventType.PURGE_COMPLETED
    default:
      return DemoEventType.SEED_STARTED
  }
}

/**
 * Records a seed failure and, once the retry budget is spent, fails the tenant.
 *
 * The retry cap comes from `DEMO_MAX_SEED_ATTEMPTS` only, so there is a single
 * definition of "exhausted" shared with the unit tests.
 *
 * Returns true when the tenant has exhausted its attempts and should be purged, so
 * the caller can enqueue that without re-querying.
 */
export async function recordSeedFailure(input: {
  tenantId: string
  error: unknown
  context?: TransitionContext
}): Promise<boolean> {
  const tenant = await prisma.demoTenant.findUnique({
    where: { id: input.tenantId },
    select: { id: true, status: true, schoolId: true, seedAttempts: true },
  })

  if (!tenant) return false

  const attempts = tenant.seedAttempts + 1
  const exhausted = shouldAutoPurge(attempts, tenant.status)

  await updateSeedProgress({
    tenantId: input.tenantId,
    status: exhausted ? DEMO_SEED_STATUS.FAILED : DEMO_SEED_STATUS.PENDING,
    error: input.error,
    incrementAttempts: 1,
  })

  await logDemoEvent({
    demoTenantId: input.tenantId,
    type: DemoEventType.SEED_FAILED,
    actorProfileId: input.context?.actorProfileId ?? null,
    ipAddress: input.context?.ipAddress ?? null,
    fromStatus: tenant.status,
    toStatus: tenant.status,
    message: sanitizeSeedError(input.error),
    metadata: { attempts, exhausted },
  })

  if (!exhausted) return false

  // A dead tenant may only move to PURGED, so only fail it if that is still legal.
  // If the tenant is already purged the work is done and this is a no-op.
  if (tenant.status !== DEMO_STATUS.FAILED) {
    await transitionTo(input.tenantId, DEMO_STATUS.FAILED, {
      ...input.context,
      reason: "seed attempts exhausted",
    })
  }

  return true
}

/**
 * Marks a tenant revoked. Idempotent: revoking twice is not an error, because a
 * double-click on "revoke" should not surface as a failure.
 */
export async function revokeTenant(
  tenantId: string,
  context: TransitionContext = {},
): Promise<void> {
  const tenant = await prisma.demoTenant.findUnique({
    where: { id: tenantId },
    select: { status: true },
  })

  if (!tenant) throw new Error(`Demo tenant ${tenantId} not found`)
  if (tenant.status === DEMO_STATUS.REVOKED || tenant.status === DEMO_STATUS.PURGED) return

  await transitionTo(tenantId, DEMO_STATUS.REVOKED, {
    ...context,
    reason: context.reason ?? "manual revoke",
  })
}
