/**
 * A small, seeded, deterministic pseudo-random generator.
 *
 * Why not `Math.random()`: the plan requires that two runs of the same slug produce
 * identical data, so that a demo looks the same on every regeneration and so the
 * determinism test has something to assert. `Math.random()` cannot be seeded, and
 * seeding a bare `Math.random` replacement is not possible at all.
 *
 * Why not a dependency: this is the only part of the seed that needs randomness, and
 * an algorithm is ~40 lines. A seeded generator also has to be *stable across
 * versions* — if the library changes its algorithm, every demo's data changes under
 * the same slug and the determinism guarantee quietly breaks. Owning it makes that
 * guarantee ours to keep.
 *
 * This is `sfc32` with a 32-bit `xmur3` string hash, both tiny and well-distributed.
 * It is not cryptographically secure and is not used for anything security-relevant;
 * demo data does not need unpredictability, only reproducibility.
 */

/** Hashes a string into four 32-bit seeds. Deterministic across platforms. */
function xmur3(input: string): () => number {
  let h = 1779033703 ^ input.length

  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }

  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return h >>> 0
  }
}

/** sfc32 — 128-bit state, fast, passes PractRand well beyond what demo data needs. */
function sfc32(a: number, b: number, c: number, d: number): () => number {
  return () => {
    a >>>= 0
    b >>>= 0
    c >>>= 0
    d >>>= 0

    let t = (a + b) | 0
    a = b ^ (b >>> 9)
    b = (c + (c << 3)) | 0
    c = (c << 21) | (c >>> 11)
    d = (d + 1) | 0
    t = (t + d) | 0
    c = (c + t) | 0

    return (t >>> 0) / 4294967296
  }
}

export class Prng {
  private readonly nextFloat: () => number

  constructor(seed: string) {
    const seeder = xmur3(seed)

    this.nextFloat = sfc32(seeder(), seeder(), seeder(), seeder())
  }

  /** A float in [0, 1). */
  next(): number {
    return this.nextFloat()
  }

  /**
   * An integer in [min, max], inclusive at both ends.
   *
   * Rejection sampling rather than modulo, so every value is equally likely. A
   * modulo would skew toward the low end whenever the range does not divide 2^32,
   * which is visible in a class roster of 60 as an uneven spread of first names.
   */
  int(min: number, max: number): number {
    if (min > max) throw new Error(`Prng.int: min (${min}) exceeds max (${max})`)

    const range = max - min + 1
    if (range <= 0) return min

    // Largest multiple of `range` that fits in 32 bits; values at or above it are
    // discarded to remove the modulo bias.
    const limit = Math.floor(4294967296 / range) * range

    let value = this.nextFloat() * 4294967296
    while (value >= limit) value = this.nextFloat() * 4294967296

    return min + (value % range)
  }

  /** True with probability `p`, where p is 0..1. */
  bool(p = 0.5): boolean {
    return this.next() < p
  }

  /** A uniformly chosen element. Throws on an empty list rather than returning undefined. */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error("Prng.pick: cannot choose from an empty list")
    return items[this.int(0, items.length - 1)]
  }

  /**
   * A weighted choice. `weights` must be the same length as `items` and non-negative.
   */
  weighted<T>(items: readonly T[], weights: readonly number[]): T {
    if (items.length === 0) throw new Error("Prng.weighted: cannot choose from an empty list")
    if (items.length !== weights.length) {
      throw new Error(`Prng.weighted: ${items.length} items but ${weights.length} weights`)
    }

    const total = weights.reduce((sum, weight) => sum + weight, 0)
    if (total <= 0) throw new Error("Prng.weighted: weights must sum to more than zero")

    let roll = this.next() * total

    for (let i = 0; i < items.length; i++) {
      roll -= weights[i]
      if (roll < 0) return items[i]
    }

    // Only reachable through floating-point error at the very top of the range.
    return items[items.length - 1]
  }

  /**
   * A normally distributed value, via Box-Muller.
   *
   * Used for exam marks and attendance rates, where a flat distribution would make
   * the demo look obviously fake. Clamped to `min`/`max` because a Gaussian has
   * unbounded tails and a mark of 103 or -4 would break a database constraint.
   */
  normal(mean: number, standardDeviation: number, min?: number, max?: number): number {
    // u1 must be non-zero for Math.log.
    const u1 = Math.max(this.next(), Number.EPSILON)
    const u2 = this.next()

    const standardNormal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    let value = mean + standardDeviation * standardNormal

    if (min !== undefined) value = Math.max(min, value)
    if (max !== undefined) value = Math.min(max, value)

    return value
  }

  /**
   * A shuffled copy. Fisher-Yates, returning a new array so the input is untouched.
   */
  shuffle<T>(items: readonly T[]): T[] {
    const out = [...items]

    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(0, i)
      ;[out[i], out[j]] = [out[j], out[i]]
    }

    return out
  }

  /** A run of `count` distinct values, in random order. */
  sample<T>(items: readonly T[], count: number): T[] {
    if (count > items.length) {
      throw new Error(`Prng.sample: cannot take ${count} of ${items.length}`)
    }
    return this.shuffle(items).slice(0, count)
  }
}
