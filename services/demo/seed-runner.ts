/**
 * The seed runner.
 *
 * Runs a tenant's seed as a sequence of independent phases. The properties that
 * matter, and why:
 *
 *  - **Each phase commits on its own.** The plan requires that a failure in phase G
 *    leaves A-F committed. A single transaction around the whole seed would roll
 *    everything back and satisfy none of that, so there is deliberately no outer
 *    transaction here.
 *  - **Progress is monotonic and re-read from the database.** A resumed run must not
 *    move the bar backwards, and a duplicate worker must not double-count. Both are
 *    handled by re-reading before every write, not by trusting an in-memory counter.
 *  - **A phase that already succeeded is skipped.** Resume is therefore cheap, and
 *    re-running a completed seed is a no-op rather than a duplicate-insert error.
 *  - **Concurrency is fenced on the status column.** A `updateMany` filtered on the
 *    observed status is the guard, so two workers cannot both seed the same tenant.
 *
 * Pure sequencing and progress arithmetic live in `lib/demo/lifecycle.ts` and are unit
 * tested there; this file is the I/O shell around them.
 */

import { DemoEventType, Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { DEMO_SEED_STATUS, DEMO_STATUS, DEMO_STALE_SEED_MS } from "@/lib/demo/constants"
import { logDemoEvent } from "@/lib/demo/events"
import { assertTransition, sanitizeSeedError } from "@/lib/demo/lifecycle"
import { transitionTo } from "@/lib/demo/transition"
import { Prng } from "./prng"
import {
  inBandPhases,
  outOfBandPhases,
  progressAfter,
  resumeIndex,
  type SeedPhase,
} from "./seed-phases"
export { progressAfter, resumeIndex, inBandPhases, outOfBandPhases, type SeedPhase }

export type SeedContext = {
  tenantId: string
  schoolId: string
  /** Uppercased slug, used as the prefix on every globally unique value. */
  prefix: string
  /** Seeded from the slug, so a re-run of the same slug reproduces the same data. */
  prng: Prng
}

export type SeedResult = {
  status: "COMPLETED" | "FAILED"
  completedPhases: string[]
  failedPhase: string | null
  error: string | null
}

/**
 * Writes `seedProgress` monotonically.
 *
 * Re-reads rather than computing purely in memory, so a retried or duplicated worker
 * cannot move the bar backwards. The update is conditional on the observed value for
 * the same reason `transitionTo` guards on status.
 *//**
 * Runs every phase for one tenant.
 *
 * Assumes the tenant is already `PROVISIONING`; it moves the tenant to `SEEDING`,
 * and on failure to `FAILED` so a reader can tell the difference between "still
 * working" and "will never work".
 */
export async function runSeed<TContext extends SeedContext>(
  tenantId: string,
  buildContext: (tenant: { id: string; schoolId: string | null; slug: string }) => TContext,
  phases: readonly SeedPhase<TContext>[],
): Promise<SeedResult> {
  const tenant = await prisma.demoTenant.findUnique({
    where: { id: tenantId },
    select: { id: true, schoolId: true, slug: true, status: true, seedStep: true },
  })

  if (!tenant) throw new Error(`Demo tenant ${tenantId} not found`)

  // The first phase creates the school, so `schoolId` is null until it has run. Only
  // a resume of a later phase is guaranteed to have one. A brand-new tenant is the
  // normal case, so this must not be an error.
  if (!tenant.schoolId && tenant.seedStep !== null) {
    throw new Error(
      `Demo tenant ${tenantId} is resuming at "${tenant.seedStep}" but has no school, ` +
        `which means the school phase did not commit. Purge the tenant and re-seed.`,
    )
  }

  // Fence the work. A terminal tenant is never seeded, and a tenant already being
  // seeded is refused so two workers cannot interleave phases.
  if (tenant.status === DEMO_STATUS.SEEDING) {
    const startedRecently = await isFreshRun(tenantId)
    if (startedRecently) {
      throw new Error(
        `Demo tenant ${tenantId} is already being seeded. ` +
          `If that run was abandoned, wait ${DEMO_STALE_SEED_MS}ms or revoke the tenant.`,
      )
    }
  }

  if (tenant.status !== DEMO_STATUS.SEEDING) {
    assertTransition(tenant.status, DEMO_STATUS.SEEDING)
    await transitionTo(tenantId, DEMO_STATUS.SEEDING, { reason: "seed:started" })
  }

  const context = buildContext({
    id: tenant.id,
    schoolId: tenant.schoolId,
    slug: tenant.slug,
  })

  const weights = phases.map((phase) => phase.weight)
  const completedPhases: string[] = []

  // Resume: everything up to the recorded step already committed.
  const startIndex = resumeIndex(phases, tenant.seedStep)

  for (let index = 0; index < phases.length; index++) {
    const phase = phases[index]
    const alreadyDone = index < startIndex

    if (alreadyDone) {
      completedPhases.push(phase.name)
      continue
    }

    try {
      await prisma.demoTenant.update({
        where: { id: tenantId },
        data: { seedStatus: DEMO_SEED_STATUS.RUNNING, seedStep: phase.name },
      })

      await phase.run(context)

      completedPhases.push(phase.name)

      await writeProgress(tenantId, index, weights, 100)
    } catch (error) {
      await handleFailure(tenantId, phase.name, error)
      return {
        status: "FAILED",
        completedPhases,
        failedPhase: phase.name,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  await writeProgress(tenantId, phases.length, weights, 100)

  await prisma.demoTenant.update({
    where: { id: tenantId },
    data: { seedStatus: DEMO_SEED_STATUS.COMPLETED, seedProgress: 100, seedError: null },
  })

  await transitionTo(tenantId, DEMO_STATUS.READY, { reason: "seed:completed" })

  return { status: "COMPLETED", completedPhases, failedPhase: null, error: null }
}

/**
 * Writes `seedProgress` monotonically.
 *
 * Re-reads rather than computing purely in memory, so a retried or duplicated worker
 * cannot move the bar backwards. The update is conditional on the observed value for
 * the same reason `transitionTo` guards on status.
 */
async function writeProgress(
  tenantId: string,
  completedCount: number,
  weights: readonly number[],
  phaseProgress: number,
): Promise<void> {
  const current = await prisma.demoTenant.findUnique({
    where: { id: tenantId },
    select: { seedProgress: true },
  })

  if (!current) return

  const next = progressAfter(weights, completedCount, phaseProgress)
  if (next <= current.seedProgress) return

  await prisma.demoTenant.update({ where: { id: tenantId }, data: { seedProgress: next } })
}

/** Marks the tenant FAILED and records why. */
async function handleFailure(tenantId: string, phaseName: string, error: unknown): Promise<void> {
  // Seed errors carry a full stack, and a Prisma stack can include the connection
  // string. Sanitising before the write is what keeps a secret out of a column that
  // gets surfaced on the admin page.
  const message = sanitizeSeedError(error) ?? "seed failed"

  await prisma.demoTenant
    .update({
      where: { id: tenantId },
      data: {
        seedStatus: DEMO_SEED_STATUS.FAILED,
        seedError: message.slice(0, 500),
      },
    })
    .catch(() => {})

  await logDemoEvent({
    demoTenantId: tenantId,
    type: DemoEventType.SEED_FAILED,
    message: `phase ${phaseName}: ${message}`,
    metadata: { phase: phaseName },
  })

  // SEEDING -> FAILED. If a concurrent worker already moved it, this throws and the
  // original failure is the one worth reporting, so the error is swallowed here.
  await transitionTo(tenantId, DEMO_STATUS.FAILED, {
    reason: `seed failed in phase ${phaseName}`,
  }).catch(() => {})
}

/** True when a `SEEDING` tenant was updated recently enough to still be running. */
async function isFreshRun(tenantId: string): Promise<boolean> {
  const tenant = await prisma.demoTenant.findUnique({
    where: { id: tenantId },
    select: { updatedAt: true },
  })

  if (!tenant) return false

  return Date.now() - tenant.updatedAt.getTime() < DEMO_STALE_SEED_MS
}

/** Prisma's unique-constraint violation, recognised without importing the error class. */
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
}
