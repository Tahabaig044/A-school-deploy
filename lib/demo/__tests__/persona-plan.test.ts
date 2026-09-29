import { describe, expect, it } from "vitest"

import { DEMO_PERSONA_ORDER, DEMO_PERSONA_TYPE } from "@/lib/demo/constants"
import { PLAN_CATALOG, PLAN_KEY } from "@/lib/demo/plans"
import {
  PERSONA_ROLE,
  buildPersonaPlan,
  incompleteBindings,
  personaEmail,
  personaUserMetadata,
  planUsesSharedPassword,
  type PersonaBinding,
} from "@/lib/demo/persona-plan"

const SLUG = "d7k2m9"

const binding = (entity: PersonaBinding["entity"] = "TEACHER"): PersonaBinding => ({
  profileId: "",
  entity,
  entityId: entity === "NONE" ? null : "11111111-1111-1111-1111-111111111111",
})

const plan = (overrides: Partial<Parameters<typeof buildPersonaPlan>[0]> = {}) =>
  buildPersonaPlan({
    slug: SLUG,
    schoolId: "22222222-2222-2222-2222-222222222222",
    branchId: null,
    planKey: PLAN_KEY.DEMO,
    sharedPassword: true,
    bindings: {
      ADMIN: binding("NONE"),
      TEACHER: binding("TEACHER"),
      STUDENT: binding("STUDENT"),
      PARENT: binding("PARENT"),
    },
    ...overrides,
  })

describe("personaEmail", () => {
  it("uses the +slug sub-address form from plan §11.2", () => {
    expect(personaEmail(DEMO_PERSONA_TYPE.ADMIN, SLUG)).toBe("admin+d7k2m9@demo.invalid")
    expect(personaEmail(DEMO_PERSONA_TYPE.STUDENT, SLUG)).toBe("student+d7k2m9@demo.invalid")
  })

  it("lowercases the slug so the address is canonical", () => {
    expect(personaEmail(DEMO_PERSONA_TYPE.ADMIN, "D7K2M9")).toBe("admin+d7k2m9@demo.invalid")
  })

  it("never produces a deliverable address", () => {
    for (const type of DEMO_PERSONA_ORDER) {
      expect(personaEmail(type, SLUG)).toMatch(/@demo\.invalid$/)
    }
  })
})

describe("buildPersonaPlan", () => {
  it("returns one spec per persona, in switcher order", () => {
    const specs = plan()
    expect(specs.map((s) => s.personaType)).toEqual([...DEMO_PERSONA_ORDER])
  })

  it("assigns each persona a distinct email", () => {
    const emails = plan().map((s) => s.email)
    expect(new Set(emails).size).toBe(DEMO_PERSONA_ORDER.length)
  })

  it("separates two tenants' persona emails", () => {
    const a = plan({ slug: "aaaaaa" }).map((s) => s.email)
    const b = plan({ slug: "bbbbbb" }).map((s) => s.email)
    for (const email of a) expect(b).not.toContain(email)
  })

  it("maps personas to the roles proxy.ts expects", () => {
    // proxy.ts redirects TEACHER off /dashboard, so getting this wrong strands the
    // persona in a redirect loop.
    const byType = Object.fromEntries(plan().map((s) => [s.personaType, s.role]))
    expect(byType.ADMIN).toBe("SCHOOL_ADMIN")
    expect(byType.TEACHER).toBe("TEACHER")
    expect(byType.STUDENT).toBe("STUDENT")
    expect(byType.PARENT).toBe("PARENT")
  })

  it("gives every persona a label and a description for the switcher", () => {
    for (const spec of plan()) {
      expect(spec.label.length).toBeGreaterThan(0)
      expect(spec.description.length).toBeGreaterThan(0)
    }
  })

  it("carries the resolved entity id through to the binding", () => {
    const specs = plan()
    expect(specs.find((s) => s.personaType === DEMO_PERSONA_TYPE.TEACHER)?.binding.entityId).toBe(
      "11111111-1111-1111-1111-111111111111",
    )
    expect(specs.find((s) => s.personaType === DEMO_PERSONA_TYPE.ADMIN)?.binding.entityId).toBe(
      null,
    )
  })

  it("is deterministic for identical input", () => {
    expect(plan()).toEqual(plan())
  })
})

describe("incompleteBindings", () => {
  it("passes when every bound persona has a seeded entity", () => {
    expect(incompleteBindings(plan())).toEqual([])
  })

  it("flags a persona whose entity is missing", () => {
    const specs = plan({
      bindings: {
        ADMIN: binding("NONE"),
        TEACHER: { profileId: "", entity: "TEACHER", entityId: null },
        STUDENT: binding("STUDENT"),
        PARENT: binding("PARENT"),
      },
    })
    expect(incompleteBindings(specs).map((s) => s.personaType)).toEqual(["TEACHER"])
  })

  it("does not flag the admin, which legitimately has no entity", () => {
    const specs = plan({
      bindings: {
        ADMIN: { profileId: "", entity: "NONE", entityId: null },
        TEACHER: binding("TEACHER"),
        STUDENT: binding("STUDENT"),
        PARENT: binding("PARENT"),
      },
    })
    expect(incompleteBindings(specs)).toEqual([])
  })

  it("flags every bound persona at once, so one message lists them all", () => {
    const none = { profileId: "", entity: "TEACHER" as const, entityId: null }
    const specs = plan({
      bindings: {
        ADMIN: binding("NONE"),
        TEACHER: none,
        STUDENT: { profileId: "", entity: "STUDENT", entityId: null },
        PARENT: { profileId: "", entity: "PARENT", entityId: null },
      },
    })
    expect(incompleteBindings(specs)).toHaveLength(3)
  })
})

describe("planUsesSharedPassword", () => {
  it("shares a password on the public demo and basic trial", () => {
    // The shared password is shown once on /demo. That is only acceptable because the
    // tenant is fictional, read-mostly, and purged (plan §12.3).
    expect(planUsesSharedPassword(PLAN_KEY.DEMO)).toBe(true)
    expect(planUsesSharedPassword(PLAN_KEY.TRIAL_BASIC)).toBe(true)
  })

  it("never shares a password on TRIAL_PRO", () => {
    // TRIAL_PRO prospects get real, individually-provisioned accounts. Sharing one
    // password there would be a security regression.
    expect(planUsesSharedPassword(PLAN_KEY.TRIAL_PRO)).toBe(false)
  })

  it("never shares a password on the internal plan", () => {
    expect(planUsesSharedPassword(PLAN_KEY.INTERNAL)).toBe(false)
  })

  it("agrees with the catalog on which plans are public", () => {
    // A non-public plan must never inherit the public demo's shared password, since it
    // is not covered by the published-password expectation.
    for (const definition of PLAN_CATALOG) {
      if (definition.isPublic) continue
      expect(planUsesSharedPassword(definition.key)).toBe(false)
    }
  })
})

describe("personaUserMetadata", () => {
  const spec = plan()[0]!
  const context = {
    slug: SLUG,
    schoolId: "22222222-2222-2222-2222-222222222222",
    branchId: null,
    planKey: PLAN_KEY.DEMO,
    sharedPassword: true,
  }

  it("includes the role proxy.ts reads for its coarse redirects", () => {
    expect(personaUserMetadata(spec, context).role).toBe(PERSONA_ROLE.ADMIN)
  })

  it("includes the school and demo slug the demo banner depends on", () => {
    const metadata = personaUserMetadata(spec, context)
    expect(metadata.school_id).toBe(context.schoolId)
    expect(metadata.demo_slug).toBe(SLUG)
  })

  it("sends an empty branch_id rather than omitting it for a single campus", () => {
    expect(personaUserMetadata(spec, context).branch_id).toBe("")
  })

  it("sends the real branch id when there is one", () => {
    const metadata = personaUserMetadata(spec, { ...context, branchId: "branch-id" })
    expect(metadata.branch_id).toBe("branch-id")
  })

  it("records the persona type so the banner can label the session", () => {
    expect(personaUserMetadata(spec, context).demo_persona).toBe("ADMIN")
  })

  it("marks a shared password as shared, so the UI can say so", () => {
    expect(personaUserMetadata(spec, context).demo_shared_password).toBe(true)
    expect(
      personaUserMetadata(spec, { ...context, sharedPassword: false }).demo_shared_password,
    ).toBe(false)
  })

  it("never contains a password", () => {
    const metadata = personaUserMetadata(spec, context)
    for (const value of Object.values(metadata)) {
      expect(String(value)).not.toMatch(/password|secret|token/i)
    }
    // The key is the only place the word appears, and its value is a boolean.
    expect(Object.keys(metadata)).toContain("demo_shared_password")
    expect(typeof metadata.demo_shared_password).toBe("boolean")
  })
})
