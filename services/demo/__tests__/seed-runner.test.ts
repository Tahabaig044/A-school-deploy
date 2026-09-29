import { describe, expect, it } from "vitest"

import {
  inBandPhases,
  outOfBandPhases,
  progressAfter,
  resumeIndex,
  type SeedPhase,
} from "../seed-phases"

const phase = (name: string, weight: number): SeedPhase<unknown> => ({
  name,
  weight,
  run: async () => {},
})

const PHASES = [
  phase("school", 0.1),
  phase("people", 0.3),
  phase("academic", 0.3),
  phase("finance", 0.2),
  phase("library", 0.1),
]

describe("progressAfter", () => {
  // Contract: `completedCount` phases are fully done, and the *next* phase is
  // `phaseProgress` percent through. The two are additive, so measuring cumulative
  // progress means passing 0 for phaseProgress — passing 100 would count the
  // in-progress phase twice.
  const weights = [0.1, 0.3, 0.3, 0.2, 0.1]

  it("is 0 before any phase completes", () => {
    expect(progressAfter([0.5, 0.5], 0, 0)).toBe(0)
  })

  it("is 100 once every phase completes", () => {
    expect(progressAfter([0.5, 0.5], 2, 100)).toBe(100)
  })

  it("is 100 when asked past the end of the list", () => {
    expect(progressAfter(weights, weights.length, 0)).toBe(100)
    expect(progressAfter(weights, weights.length + 3, 0)).toBe(100)
  })

  it("accumulates by weight", () => {
    expect(progressAfter(weights, 1, 0)).toBe(10)
    expect(progressAfter(weights, 2, 0)).toBe(40)
    expect(progressAfter(weights, 3, 0)).toBe(70)
    expect(progressAfter(weights, 4, 0)).toBe(90)
  })

  it("interpolates within the current phase", () => {
    // Halfway through phase 2, which carries 30% of the total, starting at 10%.
    expect(progressAfter([0.1, 0.3, 0.6], 1, 50)).toBe(25)
  })

  it("is continuous across a phase boundary", () => {
    // The end of one phase must equal the start of the next, or the bar jumps.
    const endOfFirst = progressAfter(weights, 0, 100)
    const startOfSecond = progressAfter(weights, 1, 0)
    expect(endOfFirst).toBe(startOfSecond)
  })

  it("never decreases as phases complete", () => {
    let previous = 0

    for (let i = 0; i < weights.length; i++) {
      const value = progressAfter(weights, i, 0)
      expect(value).toBeGreaterThanOrEqual(previous)
      previous = value
    }
  })

  it("never exceeds 100", () => {
    for (let i = 0; i < weights.length; i++) {
      for (const within of [0, 25, 50, 100]) {
        expect(progressAfter(weights, i, within)).toBeLessThanOrEqual(100)
      }
    }
  })

  it("handles weights that do not sum to 1 by normalising", () => {
    // 2 and 6 out of 8: after the first phase the run is 25% done, not 2%.
    expect(progressAfter([2, 6], 1, 0)).toBe(25)
    expect(progressAfter([2, 6], 2, 0)).toBe(100)
  })

  it("returns 100 when there are no phases", () => {
    expect(progressAfter([], 0, 0)).toBe(100)
  })

  it("returns 100 when every weight is zero, rather than dividing by zero", () => {
    expect(progressAfter([0, 0], 1, 100)).toBe(100)
  })

  it("clamps a negative phase progress to zero", () => {
    expect(progressAfter([0.5, 0.5], 0, -20)).toBe(0)
  })

  it("clamps an over-large phase progress to 100", () => {
    expect(progressAfter([0.5, 0.5], 0, 500)).toBe(50)
  })

  it("treats a NaN phase progress as zero", () => {
    expect(progressAfter([0.5, 0.5], 0, Number.NaN)).toBe(0)
  })
})

describe("resumeIndex", () => {
  it("starts from the beginning when nothing was recorded", () => {
    expect(resumeIndex(PHASES, null)).toBe(0)
  })

  it("restarts the phase that was in progress when the run died", () => {
    // `seedStep` holds the step being run, not the last one finished, so the
    // interrupted phase must run again.
    expect(resumeIndex(PHASES, "people")).toBe(1)
  })

  it("resumes the first phase when it is the one interrupted", () => {
    expect(resumeIndex(PHASES, "school")).toBe(0)
  })

  it("restarts from zero for an unknown step", () => {
    // A renamed phase must not resume at a position that no longer means anything.
    expect(resumeIndex(PHASES, "no-such-phase")).toBe(0)
  })

  it("handles no phases at all", () => {
    expect(resumeIndex([], "school")).toBe(0)
    expect(resumeIndex([], null)).toBe(0)
  })

  it("only accepts a step from the current phase list", () => {
    expect(resumeIndex(PHASES, "library")).toBe(4)
  })
})

describe("phase weights", () => {
  it("produce a sensible full run", () => {
    const weights = PHASES.map((p) => p.weight)
    const checkpoints = [0, 1, 2, 3, 4, 5].map((n) => progressAfter(weights, n, 0))

    expect(checkpoints[0]).toBe(0)
    expect(checkpoints[5]).toBe(100)
    for (let i = 1; i < checkpoints.length; i++) {
      expect(checkpoints[i]).toBeGreaterThanOrEqual(checkpoints[i - 1])
    }
  })
})

describe("out-of-band phases", () => {
  const noop = async () => {}

  it("excludes them from a default run", () => {
    // A default run must not create auth users. Personas are the one phase whose
    // effects cannot be undone by dropping rows.
    const phases = [
      { name: "data", weight: 1, run: noop },
      { name: "personas", weight: 1, runsOutOfBand: true, run: noop },
    ]

    expect(inBandPhases(phases).map((p) => p.name)).toEqual(["data"])
  })

  it("lists them separately so they can be invoked on purpose", () => {
    const phases = [
      { name: "data", weight: 1, run: noop },
      { name: "personas", weight: 1, runsOutOfBand: true, run: noop },
    ]

    expect(outOfBandPhases(phases).map((p) => p.name)).toEqual(["personas"])
  })

  it("treats a phase as in-band unless it opts out", () => {
    // Opting in must be explicit, so a new destructive phase cannot be introduced by
    // omission.
    const phases = [{ name: "data", weight: 1, run: noop }]
    expect(inBandPhases(phases)).toHaveLength(1)
    expect(outOfBandPhases(phases)).toHaveLength(0)
  })

  it("partitions every phase exactly once", () => {
    const phases = [
      { name: "a", weight: 1, run: noop },
      { name: "b", weight: 1, runsOutOfBand: true, run: noop },
      { name: "c", weight: 1, run: noop },
    ]

    expect(inBandPhases(phases).length + outOfBandPhases(phases).length).toBe(phases.length)
  })

  it("preserves run order within each group", () => {
    const phases = [
      { name: "a", weight: 1, run: noop },
      { name: "b", weight: 1, runsOutOfBand: true, run: noop },
      { name: "c", weight: 1, run: noop },
    ]

    expect(inBandPhases(phases).map((p) => p.name)).toEqual(["a", "c"])
  })
})
