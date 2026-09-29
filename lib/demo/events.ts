import "server-only"

import {
  DemoEventType,
  Prisma,
  type DemoSeedStatus,
  type DemoStatus,
} from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { monotonicProgress, sanitizeSeedError } from "./lifecycle"

/**
 * Append-only audit log for demo tenant activity.
 *
 * Field names follow the `DemoEvent` model exactly: `demoTenantId`,
 * `actorProfileId`, `ipAddress`. The school is not denormalised onto the event —
 * it is reachable through `DemoTenant.schoolId`, and duplicating it here would let
 * the two drift apart.
 *
 * Write failures are swallowed on purpose. A missing audit row is recoverable; a
 * 500 thrown from an audit write on an otherwise successful request is not.
 */
export async function logDemoEvent(input: {
  demoTenantId: string
  type: DemoEventType
  actorProfileId?: string | null
  ipAddress?: string | null
  fromStatus?: DemoStatus | null
  toStatus?: DemoStatus | null
  message?: string | null
  metadata?: Prisma.InputJsonValue
}): Promise<void> {
  try {
    await prisma.demoEvent.create({
      data: {
        demoTenantId: input.demoTenantId,
        type: input.type,
        actorProfileId: input.actorProfileId ?? null,
        ipAddress: input.ipAddress ?? null,
        fromStatus: input.fromStatus ?? null,
        toStatus: input.toStatus ?? null,
        message: sanitizeSeedError(input.message),
        metadata: input.metadata ?? {},
      },
    })
  } catch (error) {
    console.error("[demo] failed to write demo event", {
      demoTenantId: input.demoTenantId,
      type: input.type,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Updates a tenant's seed bookkeeping columns.
 *
 * Progress is monotonic: a duplicated or retried worker must never make the bar go
 * backwards, otherwise a tenant that is actually stuck looks like it restarted.
 * The same rule is unit tested in `lifecycle.ts` and reused here rather than
 * reimplemented as a SQL expression, so there is one definition to trust.
 */
export async function updateSeedProgress(input: {
  tenantId: string
  status?: DemoSeedStatus
  progress?: number
  error?: unknown
  /** Increments the attempt counter rather than setting it. */
  incrementAttempts?: number
}): Promise<void> {
  const data: Prisma.DemoTenantUpdateInput = {}

  if (input.status !== undefined) data.seedStatus = input.status
  if (input.error !== undefined) data.seedError = sanitizeSeedError(input.error)
  if (input.incrementAttempts !== undefined) {
    data.seedAttempts = { increment: input.incrementAttempts }
  }

  if (input.progress !== undefined) {
    const current = await prisma.demoTenant.findUnique({
      where: { id: input.tenantId },
      select: { seedProgress: true },
    })

    if (!current) return

    data.seedProgress = monotonicProgress(current.seedProgress, input.progress)
  }

  if (Object.keys(data).length === 0) return

  try {
    await prisma.demoTenant.update({ where: { id: input.tenantId }, data })
  } catch (error) {
    console.error("[demo] failed to update seed progress", {
      tenantId: input.tenantId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
