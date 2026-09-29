/**
 * Slug-prefixed generation for every globally-unique value in a demo tenant.
 *
 * The rule from the plan (§11.2): two demo tenants can exist at once, and both write
 * to columns with *global* unique indexes (`School.code`, `FeeInvoice.invoiceNumber`,
 * `LibraryBook.isbn`, ...). Nothing in that set is scoped by `schoolId`, so a plain
 * sequential generator would collide the moment a second tenant was seeded.
 *
 * Every value here is therefore `<PREFIX>-<LOCAL>`, where `PREFIX` is the tenant's
 * slug in uppercase. Two tenants then cannot collide, and re-seeding one tenant
 * produces byte-identical codes.
 *
 * Pure module: no database, no environment, no clock. Determinism depends on that —
 * the PRNG is seeded from the slug, so the same slug always yields the same codes.
 */

import { scopedSequence, scopedValue, toCodePrefix } from "@/lib/demo/slug"

/**
 * Email domain for demo data. `.invalid` is reserved by RFC 2606.
 *
 * Duplicated from `DEMO_EMAIL_DOMAIN` in `lib/demo/constants.ts` on purpose:
 * `constants.ts` imports the generated Prisma client for `DemoPersonaType`, and
 * importing it here would drag that into this module's tests. If you change one,
 * change both.
 */
export const DEMO_EMAIL_DOMAIN = "demo.invalid"

export type TenantPrefix = string

/**
 * Asserts a value looks like a tenant prefix before it is used in a unique column.
 *
 * Catching a malformed prefix here produces a clear error at seed time. Left to the
 * database it would surface as an opaque unique-constraint violation against a
 * column nobody remembers writing to.
 */
export function assertPrefix(prefix: TenantPrefix): void {
  if (typeof prefix !== "string" || prefix.length === 0) {
    throw new Error("Seed prefix must be a non-empty string")
  }
  if (!/^[A-Za-z0-9]+$/.test(prefix)) {
    throw new Error(
      `Seed prefix must be alphanumeric, got "${prefix}". ` +
        "A prefix containing punctuation would leak into codes and emails.",
    )
  }
}

// ── School and branch ───────────────────────────────────────────────────────

/** `D7K2M9` */
export function schoolCode(prefix: TenantPrefix): string {
  assertPrefix(prefix)
  return toCodePrefix(prefix)
}

/** `Riverside Demo School (D7K2M9)` */
export function schoolName(prefix: TenantPrefix, base = "Riverside Demo School"): string {
  assertPrefix(prefix)
  return `${base} (${toCodePrefix(prefix)})`
}

/** `D7K2M9-B1` */
export function branchCode(prefix: TenantPrefix, n: number): string {
  assertPrefix(prefix)
  return scopedValue(prefix, `B${n}`)
}

/**
 * `branch.d7k2m9@demo.invalid`, matching the plan's §11.2 table.
 *
 * The branch index is optional and omitted by default, because a demo tenant has one
 * branch and the plan pins the unindexed shape. Pass `n` only when a value needs to be
 * distinct from `Branch.email` - `School.email` does, and reuses the same domain.
 */
export function branchEmail(prefix: TenantPrefix, n?: number): string {
  assertPrefix(prefix)
  const suffix = n === undefined ? "" : `.${n}`
  return `branch.${prefix.toLowerCase()}${suffix}@${DEMO_EMAIL_DOMAIN}`
}

// ── People ──────────────────────────────────────────────────────────────────

/** `D7K2M9-0001` */
export function admissionNo(prefix: TenantPrefix, n: number, width = 4): string {
  assertPrefix(prefix)
  return scopedSequence(prefix, n, width)
}

/** `D7K2M9-E001` */
export function employeeCode(prefix: TenantPrefix, n: number, width = 3): string {
  assertPrefix(prefix)
  return scopedValue(prefix, `E${String(n).padStart(width, "0")}`)
}

/**
 * `admin+d7k2m9@demo.invalid`
 *
 * The `+slug` sub-address form is deliberate and pinned by the plan (§11.3): it keeps
 * every address for a tenant visually related while staying distinct under
 * `Profile.email`'s global uniqueness. A `.`-separated form would also be unique, but
 * then the two documents describing the shape (`docs/DEMO_TRIAL_SYSTEM_PLAN.md` §11.2
 * and `DEMO_PERSONA_EMAIL_LOCAL` in `lib/demo/constants.ts`) would be describing
 * something the code does not do.
 */
export function profileEmail(local: string, prefix: TenantPrefix): string {
  assertPrefix(prefix)
  return `${local}+${prefix.toLowerCase()}@${DEMO_EMAIL_DOMAIN}`
}

// ── Finance ─────────────────────────────────────────────────────────────────

/** `D7K2M9-INV-000001` */
export function invoiceNumber(prefix: TenantPrefix, n: number): string {
  assertPrefix(prefix)
  return scopedValue(prefix, "INV", String(n).padStart(6, "0"))
}

/** `D7K2M9-RCP-000001` */
export function receiptNumber(prefix: TenantPrefix, n: number): string {
  assertPrefix(prefix)
  return scopedValue(prefix, "RCP", String(n).padStart(6, "0"))
}

/** `D7K2M9-EXP-0001` */
export function expenseNumber(prefix: TenantPrefix, n: number): string {
  assertPrefix(prefix)
  return scopedValue(prefix, "EXP", String(n).padStart(4, "0"))
}

// ── Library and cards ───────────────────────────────────────────────────────

/**
 * `978-D7K2M9-0001`
 *
 * Kept 13 characters and digit-shaped around the prefix so it still looks like an
 * ISBN to a human reading the demo. It is deliberately not a real ISBN — it must
 * never collide with a real book's identifier, which is the whole point of the
 * prefix.
 */
export function isbn(prefix: TenantPrefix, n: number): string {
  assertPrefix(prefix)
  return `978-${toCodePrefix(prefix)}-${String(n).padStart(4, "0")}`
}

/** `D7K2M9-IC-0001` */
export function cardNumber(prefix: TenantPrefix, n: number): string {
  assertPrefix(prefix)
  return scopedValue(prefix, "IC", String(n).padStart(4, "0"))
}

/** `D7K2M9-BK-0001` */
export function bookCode(prefix: TenantPrefix, n: number): string {
  assertPrefix(prefix)
  return scopedValue(prefix, "BK", String(n).padStart(4, "0"))
}

// ── Naming pools ────────────────────────────────────────────────────────────

export const FIRST_NAMES_MALE = [
  "Aarav",
  "Bilal",
  "Chen",
  "Daniel",
  "Ethan",
  "Farhan",
  "Gabriel",
  "Hassan",
  "Ibrahim",
  "Jonas",
  "Kabir",
  "Lucas",
  "Mateo",
  "Noah",
  "Omar",
  "Pedro",
  "Rayan",
  "Samuel",
  "Tariq",
  "Victor",
  "Yusuf",
  "Zane",
] as const

export const FIRST_NAMES_FEMALE = [
  "Aaliyah",
  "Beatriz",
  "Chloe",
  "Diana",
  "Elena",
  "Farah",
  "Grace",
  "Hana",
  "Isabella",
  "Jasmine",
  "Keiko",
  "Leila",
  "Maya",
  "Nadia",
  "Olivia",
  "Priya",
  "Rosa",
  "Sara",
  "Tara",
  "Valeria",
  "Yara",
  "Zainab",
] as const

export const LAST_NAMES = [
  "Ahmed",
  "Bennett",
  "Castillo",
  "Dubois",
  "Evans",
  "Farooq",
  "Garcia",
  "Hassan",
  "Ibrahim",
  "Johansson",
  "Khan",
  "Lindqvist",
  "Mbeki",
  "Nakamura",
  "Okafor",
  "Petrov",
  "Quinn",
  "Rahman",
  "Silva",
  "Tanaka",
  "Usman",
  "Vargas",
] as const

export const SUBJECT_NAMES = [
  { name: "English", code: "ENG" },
  { name: "Mathematics", code: "MATH" },
  { name: "Science", code: "SCI" },
  { name: "Social Studies", code: "SOC" },
  { name: "Computer Science", code: "CSC" },
  { name: "Art", code: "ART" },
  { name: "Music", code: "MUS" },
  { name: "Physical Education", code: "PE" },
  { name: "Islamic Studies", code: "ISL" },
  { name: "Urdu", code: "URD" },
  { name: "Spanish", code: "SPA" },
  { name: "Moral Science", code: "MOR" },
] as const

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"] as const

export const GENDERS = ["MALE", "FEMALE"] as const

/** Class names for grades 1..10, the range the plan specifies for `DEMO`. */
export function className(grade: number): string {
  return `Grade ${grade}`
}

/** `A`, `B`, ... for a section index. */
export function sectionName(index: number): string {
  return String.fromCharCode(65 + index)
}
