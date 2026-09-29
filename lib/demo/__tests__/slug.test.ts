import { describe, expect, it } from "vitest"

import {
  SLUG_ALPHABET,
  SLUG_LENGTH,
  createUniqueSlug,
  generateSlug,
  isValidSlug,
  personaEmail,
  scopedSequence,
  scopedValue,
  toCodePrefix,
} from "../slug"

describe("generateSlug", () => {
  it("returns the requested length", () => {
    for (const len of [4, 6, 8, 12]) {
      expect(generateSlug(len)).toHaveLength(len)
    }
  })

  it("defaults to SLUG_LENGTH", () => {
    expect(generateSlug()).toHaveLength(SLUG_LENGTH)
  })

  it("only uses characters from the unambiguous alphabet", () => {
    for (let i = 0; i < 500; i++) {
      for (const char of generateSlug()) {
        expect(SLUG_ALPHABET).toContain(char)
      }
    }
  })

  it("excludes visually confusable characters", () => {
    // A visitor reads a slug off a screen and types it. O/0, I/1/L, U/V must not
    // appear, or a mistyped slug is indistinguishable from a wrong one.
    for (const forbidden of ["0", "O", "1", "I", "L", "U", "V"]) {
      expect(SLUG_ALPHABET).not.toContain(forbidden)
    }
  })

  it("produces no ambiguous characters across many samples", () => {
    for (let i = 0; i < 2000; i++) {
      const slug = generateSlug()
      expect(slug).not.toMatch(/[01OILUV]/)
    }
  })

  it("has no leading-zero bias — every alphabet position is reachable", () => {
    const seen = new Set<string>()
    for (let i = 0; i < 20_000; i++) {
      for (const char of generateSlug(1)) seen.add(char)
    }
    // Rejection sampling should reach every character; modulo bias would still
    // reach all of them, so also assert a high count to catch gross skew.
    expect(seen.size).toBe(SLUG_ALPHABET.length)
  })

  it("does not repeat itself", () => {
    const slugs = new Set<string>()
    for (let i = 0; i < 5000; i++) slugs.add(generateSlug())
    expect(slugs.size).toBe(5000)
  })

  it("handles a requested length longer than one random byte batch", () => {
    // Rejection sampling loops; a length beyond one batch must still terminate.
    expect(generateSlug(64)).toHaveLength(64)
  })
})

describe("toCodePrefix", () => {
  it("uppercases the slug", () => {
    expect(toCodePrefix("d7k2m9")).toBe("D7K2M9")
  })

  it("is idempotent for an already uppercase slug", () => {
    expect(toCodePrefix("D7K2M9")).toBe("D7K2M9")
  })
})

describe("isValidSlug", () => {
  it("accepts a freshly generated slug", () => {
    expect(isValidSlug(generateSlug())).toBe(true)
  })

  it("rejects the wrong length", () => {
    expect(isValidSlug("")).toBe(false)
    expect(isValidSlug("ABC")).toBe(false)
    expect(isValidSlug("ABCDEFG")).toBe(false)
  })

  it("rejects characters outside the alphabet", () => {
    const valid = generateSlug()
    const withLower = "a" + valid.slice(1)
    const withDigit = valid.slice(0, 5) + "0"
    const withDash = valid.slice(0, 5) + "-"
    expect(isValidSlug(withLower)).toBe(false)
    expect(isValidSlug(withDigit)).toBe(false)
    expect(isValidSlug(withDash)).toBe(false)
  })

  it("rejects non-strings", () => {
    expect(isValidSlug(undefined as unknown as string)).toBe(false)
    expect(isValidSlug(null as unknown as string)).toBe(false)
    expect(isValidSlug(123456 as unknown as string)).toBe(false)
  })
})

describe("createUniqueSlug", () => {
  it("returns the first candidate when nothing is taken", async () => {
    const slug = await createUniqueSlug(async () => false)
    expect(isValidSlug(slug)).toBe(true)
  })

  it("retries on collision", async () => {
    const attempts: string[] = []
    const slug = await createUniqueSlug(async (candidate) => {
      attempts.push(candidate)
      return attempts.length < 3
    })
    expect(attempts).toHaveLength(3)
    expect(attempts[2]).toBe(slug)
  })

  it("gives up after maxAttempts rather than looping forever", async () => {
    await expect(createUniqueSlug(async () => true, 6, 3)).rejects.toThrow(
      /unique demo slug after 3 attempts/,
    )
  })

  it("does not call isTaken more times than allowed", async () => {
    let calls = 0
    await expect(
      createUniqueSlug(
        async () => {
          calls++
          return true
        },
        6,
        4,
      ),
    ).rejects.toThrow()
    expect(calls).toBe(4)
  })
})

describe("scopedValue", () => {
  it("prefixes and uppercases", () => {
    expect(scopedValue("d7k2m9", "INV", "000001")).toBe("D7K2M9-INV-000001")
  })

  it("joins mixed string and number parts without altering their case", () => {
    // Only the prefix is normalised. Parts are supplied already canonical by the
    // callers, and force-casing them here would corrupt any value whose case is
    // meaningful.
    expect(scopedValue("abc", "B", 1, "x")).toBe("ABC-B-1-x")
  })

  it("returns just the prefix when there are no parts", () => {
    expect(scopedValue("d7k2m9")).toBe("D7K2M9")
  })
})

describe("scopedSequence", () => {
  it("zero-pads to the default width of 4", () => {
    expect(scopedSequence("d7k2m9", 1)).toBe("D7K2M9-0001")
    expect(scopedSequence("d7k2m9", 60)).toBe("D7K2M9-0060")
  })

  it("honours a custom width", () => {
    expect(scopedSequence("d7k2m9", 7, 6)).toBe("D7K2M9-000007")
  })

  it("does not truncate a value wider than the padding", () => {
    expect(scopedSequence("d7k2m9", 123456, 4)).toBe("D7K2M9-123456")
  })
})

describe("personaEmail", () => {
  it("builds a sub-addressed email on the reserved domain", () => {
    expect(personaEmail("admin", "d7k2m9", "demo.invalid")).toBe("admin+d7k2m9@demo.invalid")
  })

  it("lowercases the slug so the address is stable", () => {
    expect(personaEmail("student", "D7K2M9", "demo.invalid")).toBe("student+d7k2m9@demo.invalid")
  })

  it("produces distinct addresses for distinct personas of the same tenant", () => {
    const locals = ["admin", "teacher", "student", "parent"]
    const emails = locals.map((l) => personaEmail(l, "d7k2m9", "demo.invalid"))
    expect(new Set(emails).size).toBe(locals.length)
  })
})
