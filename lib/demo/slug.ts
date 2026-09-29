/**
 * Slug generation for demo tenants.
 *
 * The slug is used in two places:
 *  - as the public token in `/api/demo/status/[slug]`
 *  - as the prefix for every globally-unique seeded value (`School.code`,
 *    `FeeInvoice.invoiceNumber`, `Payment.receiptNumber`, ...) so that two
 *    concurrent demo tenants can never collide.
 *
 * Pure module: no database, no environment, no I/O. This keeps it directly
 * unit-testable and safe to import from client components.
 */

import { randomBytes } from "crypto"

/**
 * Unambiguous alphabet: no `0/O`, `1/I/L`, `U/V`. A visitor reading a slug off a
 * screen and typing it must not be defeated by a font.
 */
export const SLUG_ALPHABET = "23456789ABCDEFGHJKMNPQRSTWXYZ"

export const SLUG_LENGTH = 6

export const SLUG_MAX_ATTEMPTS = 5

/**
 * Generates a single candidate slug.
 *
 * Uses rejection sampling so every character is uniformly distributed. The naive
 * `alphabet[byte % length]` alternative biases the first few characters, which
 * measurably reduces the effective keyspace.
 */
export function generateSlug(length: number = SLUG_LENGTH): string {
  const max = 256 - (256 % SLUG_ALPHABET.length)
  let out = ""

  while (out.length < length) {
    const bytes = randomBytes(length)
    for (const byte of bytes) {
      if (byte >= max) continue
      out += SLUG_ALPHABET[byte % SLUG_ALPHABET.length]
      if (out.length === length) break
    }
  }

  return out
}

/** Uppercase form used for generated codes (`School.code`, `Branch.code`, ...). */
export function toCodePrefix(slug: string): string {
  return slug.toUpperCase()
}

/** True when `slug` is a well-formed slug. Guards the status route's input. */
export function isValidSlug(slug: string): boolean {
  if (typeof slug !== "string") return false
  if (slug.length !== SLUG_LENGTH) return false
  for (const char of slug) {
    if (!SLUG_ALPHABET.includes(char)) return false
  }
  return true
}

/**
 * Produces a unique slug, retrying while `isTaken` reports a collision.
 *
 * `isTaken` is injected rather than hard-wired to Prisma so this function stays
 * pure and testable. Callers pass a lookup against the `DemoTenant.slug` unique
 * index; retrying on `P2002` from an insert is the caller's alternative.
 */
export async function createUniqueSlug(
  isTaken: (slug: string) => Promise<boolean>,
  length: number = SLUG_LENGTH,
  maxAttempts: number = SLUG_MAX_ATTEMPTS,
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = generateSlug(length)
    if (!(await isTaken(candidate))) return candidate
  }
  throw new Error(
    `Unable to generate a unique demo slug after ${maxAttempts} attempts. ` +
      `Widen SLUG_ALPHABET or raise SLUG_MAX_ATTEMPTS.`,
  )
}

/** `d7k2m9` — the prefix embedded in every generated code for a tenant. */
export type SlugPrefix = string

/**
 * Builds a globally-unique value for a tenant.
 *
 * `local` is the caller-supplied discriminator (an admission number, an invoice
 * sequence, ...). The result is uppercase so it is stable regardless of how the
 * slug was generated.
 */
export function scopedValue(prefix: SlugPrefix, ...parts: (string | number)[]): string {
  return [toCodePrefix(prefix), ...parts.map(String)].join("-")
}

/** `d7k2m9-0001` for a slug of `d7k2m9`. */
export function scopedSequence(prefix: SlugPrefix, n: number, width = 4): string {
  return scopedValue(prefix, String(n).padStart(width, "0"))
}

/** `admin+d7k2m9@demo.invalid` */
export function personaEmail(local: string, slug: string, domain: string): string {
  return `${local}+${slug.toLowerCase()}@${domain}`
}
