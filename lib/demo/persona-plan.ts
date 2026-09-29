/**
 * Pure persona plan: turns a seeded tenant into the four account specifications the
 * provisioner needs.
 *
 * Split out from `personas.ts` for the same reason `lifecycle.ts` is separate from
 * `transition.ts`: `personas.ts` calls Supabase Auth and Prisma, and the interesting
 * logic here — which entity each persona binds to, what `user_metadata` must contain,
 * and what the rollback set is — is worth testing without either.
 *
 * Nothing here reads the environment. The shared password is passed in as a fact about
 * the plan (`sharedPassword: boolean`) rather than imported, so a test can assert the
 * TRIAL_PRO rules without setting a password in the process environment.
 */

import { DEMO_PERSONA_TYPE, type DemoPersonaType } from "@/lib/demo/constants"
import { DEMO_EMAIL_DOMAIN } from "@/lib/demo/constants"
import { PLAN_KEY, type PlanKey } from "@/lib/demo/plans"

/**
 * Plans whose personas share one published password.
 *
 * `TRIAL_PRO` is absent on purpose. It is not publicly selectable and its personas are
 * provisioned individually with per-user passwords (plan §12.3), so a shared secret
 * there would be a security regression rather than a convenience. Lives here rather
 * than in `personas.ts` so the rule is testable without a service-role key.
 */
const SHARED_PASSWORD_PLANS: readonly PlanKey[] = [PLAN_KEY.DEMO, PLAN_KEY.TRIAL_BASIC]

export function planUsesSharedPassword(planKey: PlanKey): boolean {
  return SHARED_PASSWORD_PLANS.includes(planKey)
}

/** Email local part per persona, so a tenant's four addresses read as related. */
const PERSONA_EMAIL_LOCAL: Record<DemoPersonaType, string> = {
  ADMIN: "admin",
  TEACHER: "teacher",
  STUDENT: "student",
  PARENT: "parent",
}

/** The `Role` written to both `Profile.role` and `auth` `user_metadata.role`. */
export const PERSONA_ROLE = {
  ADMIN: "SCHOOL_ADMIN",
  TEACHER: "TEACHER",
  STUDENT: "STUDENT",
  PARENT: "PARENT",
} as const satisfies Record<DemoPersonaType, string>

export type PersonaRole = (typeof PERSONA_ROLE)[DemoPersonaType]

/** What a persona's `DemoPersona` row shows on the switcher. */
export const PERSONA_LABEL: Record<DemoPersonaType, string> = {
  ADMIN: "School Administrator",
  TEACHER: "Teacher",
  STUDENT: "Student",
  PARENT: "Parent",
}

export const PERSONA_DESCRIPTION: Record<DemoPersonaType, string> = {
  ADMIN: "Full school access: people, finance, settings, and reports.",
  TEACHER: "Own classes, timetables, attendance marking, and grading.",
  STUDENT: "Own timetable, attendance, results, and fee history.",
  PARENT: "Own children: attendance, results, fees, and announcements.",
}

/** The seeded entity a persona binds to, or `null` for the admin. */
export type PersonaBinding = {
  /**
   * `Profile.id` is the auth user's id, so these must be the ids the seed created for
   * the linked entity. `null` for the admin persona, which needs no domain row.
   */
  profileId: string
  /** Entity kind, used to pick the create path and the rollback. */
  entity: "NONE" | "TEACHER" | "STUDENT" | "PARENT"
  /** `Teacher.id` / `Student.id` / `Parent.id` the profile is linked from. */
  entityId: string | null
}

/** A fully-resolved specification for one persona. */
export type PersonaSpec = {
  personaType: DemoPersonaType
  email: string
  role: PersonaRole
  label: string
  description: string
  /** `Profile.firstName` / `lastName`, copied from the linked entity. */
  firstName: string
  lastName: string
  binding: PersonaBinding
}

export type PersonaPlanInput = {
  slug: string
  schoolId: string
  branchId: string | null
  planKey: PlanKey
  /**
   * Whether this plan shares one public password across personas. `TRIAL_PRO` does
   * not: its personas are provisioned individually with per-user passwords, which is
   * why it is not publicly selectable.
   */
  sharedPassword: boolean
  /** One pre-resolved binding per persona type. Missing entries become `null` ids. */
  bindings: Partial<Record<DemoPersonaType, PersonaBinding>>
}

/** `admin+d7k2m9@demo.invalid`, matching plan §11.2. */
export function personaEmail(personaType: DemoPersonaType, slug: string): string {
  return `${PERSONA_EMAIL_LOCAL[personaType]}+${slug.toLowerCase()}@${DEMO_EMAIL_DOMAIN}`
}

/** Placeholder names for a persona with no seeded entity behind it. */
const FALLBACK_NAMES: Record<DemoPersonaType, { first: string; last: string }> = {
  ADMIN: { first: "Demo", last: "Administrator" },
  TEACHER: { first: "Demo", last: "Teacher" },
  STUDENT: { first: "Demo", last: "Student" },
  PARENT: { first: "Demo", last: "Parent" },
}

/**
 * Resolves the four persona specs for a seeded tenant.
 *
 * Order matches `DEMO_PERSONA_ORDER`, which is the switcher's display order. Keeping
 * one source for the order matters: the switcher and the provisioner must agree on
 * which persona is "first" or the admin button moves between builds.
 */
export function buildPersonaPlan(input: PersonaPlanInput): PersonaSpec[] {
  return (Object.keys(PERSONA_ROLE) as DemoPersonaType[]).map((personaType) => {
    const supplied = input.bindings[personaType]
    const binding: PersonaBinding = supplied ?? {
      profileId: "",
      entity: "NONE",
      entityId: null,
    }

    const names = FALLBACK_NAMES[personaType]

    return {
      personaType,
      email: personaEmail(personaType, input.slug),
      role: PERSONA_ROLE[personaType],
      label: PERSONA_LABEL[personaType],
      description: PERSONA_DESCRIPTION[personaType],
      firstName: names.first,
      lastName: names.last,
      binding,
    }
  })
}

/**
 * `user_metadata` written to the auth user.
 *
 * `proxy.ts` reads `role` for its coarse redirects, and the demo banner reads
 * `demo_slug` to prove the session belongs to a demo tenant. Both are load-bearing, so
 * they are assembled here rather than at each call site.
 */
export function personaUserMetadata(
  spec: PersonaSpec,
  plan: {
    slug: string
    schoolId: string
    branchId: string | null
    planKey: PlanKey
    sharedPassword: boolean
  },
): Record<string, string | boolean> {
  return {
    role: spec.role,
    school_id: plan.schoolId,
    // `proxy.ts` and the portal scope both tolerate a null branch for a
    // single-campus school, so this is sent as an empty string rather than omitted.
    branch_id: plan.branchId ?? "",
    demo_slug: plan.slug,
    demo_persona: spec.personaType,
    // Surfaced by the demo UI to explain that this account is shared, not private.
    demo_shared_password: plan.sharedPassword,
  }
}

/**
 * Personas that need a real domain row, and whether that row is missing.
 *
 * A spec with `entity !== "NONE"` and no `entityId` cannot be provisioned: the profile
 * would exist with nothing behind it, and every portal page would render empty. That
 * is a seed defect, not a persona defect, so the provisioner reports it rather than
 * creating a hollow account.
 */
export function incompleteBindings(specs: readonly PersonaSpec[]): PersonaSpec[] {
  return specs.filter((spec) => spec.binding.entity !== "NONE" && !spec.binding.entityId)
}

export { DEMO_PERSONA_TYPE }
