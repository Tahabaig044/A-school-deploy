/**
 * Tests for the shared seed volumes.
 *
 * These exist to catch drift between the plan and the seed. The real risk is a
 * verifier that passes because it was never re-pointed at a changed number, so the
 * assertions below are about agreement between modules rather than about values.
 */

import { describe, expect, it } from "vitest"

import {
  ATTENDANCE_DAYS,
  ATTENDANCE_PRESENT_RATE,
  GRADES,
  SEED_VOLUMES,
  SECTIONS_PER_CLASS,
} from "../seed-config"
import { SUBJECT_NAMES } from "../seed-values"

describe("SEED_VOLUMES", () => {
  it("has no duplicate table entries", () => {
    const tables = SEED_VOLUMES.map((v) => v.table)
    expect(new Set(tables).size).toBe(tables.length)
  })

  it("has no duplicate labels", () => {
    const labels = SEED_VOLUMES.map((v) => v.label)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it("never has a negative tolerance or count", () => {
    for (const volume of SEED_VOLUMES) {
      expect(volume.count).toBeGreaterThanOrEqual(0)
      expect(volume.tolerance).toBeGreaterThanOrEqual(0)
    }
  })

  it("is non-empty and has labels for reports", () => {
    expect(SEED_VOLUMES.length).toBeGreaterThan(0)
    for (const volume of SEED_VOLUMES) expect(volume.label.length).toBeGreaterThan(0)
  })

  it("only allows tolerance on rows a reviewer might legitimately edit", () => {
    // Structural rows are exact: a second branch or session means the seed ran twice.
    for (const volume of SEED_VOLUMES) {
      if (
        ["school", "branch", "academicSession", "subject", "class", "section"].includes(
          volume.table,
        )
      ) {
        expect(volume.tolerance).toBe(0)
      }
    }
  })

  it("matches the plan's §17.2 figures for the DEMO plan", () => {
    const byTable = Object.fromEntries(SEED_VOLUMES.map((v) => [v.table, v.count]))
    expect(byTable.student).toBe(60)
    expect(byTable.teacher).toBe(8)
    expect(byTable.staff).toBe(12)
    expect(byTable.parent).toBe(60)
    expect(byTable.school).toBe(1)
    expect(byTable.branch).toBe(1)
  })

  it("covers every table the verifier counts", () => {
    // If a volume is added to the config without a matching count in demo-verify.ts,
    // it would be silently skipped. This lists what must be kept in step.
    const required = [
      "school",
      "branch",
      "academicSession",
      "subject",
      "class",
      "section",
      "teacher",
      "staff",
      "student",
      "parent",
      "examType",
      "homework",
      "feeStructure",
      "feeInvoice",
      "expense",
      "libraryBook",
      "idCard",
    ]
    for (const table of required) {
      expect(SEED_VOLUMES.some((v) => v.table === table)).toBe(true)
    }
  })

  it("gives the variable domains enough tolerance to not be flaky", () => {
    // A student may or may not be enrolled in a fee structure, and a book may not be
    // on loan, so these counts vary by design between runs of the same seed.
    const byTable = Object.fromEntries(SEED_VOLUMES.map((v) => [v.table, v.tolerance]))
    expect(byTable.feeInvoice).toBeGreaterThan(0)
    expect(byTable.homework).toBeGreaterThan(0)
  })

  it("keeps id cards exact, because their count follows Profile rows", () => {
    // Deliberately not tolerant. Cards are minted one per Profile, and the data seed
    // creates exactly one Profile. A wide band here would have hidden the fact that
    // the phase produces 1 card against an expected 9 — which is what the tolerance
    // was masking before Phase 5 removed the placeholder teacher Profiles.
    const byTable = Object.fromEntries(SEED_VOLUMES.map((v) => [v.table, v.tolerance]))
    expect(byTable.idCard).toBe(0)
  })

  it("keeps exact tolerance on rows that must not vary", () => {
    const byTable = Object.fromEntries(SEED_VOLUMES.map((v) => [v.table, v.tolerance]))
    for (const table of ["examType", "feeStructure", "libraryBook"]) {
      expect(byTable[table]).toBe(0)
    }
  })

  it("derives the class and section counts from the grade configuration", () => {
    // If GRADES or SECTIONS_PER_CLASS change, these two rows must change with them.
    const byTable = Object.fromEntries(SEED_VOLUMES.map((v) => [v.table, v.count]))
    expect(byTable.class).toBe(GRADES)
    expect(byTable.section).toBe(GRADES * SECTIONS_PER_CLASS)
  })

  it("does not ask for more subjects than the catalog provides", () => {
    // seed-data slices the catalog to the volume, so a larger volume would silently
    // under-fill. Better to fail loudly.
    const byTable = Object.fromEntries(SEED_VOLUMES.map((v) => [v.table, v.count]))
    expect(SUBJECT_NAMES.length).toBeGreaterThanOrEqual(byTable.subject)
  })
})

describe("attendance configuration", () => {
  it("keeps the present rate a probability", () => {
    expect(ATTENDANCE_PRESENT_RATE).toBeGreaterThan(0)
    expect(ATTENDANCE_PRESENT_RATE).toBeLessThan(1)
  })

  it("generates enough days to cover a realistic term", () => {
    expect(ATTENDANCE_DAYS).toBeGreaterThan(30)
  })
})
