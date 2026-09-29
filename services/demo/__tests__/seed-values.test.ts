import { describe, expect, it } from "vitest"

import {
  DEMO_EMAIL_DOMAIN,
  SUBJECT_NAMES,
  admissionNo,
  assertPrefix,
  bookCode,
  branchCode,
  branchEmail,
  cardNumber,
  className,
  employeeCode,
  expenseNumber,
  invoiceNumber,
  isbn,
  profileEmail,
  receiptNumber,
  schoolCode,
  schoolName,
  sectionName,
} from "../seed-values"

const PREFIX = "d7k2m9"

describe("assertPrefix", () => {
  it("accepts an alphanumeric prefix", () => {
    expect(() => assertPrefix("d7k2m9")).not.toThrow()
    expect(() => assertPrefix("ABC123")).not.toThrow()
  })

  it("rejects an empty prefix", () => {
    expect(() => assertPrefix("")).toThrow(/non-empty/)
  })

  it("rejects a non-string", () => {
    expect(() => assertPrefix(null as unknown as string)).toThrow(/non-empty/)
    expect(() => assertPrefix(42 as unknown as string)).toThrow(/non-empty/)
  })

  it("rejects punctuation, which would leak into codes and emails", () => {
    for (const bad of ["d7-k2", "d7 k2", "d7.k2", "d7@k2", "d7/k2"]) {
      expect(() => assertPrefix(bad), bad).toThrow(/alphanumeric/)
    }
  })

  it("is applied by every generator", () => {
    expect(() => schoolCode("bad-prefix")).toThrow(/alphanumeric/)
    expect(() => admissionNo("bad-prefix", 1)).toThrow(/alphanumeric/)
    expect(() => invoiceNumber("bad-prefix", 1)).toThrow(/alphanumeric/)
    expect(() => isbn("bad-prefix", 1)).toThrow(/alphanumeric/)
  })
})

describe("globally unique values carry the prefix", () => {
  // These columns have global unique indexes and no schoolId column, so the prefix
  // is the only thing stopping two tenants from colliding.
  const cases: Array<[string, string, RegExp]> = [
    ["School.code", schoolCode(PREFIX), /^D7K2M9$/],
    ["Branch.code", branchCode(PREFIX, 1), /^D7K2M9-B1$/],
    ["Student.admissionNo", admissionNo(PREFIX, 1), /^D7K2M9-0001$/],
    ["Student.admissionNo (42)", admissionNo(PREFIX, 42), /^D7K2M9-0042$/],
    ["Staff.employeeCode", employeeCode(PREFIX, 1), /^D7K2M9-E001$/],
    ["FeeInvoice.invoiceNumber", invoiceNumber(PREFIX, 1), /^D7K2M9-INV-000001$/],
    ["FeeInvoice.invoiceNumber (999)", invoiceNumber(PREFIX, 999), /^D7K2M9-INV-000999$/],
    ["Payment.receiptNumber", receiptNumber(PREFIX, 7), /^D7K2M9-RCP-000007$/],
    ["Expense.number", expenseNumber(PREFIX, 3), /^D7K2M9-EXP-0003$/],
    ["IdCard.cardNumber", cardNumber(PREFIX, 5), /^D7K2M9-IC-0005$/],
    ["LibraryBook.code", bookCode(PREFIX, 2), /^D7K2M9-BK-0002$/],
  ]

  it.each(cases)("%s matches the documented pattern", (_name, value, pattern) => {
    expect(value).toMatch(pattern)
  })

  it("LibraryBook.isbn keeps its 978 prefix", () => {
    expect(isbn(PREFIX, 1)).toBe("978-D7K2M9-0001")
    expect(isbn(PREFIX, 1)).toMatch(/^978-D7K2M9-\d{4}$/)
  })

  it("School.name embeds the prefix for visual identification", () => {
    expect(schoolName(PREFIX)).toBe("Riverside Demo School (D7K2M9)")
  })

  it("accepts a custom base name", () => {
    expect(schoolName(PREFIX, "Riverside International")).toBe("Riverside International (D7K2M9)")
  })
})

describe("values are uppercase for codes and lowercase for emails", () => {
  it("uppercases codes even from a lowercase slug", () => {
    expect(schoolCode("abc123")).toBe("ABC123")
    expect(branchCode("abc123", 2)).toBe("ABC123-B2")
  })

  it("matches the email shapes pinned by plan §11.2", () => {
    // `+slug` for personas/people, per §11.3; unindexed for `Branch.email`.
    expect(profileEmail("admin", PREFIX)).toBe(`admin+d7k2m9@${DEMO_EMAIL_DOMAIN}`)
    expect(branchEmail(PREFIX)).toBe(`branch.d7k2m9@${DEMO_EMAIL_DOMAIN}`)
  })

  it("keeps the +slug tag visually grouping a tenant's addresses", () => {
    // The reason for the sub-address form: related at a glance, distinct in a
    // globally unique column.
    const all = ["admin", "teacher", "student", "parent"].map((local) =>
      profileEmail(local, PREFIX),
    )
    expect(new Set(all).size).toBe(4)
    for (const address of all) expect(address).toContain("+d7k2m9@")
  })

  it("indexes branchEmail only when asked, for values that must differ", () => {
    // `School.email` reuses this with an index so it cannot collide with the branch.
    expect(branchEmail(PREFIX, 0)).not.toBe(branchEmail(PREFIX))
  })

  it("lowercases the prefix in the email local part", () => {
    expect(profileEmail("admin", "D7K2M9")).toBe(`admin+d7k2m9@${DEMO_EMAIL_DOMAIN}`)
    expect(branchEmail("D7K2M9")).toBe(`branch.d7k2m9@${DEMO_EMAIL_DOMAIN}`)
  })

  it("uses the reserved .invalid TLD everywhere", () => {
    expect(DEMO_EMAIL_DOMAIN).toBe("demo.invalid")
    expect(profileEmail("admin", PREFIX)).toMatch(/@demo\.invalid$/)
    expect(branchEmail(PREFIX)).toMatch(/@demo\.invalid$/)
    expect(branchEmail(PREFIX, 1)).toMatch(/@demo\.invalid$/)
  })

  it("produces deliverable-looking but undeliverable addresses", () => {
    // A real mail check must reject these; that is the point of .invalid.
    expect(profileEmail("admin", PREFIX)).not.toMatch(/@(gmail|yahoo|hotmail)\./)
  })
})

describe("two tenants never collide", () => {
  const other = "aaaaaa"

  it.each([
    ["School.code", () => schoolCode(PREFIX), () => schoolCode(other)],
    ["admissionNo", () => admissionNo(PREFIX, 1), () => admissionNo(other, 1)],
    ["employeeCode", () => employeeCode(PREFIX, 1), () => employeeCode(other, 1)],
    ["invoiceNumber", () => invoiceNumber(PREFIX, 1), () => invoiceNumber(other, 1)],
    ["receiptNumber", () => receiptNumber(PREFIX, 1), () => receiptNumber(other, 1)],
    ["cardNumber", () => cardNumber(PREFIX, 1), () => cardNumber(other, 1)],
    ["isbn", () => isbn(PREFIX, 1), () => isbn(other, 1)],
    // `Profile.email` is globally unique, so this is the constraint that matters
    // most for two demo tenants running at once.
    ["profileEmail", () => profileEmail("admin", PREFIX), () => profileEmail("admin", other)],
    ["branchEmail", () => branchEmail(PREFIX), () => branchEmail(other)],
  ])("%s differs between tenants", (_name, a, b) => {
    expect(a()).not.toBe(b())
  })
})

describe("generation is deterministic", () => {
  it("reproduces identical values for identical input", () => {
    expect(admissionNo(PREFIX, 17)).toBe(admissionNo(PREFIX, 17))
    expect(invoiceNumber(PREFIX, 3)).toBe(invoiceNumber(PREFIX, 3))
  })

  it("pads sequences to a fixed width so codes sort lexically", () => {
    expect(admissionNo(PREFIX, 9)).toBe("D7K2M9-0009")
    expect(admissionNo(PREFIX, 10)).toBe("D7K2M9-0010")
    // Lexical ordering must match numeric ordering up to 9999.
    expect(admissionNo(PREFIX, 2) < admissionNo(PREFIX, 10)).toBe(true)
  })

  it("honours a custom width", () => {
    expect(admissionNo(PREFIX, 1, 6)).toBe("D7K2M9-000001")
  })
})

describe("sectionName", () => {
  it("maps indices to letters", () => {
    expect(sectionName(0)).toBe("A")
    expect(sectionName(1)).toBe("B")
    expect(sectionName(25)).toBe("Z")
  })
})

describe("className", () => {
  it("renders the grade", () => {
    expect(className(1)).toBe("Grade 1")
    expect(className(10)).toBe("Grade 10")
  })
})

describe("subject catalog", () => {
  it("has unique names and codes", () => {
    expect(new Set(SUBJECT_NAMES.map((s) => s.name)).size).toBe(SUBJECT_NAMES.length)
    expect(new Set(SUBJECT_NAMES.map((s) => s.code)).size).toBe(SUBJECT_NAMES.length)
  })

  it("covers the nine core subjects plus languages", () => {
    expect(SUBJECT_NAMES.length).toBeGreaterThanOrEqual(9)
    expect(SUBJECT_NAMES.some((s) => s.name === "Mathematics")).toBe(true)
    expect(SUBJECT_NAMES.some((s) => s.name === "English")).toBe(true)
  })
})
