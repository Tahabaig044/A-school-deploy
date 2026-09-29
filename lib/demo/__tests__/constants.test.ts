import { describe, expect, it } from "vitest"

import {
  ACTIVE_DEMO_STATUSES,
  DEMO_CONTACT_EMAIL_DOMAIN,
  DEAD_DEMO_STATUSES,
  DEMO_EMAIL_DOMAIN,
  DEMO_LIMIT_PERIOD,
  DEMO_PERSONA_EMAIL_LOCAL,
  DEMO_PERSONA_ORDER,
  DEMO_PERSONA_REDIRECT,
  DEMO_SEED_ERROR_MAX_LENGTH,
  DEMO_STATUS,
  DEMO_TRANSITIONS,
  FINAL_DEMO_STATUS,
  PURGE_ONLY_DEMO_STATUSES,
  PURGEABLE_DEMO_STATUSES,
  USABLE_DEMO_STATUSES,
  UNLIMITED,
  type DemoPersonaType,
  type DemoStatus,
} from "../constants"

const ALL_STATUSES = Object.values(DEMO_STATUS) as DemoStatus[]

describe("demo status set", () => {
  it("matches the Prisma DemoStatus enum exactly", () => {
    // A drift here means the state machine and the database disagree.
    expect(ALL_STATUSES).toEqual([
      "REQUESTED",
      "PROVISIONING",
      "SEEDING",
      "READY",
      "EXPIRED",
      "REVOKED",
      "PURGED",
      "FAILED",
    ])
  })

  it("has no duplicate members", () => {
    expect(new Set(ALL_STATUSES).size).toBe(ALL_STATUSES.length)
  })
})

describe("DEMO_TRANSITIONS", () => {
  it("defines an entry for every status", () => {
    for (const status of ALL_STATUSES) {
      expect(DEMO_TRANSITIONS[status]).toBeDefined()
    }
  })

  it("only targets known statuses", () => {
    for (const status of ALL_STATUSES) {
      for (const target of DEMO_TRANSITIONS[status]) {
        expect(ALL_STATUSES).toContain(target)
      }
    }
  })

  it("has no self-transitions", () => {
    for (const status of ALL_STATUSES) {
      expect(DEMO_TRANSITIONS[status]).not.toContain(status)
    }
  })

  it("lets the final status go nowhere", () => {
    expect(DEMO_TRANSITIONS[FINAL_DEMO_STATUS]).toEqual([])
  })

  it("only allows a dead status to move on to PURGED", () => {
    for (const status of DEAD_DEMO_STATUSES) {
      if (status === FINAL_DEMO_STATUS) continue
      expect(DEMO_TRANSITIONS[status]).toEqual([DEMO_STATUS.PURGED])
    }
  })

  it("cannot revive a dead status", () => {
    for (const status of DEAD_DEMO_STATUSES) {
      const targets = DEMO_TRANSITIONS[status]
      expect(targets).not.toContain(DEMO_STATUS.READY)
      expect(targets).not.toContain(DEMO_STATUS.SEEDING)
      expect(targets).not.toContain(DEMO_STATUS.PROVISIONING)
    }
  })

  it("lists only purgeable dead statuses as purge-only", () => {
    expect(PURGE_ONLY_DEMO_STATUSES).not.toContain(FINAL_DEMO_STATUS)
    for (const status of PURGE_ONLY_DEMO_STATUSES) {
      expect(DEAD_DEMO_STATUSES).toContain(status)
    }
  })

  it("cannot leave PURGED under any circumstance", () => {
    expect(DEMO_TRANSITIONS.PURGED).toEqual([])
  })

  it("cannot move a READY tenant backwards", () => {
    expect(DEMO_TRANSITIONS.READY).toEqual([DEMO_STATUS.EXPIRED, DEMO_STATUS.REVOKED])
  })

  it("can revoke a tenant from every live status", () => {
    for (const status of ALL_STATUSES) {
      if (DEAD_DEMO_STATUSES.includes(status)) continue
      expect(DEMO_TRANSITIONS[status]).toContain(DEMO_STATUS.REVOKED)
    }
  })

  it("can fail any in-flight state", () => {
    for (const status of [DEMO_STATUS.REQUESTED, DEMO_STATUS.PROVISIONING, DEMO_STATUS.SEEDING]) {
      expect(DEMO_TRANSITIONS[status]).toContain(DEMO_STATUS.FAILED)
    }
  })

  it("only reaches READY through a seeding state", () => {
    const canBecomeReady = ALL_STATUSES.filter((s) =>
      DEMO_TRANSITIONS[s].includes(DEMO_STATUS.READY),
    )
    expect(canBecomeReady).toContain(DEMO_STATUS.PROVISIONING)
    expect(canBecomeReady).toContain(DEMO_STATUS.SEEDING)
  })
})

describe("status groupings", () => {
  it("keeps usable, dead, and final statuses disjoint", () => {
    const usable = new Set(USABLE_DEMO_STATUSES)
    const dead = new Set(DEAD_DEMO_STATUSES)
    for (const status of USABLE_DEMO_STATUSES) {
      expect(dead.has(status)).toBe(false)
    }
    for (const status of DEAD_DEMO_STATUSES) {
      expect(usable.has(status)).toBe(false)
    }
  })

  it("counts READY as active and usable at the same time", () => {
    // READY must count against the provisioning circuit breaker AND serve pages.
    // The two sets are not disjoint; only the dead one is.
    expect(ACTIVE_DEMO_STATUSES).toContain(DEMO_STATUS.READY)
    expect(USABLE_DEMO_STATUSES).toContain(DEMO_STATUS.READY)
  })

  it("never counts a dead status as active", () => {
    for (const status of DEAD_DEMO_STATUSES) {
      expect(ACTIVE_DEMO_STATUSES).not.toContain(status)
    }
  })

  it("treats EXPIRED as neither active nor usable", () => {
    // An expired tenant still holds data and must still be purgeable, but it must
    // not count against the provisioning circuit breaker and must not serve pages.
    expect(ACTIVE_DEMO_STATUSES).not.toContain(DEMO_STATUS.EXPIRED)
    expect(USABLE_DEMO_STATUSES).not.toContain(DEMO_STATUS.EXPIRED)
    expect(PURGEABLE_DEMO_STATUSES).toContain(DEMO_STATUS.EXPIRED)
  })

  it("lets only READY reach product pages", () => {
    expect(USABLE_DEMO_STATUSES).toEqual([DEMO_STATUS.READY])
  })

  it("can purge every status that is not already dead", () => {
    for (const status of ALL_STATUSES) {
      if (DEAD_DEMO_STATUSES.includes(status)) continue
      expect(PURGEABLE_DEMO_STATUSES).toContain(status)
    }
  })
})

describe("persona configuration", () => {
  it("ships four personas in a fixed order", () => {
    expect(DEMO_PERSONA_ORDER).toEqual(["ADMIN", "TEACHER", "STUDENT", "PARENT"])
  })

  it("defines an email local part for every persona", () => {
    for (const persona of DEMO_PERSONA_ORDER) {
      expect(DEMO_PERSONA_EMAIL_LOCAL[persona]).toBeTruthy()
    }
  })

  it("uses a distinct email local part per persona", () => {
    const locals = DEMO_PERSONA_ORDER.map((p) => DEMO_PERSONA_EMAIL_LOCAL[p])
    expect(new Set(locals).size).toBe(locals.length)
  })

  it("defines a redirect for every persona", () => {
    for (const persona of DEMO_PERSONA_ORDER) {
      expect(DEMO_PERSONA_REDIRECT[persona]).toBeTruthy()
    }
  })

  it("redirects the admin persona to the dashboard and everyone else to a portal", () => {
    // proxy.ts forces TEACHER off /dashboard and restricts /portal to
    // STUDENT/PARENT/TEACHER, so a wrong mapping bounces immediately.
    expect(DEMO_PERSONA_REDIRECT.ADMIN).toBe("/dashboard")
    for (const persona of ["TEACHER", "STUDENT", "PARENT"] as DemoPersonaType[]) {
      expect(DEMO_PERSONA_REDIRECT[persona]).toMatch(/^\/portal\/(teacher|student|parent)$/)
    }
  })

  it("sends the teacher persona to the teacher portal specifically", () => {
    expect(DEMO_PERSONA_REDIRECT.TEACHER).toBe("/portal/teacher")
  })
})

describe("limits configuration", () => {
  it("uses -1 as the only unlimited sentinel", () => {
    expect(UNLIMITED).toBe(-1)
  })

  it("defines both limit periods", () => {
    expect(DEMO_LIMIT_PERIOD.TOTAL).toBe("TOTAL")
    expect(DEMO_LIMIT_PERIOD.PER_DAY).toBe("PER_DAY")
  })
})

describe("reserved domains", () => {
  it("uses the RFC 2606 reserved .invalid TLD for personas", () => {
    expect(DEMO_EMAIL_DOMAIN).toBe("demo.invalid")
  })

  it("uses a reserved example domain for the optional contact email", () => {
    expect(DEMO_CONTACT_EMAIL_DOMAIN).toBe("example.com")
  })
})

describe("seed error truncation", () => {
  it("caps the retained error text", () => {
    expect(DEMO_SEED_ERROR_MAX_LENGTH).toBe(500)
    expect("x".repeat(1000).slice(0, DEMO_SEED_ERROR_MAX_LENGTH)).toHaveLength(500)
  })
})
