/**
 * Persona provisioning: real Supabase Auth users for a seeded demo tenant.
 *
 * Per plan §12. Personas are real accounts, not a mock session and not a bypass
 * header. That is the point of the demo being trustworthy: every request in the
 * session is authorized by the ordinary `requireRole()` path, so nothing here grants
 * access a real user would not have.
 *
 * HOW EACH PORTAL FINDS ITS PERSON
 *
 * The three portals resolve their domain row differently, and getting this wrong is
 * the difference between a working demo and three empty screens:
 *
 * | Portal  | Lookup                                                    | Consequence                |
 * | ------- | --------------------------------------------------------- | -------------------------- |
 * | teacher | `teacher.findFirst({ profileId: userId })`                 | profile id **is** auth id  |
 * | student | `student.findFirst({ email: profile.email })`              | emails must match exactly  |
 * | parent  | `parent.findFirst({ email: profile.email })`               | emails must match exactly  |
 * | admin   | nothing; reads the school through `profile.schoolId`       | a bare profile is enough   |
 *
 * See `app/portal/teacher/page.tsx:59`, `app/portal/student/page.tsx:42`, and
 * `app/portal/parent/page.tsx:42`. Nothing else in this file may be "simplified"
 * against those four facts.
 *
 * PROVISION AND ROLLBACK
 *
 * Per persona: create the auth user with `email_confirm: true`, create the `Profile`
 * with `id = authUser.id`, point the domain row at it, then mark the persona ready.
 * Any failure deletes the auth user and restores the domain row before rethrowing. A
 * half-created persona is the most likely cause of a demo that looks provisioned and
 * then breaks on the first click, so the rollback is not optional.
 *
 * The shared password is never persisted and never logged, and personas never get 2FA:
 * a 2FA persona would strand a visitor at an OTP prompt they cannot complete.
 */

import "server-only"

import { randomBytes } from "crypto"

import { prisma } from "@/lib/prisma"
import { createAdminClient } from "@/lib/supabase/admin"
import { DEMO_PERSONA_ORDER, type DemoPersonaType } from "@/lib/demo/constants"
import { DemoEventType } from "@/lib/generated/prisma/client"
import { logDemoEvent } from "@/lib/demo/events"
import { getPersonaPassword } from "@/lib/demo/env"
import type { PlanKey } from "@/lib/demo/plans"
import {
  buildPersonaPlan,
  incompleteBindings,
  personaUserMetadata,
  planUsesSharedPassword,
  type PersonaSpec,
} from "@/lib/demo/persona-plan"

export { planUsesSharedPassword }

export type ProvisionResult = {
  personaType: DemoPersonaType
  email: string
  profileId: string
  isReady: boolean
  /** False when a previous ready persona was reused rather than recreated. */
  created: boolean
}

export type ProvisionTenantResult = {
  tenantId: string
  slug: string
  sharedPassword: boolean
  personas: ProvisionResult[]
}

/** Thrown when provisioning cannot proceed for a reason an operator must fix. */
export class PersonaError extends Error {
  constructor(
    message: string,
    readonly personaType?: DemoPersonaType,
  ) {
    super(message)
    this.name = "PersonaError"
  }
}

/** The domain row a persona signs in as, and what must be restored on rollback. */
type DomainBinding = {
  entity: "NONE" | "TEACHER" | "STUDENT" | "PARENT"
  entityId: string | null
  firstName: string
  lastName: string
  /** Previous values, captured before the provisioner touches anything. */
  restore: () => Promise<void>
}

type TenantContext = {
  tenantId: string
  slug: string
  schoolId: string
  branchId: string | null
  planKey: PlanKey
  sharedPassword: boolean
  bindings: Record<DemoPersonaType, DomainBinding>
}

/**
 * A 24-byte random password, for plans that do not share one.
 * Returned to the caller through `PersonaError` only as a length check; the value
 * itself is never persisted or logged.
 */
function generatePersonaPassword(): string {
  return randomBytes(24).toString("base64url")
}

/**
 * Resolves the tenant, its plan, and the seeded entity each persona binds to.
 *
 * The first teacher, student, and parent by a stable ordering. Determinism matters:
 * picking "any" row would bind a different person on each run, and a reviewer
 * comparing two runs would see unrelated data.
 */
async function loadContext(tenantId: string): Promise<TenantContext> {
  const tenant = await prisma.demoTenant.findUnique({
    where: { id: tenantId },
    select: { slug: true, schoolId: true, planId: true },
  })

  if (!tenant) throw new PersonaError(`Demo tenant ${tenantId} does not exist`)

  if (!tenant.schoolId) {
    throw new PersonaError(
      `Demo tenant ${tenant.slug} has no school. Run the seed before provisioning personas.`,
    )
  }

  if (!tenant.planId) {
    throw new PersonaError(`Demo tenant ${tenant.slug} has no plan assigned.`)
  }

  const plan = await prisma.plan.findUnique({
    where: { id: tenant.planId },
    select: { key: true },
  })

  if (!plan) {
    throw new PersonaError(`Plan ${tenant.planId} referenced by ${tenant.slug} does not exist`)
  }

  const schoolId = tenant.schoolId
  const planKey = plan.key as PlanKey

  const [teacher, student, parent, branch] = await Promise.all([
    prisma.teacher.findFirst({
      where: { schoolId },
      orderBy: { employeeCode: "asc" },
      select: { id: true, profileId: true, firstName: true, lastName: true },
    }),
    prisma.student.findFirst({
      where: { schoolId },
      orderBy: { admissionNo: "asc" },
      select: { id: true, email: true, firstName: true, lastName: true },
    }),
    prisma.parent.findFirst({
      where: { schoolId },
      orderBy: { firstName: "asc" },
      select: { id: true, profileId: true, email: true, firstName: true, lastName: true },
    }),
    prisma.branch.findFirst({
      where: { schoolId },
      orderBy: { code: "asc" },
      select: { id: true },
    }),
  ])

  const bindings: Record<DemoPersonaType, DomainBinding> = {
    ADMIN: {
      entity: "NONE",
      entityId: null,
      firstName: "Demo",
      lastName: "Administrator",
      restore: async () => {},
    },
    TEACHER: {
      entity: "TEACHER",
      entityId: teacher?.id ?? null,
      firstName: teacher?.firstName ?? "Demo",
      lastName: teacher?.lastName ?? "Teacher",
      // The seed deliberately leaves `profileId` null, so the rollback is a no-op
      // unless a re-provision overwrote an existing link.
      restore: async () => {
        if (!teacher) return
        await prisma.teacher
          .update({ where: { id: teacher.id }, data: { profileId: teacher.profileId } })
          .catch(() => {})
      },
    },
    STUDENT: {
      entity: "STUDENT",
      entityId: student?.id ?? null,
      firstName: student?.firstName ?? "Demo",
      lastName: student?.lastName ?? "Student",
      restore: async () => {
        if (!student) return
        await prisma.student
          .update({ where: { id: student.id }, data: { email: student.email } })
          .catch(() => {})
      },
    },
    PARENT: {
      entity: "PARENT",
      entityId: parent?.id ?? null,
      firstName: parent?.firstName ?? "Demo",
      lastName: parent?.lastName ?? "Parent",
      restore: async () => {
        if (!parent) return
        await prisma.parent
          .update({
            where: { id: parent.id },
            data: { email: parent.email, profileId: parent.profileId },
          })
          .catch(() => {})
      },
    },
  }

  return {
    tenantId,
    slug: tenant.slug,
    schoolId,
    branchId: branch?.id ?? null,
    planKey,
    sharedPassword: planUsesSharedPassword(planKey),
    bindings,
  }
}

/** Creates the auth user, the profile, and the domain link, or rolls all of it back. */
async function provisionOne(spec: PersonaSpec, context: TenantContext): Promise<ProvisionResult> {
  const binding = context.bindings[spec.personaType]
  const admin = createAdminClient()

  const { data, error } = await admin.auth.admin.createUser({
    email: spec.email,
    // The shared password is read here and nowhere else; it is never stored.
    password: context.sharedPassword ? getPersonaPassword()! : generatePersonaPassword(),
    // Without this the account exists but cannot sign in, and the demo fails on the
    // first click rather than at provisioning time.
    email_confirm: true,
    user_metadata: personaUserMetadata(spec, {
      slug: context.slug,
      schoolId: context.schoolId,
      branchId: context.branchId,
      planKey: context.planKey,
      sharedPassword: context.sharedPassword,
    }),
  })

  if (error || !data.user) {
    throw new PersonaError(
      `Could not create the auth user for ${spec.personaType}: ${error?.message ?? "unknown error"}`,
      spec.personaType,
    )
  }

  const authUserId = data.user.id

  const rollback = async (reason: string): Promise<never> => {
    // The auth user goes first: it is the only artifact that could be signed into,
    // and it outlives this request.
    await admin.auth.admin.deleteUser(authUserId).catch(() => {})
    await binding.restore()
    await prisma.profile.deleteMany({ where: { id: authUserId } }).catch(() => {})
    throw new PersonaError(reason, spec.personaType)
  }

  try {
    // `Profile.id = authUser.id`. This is what `getCurrentProfile()` looks up, so a
    // mismatch here reads as "not signed in" on every product page.
    await prisma.profile.create({
      data: {
        id: authUserId,
        schoolId: context.schoolId,
        branchId: context.branchId,
        role: spec.role,
        firstName: binding.firstName,
        lastName: binding.lastName,
        email: spec.email,
        isActive: true,
        status: "ACTIVE",
        twoFactorEnabled: false,
      },
    })

    if (binding.entity === "TEACHER" && binding.entityId) {
      await prisma.teacher.update({
        where: { id: binding.entityId },
        data: { profileId: authUserId },
      })
    }

    if (binding.entity === "STUDENT" && binding.entityId) {
      // Student pages find the row by email, not by id.
      await prisma.student.update({
        where: { id: binding.entityId },
        data: { email: spec.email },
      })
    }

    if (binding.entity === "PARENT" && binding.entityId) {
      await prisma.parent.update({
        where: { id: binding.entityId },
        data: { email: spec.email, profileId: authUserId },
      })
    }

    await prisma.demoPersona.upsert({
      where: {
        demoTenantId_personaType: {
          demoTenantId: context.tenantId,
          personaType: spec.personaType,
        },
      },
      create: {
        demoTenantId: context.tenantId,
        personaType: spec.personaType,
        label: spec.label,
        description: spec.description,
        authUserId,
        profileId: authUserId,
        email: spec.email,
        role: spec.role,
        isReady: true,
      },
      update: {
        label: spec.label,
        description: spec.description,
        authUserId,
        profileId: authUserId,
        email: spec.email,
        role: spec.role,
        isReady: true,
      },
    })

    await logDemoEvent({
      demoTenantId: context.tenantId,
      type: DemoEventType.PERSONA_READY,
      message: `${spec.label} persona ready`,
      metadata: { persona: spec.personaType, role: spec.role },
    })

    return {
      personaType: spec.personaType,
      email: spec.email,
      profileId: authUserId,
      isReady: true,
      created: true,
    }
  } catch (error) {
    if (error instanceof PersonaError) throw error
    return rollback(
      `Provisioning ${spec.personaType} failed and was rolled back: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }
}

/**
 * True when a persona's auth user no longer exists in GoTrue.
 *
 * A persona lasts exactly as long as its auth user; the demo_persona row and the
 * profile row are caches that only make sense while that user exists. When the user
 * is gone, reuse would be a lie — the persona cannot sign in — so this removes the
 * orphan cache rows and signals the caller to provision the persona afresh. The
 * profile must go first: it owns the unique email that would otherwise block
 * provisionOne's `profile.create`. The persona row is recreated by the upsert.
 */
async function authUserIsMissing(
  authUserId: string,
  tenantId: string,
  personaType: DemoPersonaType,
): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin.auth.admin.getUserById(authUserId)
  if (data?.user) return false

  await prisma.profile.deleteMany({ where: { id: authUserId } }).catch(() => {})
  await prisma.demoPersona
    .deleteMany({ where: { demoTenantId: tenantId, personaType } })
    .catch(() => {})
  return true
}

/**
 * Provisions every persona for a tenant.
 *
 * One failure fails the whole tenant: a tenant with three of four personas working is
 * broken in a way that is hard to diagnose from the UI. Already-ready personas are
 * reused rather than recreated, so a re-run after a transient failure does not leave
 * orphaned auth users behind. A ready persona whose auth user has been deleted is not
 * reused — it is provisioned fresh in place of the broken one.
 */
export async function provisionPersonas(tenantId: string): Promise<ProvisionTenantResult> {
  const context = await loadContext(tenantId)

  if (context.sharedPassword && !getPersonaPassword()) {
    throw new PersonaError(
      "DEMO_PERSONA_PASSWORD is not set or is shorter than the minimum. " +
        "Personas cannot be provisioned.",
    )
  }

  const specs = buildPersonaPlan({
    slug: context.slug,
    schoolId: context.schoolId,
    branchId: context.branchId,
    planKey: context.planKey,
    sharedPassword: context.sharedPassword,
    bindings: Object.fromEntries(
      DEMO_PERSONA_ORDER.map((type) => {
        const binding = context.bindings[type]
        return [
          type,
          {
            profileId: "",
            entity: binding.entity,
            entityId: binding.entityId,
          },
        ]
      }),
    ),
  })

  const missing = incompleteBindings(specs)
  if (missing.length > 0) {
    throw new PersonaError(
      `Cannot provision: no seeded entity for ${missing.map((s) => s.personaType).join(", ")}. ` +
        "Run the seed first, or the personas would sign in to empty pages.",
    )
  }

  const personas: ProvisionResult[] = []

  for (const spec of specs) {
    const existing = await prisma.demoPersona.findUnique({
      where: {
        demoTenantId_personaType: {
          demoTenantId: tenantId,
          personaType: spec.personaType,
        },
      },
      select: { isReady: true, authUserId: true, profileId: true, email: true },
    })

    if (existing?.isReady && existing.authUserId) {
      // A ready persona is only reusable if its auth user still exists. The demo_persona
      // row is the only thing that survives a purge failure or an operator deleting the
      // user, and reusing a persona whose auth user is gone produces exactly the failure
      // this module exists to prevent: a portal that looks provisioned and breaks on the
      // first click. Check GoTrue, and fall through to fresh provisioning if the user
      // vanished. The auth user's profile rows are recreated by provisionOne.
      const stale = await authUserIsMissing(existing.authUserId, tenantId, spec.personaType)
      if (!stale) {
        personas.push({
          personaType: spec.personaType,
          email: existing.email,
          profileId: existing.profileId ?? "",
          isReady: true,
          created: false,
        })
        continue
      }
    }

    personas.push(await provisionOne(spec, context))
  }

  return {
    tenantId,
    slug: context.slug,
    sharedPassword: context.sharedPassword,
    personas,
  }
}

/**
 * Deletes every persona's auth user and profile, and restores the domain rows.
 *
 * Used by the purge path and by the failure handler. Auth users are removed first and
 * matter most: a surviving auth user whose profile is gone reads as "signed in but
 * broken" on the next attempt, and `authUserId` is globally unique so a leftover would
 * also block the slug's next tenant from provisioning.
 */
export async function deprovisionPersonas(tenantId: string): Promise<number> {
  const personas = await prisma.demoPersona.findMany({
    where: { demoTenantId: tenantId },
    select: { id: true, authUserId: true, profileId: true },
  })

  if (personas.length === 0) return 0

  const admin = createAdminClient()
  const context = await loadContext(tenantId).catch(() => null)

  for (const persona of personas) {
    if (persona.authUserId) {
      await admin.auth.admin.deleteUser(persona.authUserId).catch(() => {})
    }
    if (persona.profileId) {
      await prisma.profile.deleteMany({ where: { id: persona.profileId } }).catch(() => {})
    }
  }

  if (context) {
    for (const binding of Object.values(context.bindings)) {
      await binding.restore()
    }
  }

  await prisma.demoPersona.deleteMany({ where: { demoTenantId: tenantId } })

  return personas.length
}
