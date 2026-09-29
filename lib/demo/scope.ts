import "server-only"

import { prisma } from "@/lib/prisma"
import { getCurrentProfile } from "@/lib/auth"
import { DEMO_STATUS, type DemoStatus } from "./constants"
import { effectiveStatus, isFinalStatus, isUsableStatus } from "./lifecycle"

export type DemoContext = {
  tenantId: string
  slug: string
  status: DemoStatus
  schoolId: string
  planKey: string
  expiresAt: Date
  /** True when the tenant is past `expiresAt` even if the stored status lags. */
  expired: boolean
}

export class DemoAccessError extends Error {
  readonly reason: "not-demo" | "provisioning" | "expired" | "revoked" | "purged" | "no-school"

  constructor(reason: DemoAccessError["reason"], message: string) {
    super(message)
    this.name = "DemoAccessError"
    this.reason = reason
  }
}

/**
 * Resolves the caller's demo tenant, keyed off `Profile.schoolId`.
 *
 * This is the single read-path gate for demo access. It is deliberately a hard
 * failure rather than a redirect: a demo tenant that is expired or purged must not
 * quietly render product pages, and the caller has to decide what the user sees.
 *
 * Scope comes from the caller's own profile, never from a URL parameter, so a user
 * cannot read another tenant by editing a slug. The school is the join point
 * because `Profile.schoolId` already scopes every product query in this codebase.
 */
export async function getDemoContext(): Promise<DemoContext | null> {
  const profile = await getCurrentProfile()
  if (!profile?.schoolId) return null

  const tenant = await prisma.demoTenant.findFirst({
    where: { schoolId: profile.schoolId },
    select: {
      id: true,
      slug: true,
      status: true,
      schoolId: true,
      expiresAt: true,
      plan: { select: { key: true } },
    },
  })

  // Not a demo school at all. Returning null lets normal schools through untouched.
  if (!tenant || !tenant.schoolId) return null

  const now = new Date()
  const status = effectiveStatus(tenant.status, tenant.expiresAt, now)

  assertUsable(tenant.status, status, now)

  return {
    tenantId: tenant.id,
    slug: tenant.slug,
    status,
    schoolId: tenant.schoolId,
    planKey: tenant.plan?.key ?? "UNKNOWN",
    expiresAt: tenant.expiresAt,
    expired: status === DEMO_STATUS.EXPIRED,
  }
}

/**
 * Throws `DemoAccessError` unless the tenant may render product pages.
 *
 * Reads the *effective* status, not the stored one. A tenant stored as `READY` whose
 * clock has run out is expired from the user's point of view even though no job has
 * written that down yet, and it must be told "expired" rather than "still setting up".
 */
function assertUsable(stored: DemoStatus, effective: DemoStatus, now: Date): void {
  if (isUsableStatus(effective)) return

  if (isFinalStatus(stored)) {
    throw new DemoAccessError("purged", "This demo has been deleted.")
  }

  // Expired by the clock even though the stored status still says otherwise.
  if (effective === DEMO_STATUS.EXPIRED) {
    throw new DemoAccessError("expired", "This demo has expired.")
  }

  switch (stored) {
    case DEMO_STATUS.EXPIRED:
      throw new DemoAccessError("expired", "This demo has expired.")
    case DEMO_STATUS.REVOKED:
      throw new DemoAccessError("revoked", "This demo has been revoked.")
    case DEMO_STATUS.FAILED:
      throw new DemoAccessError("provisioning", "This demo could not be set up.")
    default:
      // REQUESTED, PROVISIONING, SEEDING — genuinely still being built.
      throw new DemoAccessError(
        "provisioning",
        `This demo is not ready yet (currently ${stored}, checked ${now.toISOString()}).`,
      )
  }
}

/**
 * Like `getDemoContext` but throws instead of returning null when the caller is
 * part of a demo. Use on demo-only routes, where a normal school is the error case.
 */
export async function requireDemoContext(): Promise<DemoContext> {
  const context = await getDemoContext()
  if (!context) {
    throw new DemoAccessError("not-demo", "This action is only available in the demo.")
  }
  return context
}
