import { describe, expect, it } from "vitest"

import {
  IllegalDemoTransitionError,
  assertTransition,
  canTransition,
  clampProgress,
  effectiveStatus,
  isActiveStatus,
  isDeadStatus,
  isFinalStatus,
  isPastExpiry,
  isPurgeOnly,
  isUsableStatus,
  monotonicProgress,
  nextSeedStatus,
  sanitizeSeedError,
  shouldAutoPurge,
} from "../lifecycle"
import {
  DEAD_DEMO_STATUSES,
  DEMO_SEED_STATUS,
  DEMO_STATUS,
  DEMO_TRANSITIONS,
  type DemoSeedStatus,
  type DemoStatus,
} from "../constants"

const ALL: DemoStatus[] = Object.values(DEMO_STATUS) as DemoStatus[]

describe("canTransition", () => {
  it("agrees exactly with the declared transition table", () => {
    for (const from of ALL) {
      const declared = DEMO_TRANSITIONS[from] ?? []
      for (const to of ALL) {
        expect(canTransition(from, to), `${from} -> ${to}`).toBe(declared.includes(to))
      }
    }
  })

  it("never declares a target outside the known status set", () => {
    for (const targets of Object.values(DEMO_TRANSITIONS)) {
      for (const target of targets) {
        expect(ALL).toContain(target)
      }
    }
  })

  it("declares no self-transitions in the table", () => {
    for (const [from, targets] of Object.entries(DEMO_TRANSITIONS)) {
      expect(targets, from).not.toContain(from)
    }
  })

  it("permits the documented happy path", () => {
    expect(canTransition(DEMO_STATUS.REQUESTED, DEMO_STATUS.PROVISIONING)).toBe(true)
    expect(canTransition(DEMO_STATUS.PROVISIONING, DEMO_STATUS.SEEDING)).toBe(true)
    expect(canTransition(DEMO_STATUS.SEEDING, DEMO_STATUS.READY)).toBe(true)
  })

  it("refuses every self-transition", () => {
    for (const status of ALL) {
      expect(canTransition(status, status)).toBe(false)
    }
  })

  it("refuses to move a dead tenant anywhere but PURGED", () => {
    for (const status of DEAD_DEMO_STATUSES) {
      if (isFinalStatus(status)) continue
      for (const to of ALL) {
        if (to === DEMO_STATUS.PURGED) continue
        expect(canTransition(status, to)).toBe(false)
      }
    }
  })

  it("refuses anything at all out of the final status", () => {
    for (const to of ALL) {
      expect(canTransition(DEMO_STATUS.PURGED, to)).toBe(false)
    }
  })

  it("refuses to send a READY tenant back into seeding", () => {
    for (const to of [DEMO_STATUS.SEEDING, DEMO_STATUS.PROVISIONING, DEMO_STATUS.REQUESTED]) {
      expect(canTransition(DEMO_STATUS.READY, to)).toBe(false)
    }
  })

  it("refuses to skip SEEDING and jump from REQUESTED to READY", () => {
    expect(canTransition(DEMO_STATUS.REQUESTED, DEMO_STATUS.READY)).toBe(false)
  })

  it("refuses to expire a tenant that was never ready", () => {
    expect(canTransition(DEMO_STATUS.PROVISIONING, DEMO_STATUS.EXPIRED)).toBe(false)
  })

  it("returns false for an unknown status rather than throwing", () => {
    expect(canTransition("NOPE" as DemoStatus, DEMO_STATUS.READY)).toBe(false)
  })
})

describe("assertTransition", () => {
  it("is silent for a legal transition", () => {
    expect(() => assertTransition(DEMO_STATUS.SEEDING, DEMO_STATUS.READY)).not.toThrow()
  })

  it("throws IllegalDemoTransitionError for an illegal one", () => {
    expect(() => assertTransition(DEMO_STATUS.PURGED, DEMO_STATUS.READY)).toThrow(
      IllegalDemoTransitionError,
    )
  })

  it("carries both statuses on the error", () => {
    try {
      assertTransition(DEMO_STATUS.READY, DEMO_STATUS.SEEDING)
      expect.unreachable("should have thrown")
    } catch (error) {
      expect(error).toBeInstanceOf(IllegalDemoTransitionError)
      const typed = error as IllegalDemoTransitionError
      expect(typed.from).toBe(DEMO_STATUS.READY)
      expect(typed.to).toBe(DEMO_STATUS.SEEDING)
    }
  })

  it("names the allowed targets so a developer does not have to grep", () => {
    try {
      assertTransition(DEMO_STATUS.REQUESTED, DEMO_STATUS.READY)
      expect.unreachable("should have thrown")
    } catch (error) {
      expect((error as Error).message).toContain("PROVISIONING")
    }
  })

  it("says so plainly when the source is final", () => {
    try {
      assertTransition(DEMO_STATUS.PURGED, DEMO_STATUS.READY)
      expect.unreachable("should have thrown")
    } catch (error) {
      expect((error as Error).message).toContain("is final")
    }
  })
})

describe("status predicates", () => {
  it("treats only READY as usable", () => {
    for (const status of ALL) {
      expect(isUsableStatus(status)).toBe(status === DEMO_STATUS.READY)
    }
  })

  it("never treats EXPIRED as usable", () => {
    expect(isUsableStatus(DEMO_STATUS.EXPIRED)).toBe(false)
  })

  it("counts in-flight and READY tenants as active", () => {
    expect(isActiveStatus(DEMO_STATUS.REQUESTED)).toBe(true)
    expect(isActiveStatus(DEMO_STATUS.SEEDING)).toBe(true)
    expect(isActiveStatus(DEMO_STATUS.READY)).toBe(true)
    expect(isActiveStatus(DEMO_STATUS.EXPIRED)).toBe(false)
    expect(isActiveStatus(DEMO_STATUS.FAILED)).toBe(false)
  })

  it("recognises the final status", () => {
    expect(isFinalStatus(DEMO_STATUS.PURGED)).toBe(true)
    for (const status of ALL) {
      if (status === DEMO_STATUS.PURGED) continue
      expect(isFinalStatus(status)).toBe(false)
    }
  })

  it("recognises dead statuses", () => {
    for (const status of DEAD_DEMO_STATUSES) {
      expect(isDeadStatus(status)).toBe(true)
    }
    expect(isDeadStatus(DEMO_STATUS.READY)).toBe(false)
  })

  it("marks FAILED and REVOKED as purge-only but not PURGED itself", () => {
    expect(isPurgeOnly(DEMO_STATUS.FAILED)).toBe(true)
    expect(isPurgeOnly(DEMO_STATUS.REVOKED)).toBe(true)
    expect(isPurgeOnly(DEMO_STATUS.PURGED)).toBe(false)
    expect(isPurgeOnly(DEMO_STATUS.READY)).toBe(false)
  })
})

describe("isPastExpiry", () => {
  const now = new Date("2026-01-01T12:00:00.000Z")

  it("is true at the exact expiry instant", () => {
    expect(isPastExpiry(now, now)).toBe(true)
  })

  it("is false one millisecond before expiry", () => {
    expect(isPastExpiry(new Date(now.getTime() + 1), now)).toBe(false)
  })

  it("is true one millisecond after expiry", () => {
    expect(isPastExpiry(new Date(now.getTime() - 1), now)).toBe(true)
  })
})

describe("effectiveStatus", () => {
  const now = new Date("2026-01-01T12:00:00.000Z")
  const past = new Date("2025-12-31T12:00:00.000Z")
  const future = new Date("2026-01-02T12:00:00.000Z")

  it("reports EXPIRED for a READY tenant past its clock", () => {
    expect(effectiveStatus(DEMO_STATUS.READY, past, now)).toBe(DEMO_STATUS.EXPIRED)
  })

  it("reports READY for a READY tenant still in time", () => {
    expect(effectiveStatus(DEMO_STATUS.READY, future, now)).toBe(DEMO_STATUS.READY)
  })

  it("leaves a non-READY status alone regardless of the clock", () => {
    expect(effectiveStatus(DEMO_STATUS.SEEDING, past, now)).toBe(DEMO_STATUS.SEEDING)
    expect(effectiveStatus(DEMO_STATUS.FAILED, past, now)).toBe(DEMO_STATUS.FAILED)
    expect(effectiveStatus(DEMO_STATUS.PURGED, past, now)).toBe(DEMO_STATUS.PURGED)
  })

  it("does not resurrect a dead tenant just because the clock says otherwise", () => {
    expect(effectiveStatus(DEMO_STATUS.REVOKED, future, now)).toBe(DEMO_STATUS.REVOKED)
  })
})

describe("nextSeedStatus", () => {
  const all: DemoSeedStatus[] = Object.values(DEMO_SEED_STATUS) as DemoSeedStatus[]

  it("returns null when the status already matches", () => {
    expect(nextSeedStatus(DEMO_SEED_STATUS.COMPLETED, "completed")).toBeNull()
    expect(nextSeedStatus(DEMO_SEED_STATUS.FAILED, "failed")).toBeNull()
    expect(nextSeedStatus(DEMO_SEED_STATUS.SKIPPED, "skipped")).toBeNull()
  })

  it("maps each outcome to its status", () => {
    expect(nextSeedStatus(DEMO_SEED_STATUS.PENDING, "completed")).toBe(DEMO_SEED_STATUS.COMPLETED)
    expect(nextSeedStatus(DEMO_SEED_STATUS.RUNNING, "failed")).toBe(DEMO_SEED_STATUS.FAILED)
    expect(nextSeedStatus(DEMO_SEED_STATUS.RUNNING, "skipped")).toBe(DEMO_SEED_STATUS.SKIPPED)
  })

  it("changes the status from any other value", () => {
    for (const current of all) {
      if (current === DEMO_SEED_STATUS.COMPLETED) continue
      expect(nextSeedStatus(current, "completed")).toBe(DEMO_SEED_STATUS.COMPLETED)
    }
  })
})

describe("clampProgress", () => {
  it("clamps to the 0..100 range", () => {
    expect(clampProgress(-5)).toBe(0)
    expect(clampProgress(0)).toBe(0)
    expect(clampProgress(55)).toBe(55)
    expect(clampProgress(100)).toBe(100)
    expect(clampProgress(101)).toBe(100)
    expect(clampProgress(1000)).toBe(100)
  })

  it("rounds fractional values", () => {
    expect(clampProgress(45.4)).toBe(45)
    expect(clampProgress(45.6)).toBe(46)
  })

  it("handles non-finite input without producing NaN", () => {
    expect(clampProgress(Number.NaN)).toBe(0)
    expect(clampProgress(Number.POSITIVE_INFINITY)).toBe(100)
    expect(clampProgress(Number.NEGATIVE_INFINITY)).toBe(0)
  })
})

describe("monotonicProgress", () => {
  it("allows forward movement", () => {
    expect(monotonicProgress(10, 20)).toBe(20)
  })

  it("refuses to move backwards", () => {
    expect(monotonicProgress(50, 20)).toBe(50)
  })

  it("is a no-op for an equal value", () => {
    expect(monotonicProgress(50, 50)).toBe(50)
  })

  it("clamps both sides", () => {
    expect(monotonicProgress(0, 500)).toBe(100)
    expect(monotonicProgress(100, -5)).toBe(100)
  })
})

describe("sanitizeSeedError", () => {
  it("returns null for empty input", () => {
    expect(sanitizeSeedError(null)).toBeNull()
    expect(sanitizeSeedError(undefined)).toBeNull()
  })

  it("keeps a plain message", () => {
    expect(sanitizeSeedError(new Error("relation does not exist"))).toContain(
      "relation does not exist",
    )
  })

  it("accepts a string", () => {
    expect(sanitizeSeedError("boom")).toBe("boom")
  })

  it("stringifies a non-Error object", () => {
    const out = sanitizeSeedError({ code: "P2002", detail: "unique failed" })
    expect(out).toContain("P2002")
    expect(out).toContain("unique failed")
  })

  it("stringifies a number", () => {
    expect(sanitizeSeedError(42)).toBe("42")
  })

  it("returns null for a value that stringifies to nothing", () => {
    // `JSON.stringify(() => {})` is undefined, which must not become the
    // literal string "undefined" in the seedError column.
    expect(sanitizeSeedError(() => {})).toBeNull()
    expect(sanitizeSeedError(Symbol("s"))).toBeNull()
  })

  it("redacts a secret nested inside an object payload", () => {
    const out = sanitizeSeedError({ config: { password: "hunter2" } })
    expect(out).not.toContain("hunter2")
  })

  it("falls back to the message when an Error has no stack", () => {
    const bare = new Error("stackless failure")
    bare.stack = undefined
    expect(sanitizeSeedError(bare)).toBe("stackless failure")
  })

  it("redacts a postgres connection string", () => {
    const out = sanitizeSeedError(
      new Error("failed: postgresql://postgres.abc:PASSWORD@pooler.supabase.com:6543/postgres"),
    )
    expect(out).not.toContain("PASSWORD")
    expect(out).toContain("[redacted-connection-string]")
  })

  it("redacts a service-role-style key", () => {
    const out = sanitizeSeedError(new Error("auth failed for sb_secret_abcdef123456"))
    expect(out).not.toContain("sb_secret_abcdef123456")
    expect(out).toContain("[redacted-secret]")
  })

  it("redacts a JWT", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiU0NIT0xMX0FETUlOIiwiaWF0IjoxNzAwMDAwMDAwfQ.abc123"
    const out = sanitizeSeedError(new Error(`token ${jwt} rejected`))
    expect(out).not.toContain(jwt)
  })

  it("redacts a password assignment", () => {
    const out = sanitizeSeedError(new Error("config password=hunter2 rejected"))
    expect(out).not.toContain("hunter2")
  })

  it("truncates to the configured cap", () => {
    const out = sanitizeSeedError("x".repeat(5000))
    expect(out).toHaveLength(500)
  })

  it("never returns an over-long string even for a huge stack", () => {
    const out = sanitizeSeedError(new Error("y".repeat(10_000)))
    expect(out!.length).toBeLessThanOrEqual(500)
  })
})

describe("shouldAutoPurge", () => {
  it("is false below the attempt cap", () => {
    expect(shouldAutoPurge(0, DEMO_STATUS.FAILED)).toBe(false)
    expect(shouldAutoPurge(1, DEMO_STATUS.FAILED)).toBe(false)
  })

  it("is true at the attempt cap", () => {
    expect(shouldAutoPurge(2, DEMO_STATUS.FAILED)).toBe(true)
    expect(shouldAutoPurge(5, DEMO_STATUS.FAILED)).toBe(true)
  })

  it("never purges an already-purged tenant", () => {
    expect(shouldAutoPurge(99, DEMO_STATUS.PURGED)).toBe(false)
  })
})
