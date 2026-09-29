import { describe, expect, it } from "vitest"

import { Prng } from "../prng"

describe("determinism", () => {
  it("produces the same sequence for the same seed", () => {
    const a = new Prng("d7k2m9")
    const b = new Prng("d7k2m9")
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()])
  })

  it("produces different sequences for different seeds", () => {
    const a = new Prng("d7k2m9")
    const b = new Prng("aaaaaa")
    expect(a.next()).not.toBe(b.next())
  })

  it("is sensitive to the first character of the seed", () => {
    expect(new Prng("abcd").next()).not.toBe(new Prng("ebcd").next())
  })

  it("is sensitive to the last character of the seed", () => {
    expect(new Prng("abcd").next()).not.toBe(new Prng("abce").next())
  })

  it("is sensitive to seed length", () => {
    expect(new Prng("abc").next()).not.toBe(new Prng("abcd").next())
  })

  it("does not depend on construction order of other instances", () => {
    const a = new Prng("stable")
    const unused = new Prng("other")
    void unused.next()
    expect(a.next()).toBe(new Prng("stable").next())
  })

  it("reproduces a full 200-value run exactly", () => {
    const run = (seed: string) => Array.from({ length: 200 }, () => new Prng(seed).next())
    expect(run("x")).toEqual(run("x"))
  })
})

describe("next", () => {
  it("stays within [0, 1)", () => {
    const prng = new Prng("range")
    for (let i = 0; i < 5000; i++) {
      const value = prng.next()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it("is roughly uniform across ten buckets", () => {
    const prng = new Prng("buckets")
    const buckets = new Array(10).fill(0)

    for (let i = 0; i < 50_000; i++) {
      buckets[Math.floor(prng.next() * 10)]++
    }

    for (const count of buckets) {
      // 5% tolerance is generous but would still catch a badly skewed generator.
      expect(count).toBeGreaterThan(4500)
      expect(count).toBeLessThan(5500)
    }
  })
})

describe("int", () => {
  it("includes both bounds", () => {
    const prng = new Prng("bounds")
    for (let i = 0; i < 1000; i++) {
      const value = prng.int(1, 3)
      expect(value).toBeGreaterThanOrEqual(1)
      expect(value).toBeLessThanOrEqual(3)
    }
  })

  it("returns the only value when min equals max", () => {
    expect(new Prng("same").int(7, 7)).toBe(7)
  })

  it("throws when min exceeds max", () => {
    expect(() => new Prng("bad").int(5, 1)).toThrow(/exceeds/)
  })

  it("handles negative ranges", () => {
    const prng = new Prng("negative")
    for (let i = 0; i < 500; i++) {
      const value = prng.int(-10, -5)
      expect(value).toBeGreaterThanOrEqual(-10)
      expect(value).toBeLessThanOrEqual(-5)
    }
  })

  it("spans a negative-to-positive range", () => {
    const prng = new Prng("span")
    const seen = new Set<number>()
    for (let i = 0; i < 500; i++) seen.add(prng.int(-3, 3))
    expect(seen.size).toBe(7)
  })

  it("reaches every value in a small range", () => {
    const prng = new Prng("coverage")
    const seen = new Set<number>()
    for (let i = 0; i < 1000; i++) seen.add(prng.int(1, 6))
    expect([...seen].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it("is roughly uniform across a range that does not divide 2^32", () => {
    // 3 is the classic modulo-bias case: naive `% 3` favours the low bucket.
    const prng = new Prng("bias")
    const counts = new Map<number, number>([
      [1, 0],
      [2, 0],
      [3, 0],
    ])

    for (let i = 0; i < 30_000; i++) {
      const value = prng.int(1, 3)
      counts.set(value, counts.get(value)! + 1)
    }

    for (const count of counts.values()) {
      expect(count).toBeGreaterThan(9000)
      expect(count).toBeLessThan(11_000)
    }
  })

  it("never returns a float, even for wide ranges", () => {
    const prng = new Prng("ints")
    for (let i = 0; i < 2000; i++) {
      expect(Number.isInteger(prng.int(0, 1_000_000_000))).toBe(true)
    }
  })
})

describe("bool", () => {
  it("returns only booleans", () => {
    const prng = new Prng("bool")
    for (let i = 0; i < 200; i++) expect(typeof prng.bool()).toBe("boolean")
  })

  it("is true about half the time by default", () => {
    const prng = new Prng("half")
    let trues = 0
    for (let i = 0; i < 20_000; i++) if (prng.bool()) trues++
    expect(trues).toBeGreaterThan(9500)
    expect(trues).toBeLessThan(10500)
  })

  it("is never true at p = 0", () => {
    const prng = new Prng("never")
    for (let i = 0; i < 500; i++) expect(prng.bool(0)).toBe(false)
  })

  it("is always true at p = 1", () => {
    const prng = new Prng("always")
    for (let i = 0; i < 500; i++) expect(prng.bool(1)).toBe(true)
  })

  it("honours a low probability", () => {
    const prng = new Prng("rare")
    let trues = 0
    for (let i = 0; i < 20_000; i++) if (prng.bool(0.02)) trues++
    expect(trues).toBeGreaterThan(250)
    expect(trues).toBeLessThan(750)
  })
})

describe("pick", () => {
  const items = ["a", "b", "c", "d"]

  it("always returns a member of the list", () => {
    const prng = new Prng("pick")
    for (let i = 0; i < 500; i++) expect(items).toContain(prng.pick(items))
  })

  it("reaches every element", () => {
    const prng = new Prng("pickall")
    const seen = new Set<string>()
    for (let i = 0; i < 500; i++) seen.add(prng.pick(items))
    expect(seen.size).toBe(4)
  })

  it("throws on an empty list rather than returning undefined", () => {
    expect(() => new Prng("empty").pick([])).toThrow(/empty/)
  })

  it("works on a single-element list", () => {
    expect(new Prng("one").pick(["only"])).toBe("only")
  })
})

describe("weighted", () => {
  it("never chooses a zero-weight option", () => {
    const prng = new Prng("weights")
    for (let i = 0; i < 2000; i++) {
      expect(prng.weighted(["a", "b", "c"], [1, 0, 1])).not.toBe("b")
    }
  })

  it("respects a heavily skewed weight", () => {
    const prng = new Prng("skew")
    let rare = 0
    for (let i = 0; i < 20_000; i++) {
      if (prng.weighted(["common", "rare"], [99, 1]) === "rare") rare++
    }
    expect(rare).toBeGreaterThan(80)
    expect(rare).toBeLessThan(320)
  })

  it("splits evenly for equal weights", () => {
    const prng = new Prng("even")
    let a = 0
    for (let i = 0; i < 20_000; i++) if (prng.weighted(["a", "b"], [1, 1]) === "a") a++
    expect(a).toBeGreaterThan(9500)
    expect(a).toBeLessThan(10500)
  })

  it("throws on a length mismatch", () => {
    expect(() => new Prng("mismatch").weighted(["a", "b"], [1])).toThrow(/weights/)
  })

  it("throws when every weight is zero", () => {
    expect(() => new Prng("zero").weighted(["a"], [0])).toThrow(/sum/)
  })

  it("throws on an empty list", () => {
    expect(() => new Prng("empty").weighted([], [])).toThrow(/empty/)
  })

  it("always returns a member even with a single option", () => {
    const prng = new Prng("single")
    for (let i = 0; i < 100; i++) expect(prng.weighted(["only"], [5])).toBe("only")
  })
})

describe("normal", () => {
  it("centres on the mean", () => {
    const prng = new Prng("mean")
    let sum = 0
    const n = 20_000
    for (let i = 0; i < n; i++) sum += prng.normal(75, 10)
    expect(sum / n).toBeGreaterThan(73)
    expect(sum / n).toBeLessThan(77)
  })

  it("honours the standard deviation", () => {
    const prng = new Prng("sd")
    const values: number[] = []
    for (let i = 0; i < 20_000; i++) values.push(prng.normal(0, 1))
    const mean = values.reduce((s, v) => s + v, 0) / values.length
    const variance = values.reduce((s, v) => s + (v - mean) * (v - mean), 0) / values.length
    expect(Math.sqrt(variance)).toBeGreaterThan(0.9)
    expect(Math.sqrt(variance)).toBeLessThan(1.1)
  })

  it("clamps to the bounds", () => {
    const prng = new Prng("clamp")
    for (let i = 0; i < 5000; i++) {
      const value = prng.normal(50, 30, 0, 100)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(100)
    }
  })

  it("clamps to a lower bound only", () => {
    const prng = new Prng("lowonly")
    for (let i = 0; i < 2000; i++) {
      expect(prng.normal(0, 10, -5)).toBeGreaterThanOrEqual(-5)
    }
  })

  it("clamps to an upper bound only", () => {
    const prng = new Prng("highonly")
    for (let i = 0; i < 2000; i++) {
      expect(prng.normal(0, 10, undefined, 5)).toBeLessThanOrEqual(5)
    }
  })

  it("is deterministic for a given seed", () => {
    const run = () => Array.from({ length: 50 }, () => new Prng("fixed").normal(70, 8))
    expect(run()).toEqual(run())
  })
})

describe("shuffle", () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8]

  it("keeps every element", () => {
    expect([...new Set(new Prng("s1").shuffle(items))].sort((a, b) => a - b)).toEqual(items)
  })

  it("does not mutate the input", () => {
    const original = [...items]
    new Prng("s2").shuffle(items)
    expect(items).toEqual(original)
  })

  it("is deterministic for a given seed", () => {
    expect(new Prng("s3").shuffle(items)).toEqual(new Prng("s3").shuffle(items))
  })

  it("actually reorders for at least some seeds", () => {
    const shuffled = new Prng("s4").shuffle(items)
    expect(shuffled).not.toEqual(items)
  })

  it("handles an empty list", () => {
    expect(new Prng("s5").shuffle([])).toEqual([])
  })

  it("handles a single element", () => {
    expect(new Prng("s6").shuffle([42])).toEqual([42])
  })

  it("preserves length", () => {
    expect(new Prng("s7").shuffle(items)).toHaveLength(items.length)
  })
})

describe("sample", () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  it("returns the requested number of distinct items", () => {
    const picked = new Prng("p1").sample(items, 4)
    expect(picked).toHaveLength(4)
    expect(new Set(picked).size).toBe(4)
  })

  it("only returns members of the list", () => {
    for (const value of new Prng("p2").sample(items, 5)) expect(items).toContain(value)
  })

  it("returns everything when count equals length", () => {
    expect([...new Prng("p3").sample(items, items.length)].sort((a, b) => a - b)).toEqual(items)
  })

  it("returns an empty list for count zero", () => {
    expect(new Prng("p4").sample(items, 0)).toEqual([])
  })

  it("throws when asked for more than it has", () => {
    expect(() => new Prng("p5").sample(items, 11)).toThrow(/cannot take/)
  })

  it("is deterministic for a given seed", () => {
    expect(new Prng("p6").sample(items, 3)).toEqual(new Prng("p6").sample(items, 3))
  })
})

describe("realistic seed usage", () => {
  it("reproduces a roster of 60 students exactly", () => {
    const build = () => {
      const prng = new Prng("d7k2m9")
      return Array.from({ length: 60 }, (_, i) => ({
        index: i,
        classRoom: prng.int(1, 10),
        absentThisWeek: prng.bool(0.08),
      }))
    }

    expect(build()).toEqual(build())
  })

  it("gives different tenants different rosters", () => {
    const roster = (slug: string) =>
      Array.from({ length: 20 }, () => new Prng(slug).int(1, 10)).join(",")

    expect(roster("d7k2m9")).not.toBe(roster("aaaaaa"))
  })

  it("keeps generated marks inside a valid range", () => {
    const prng = new Prng("marks")
    for (let i = 0; i < 1000; i++) {
      const marks = Math.round(prng.normal(72, 12, 0, 100))
      expect(marks).toBeGreaterThanOrEqual(0)
      expect(marks).toBeLessThanOrEqual(100)
    }
  })
})
