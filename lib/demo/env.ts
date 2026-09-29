import "server-only"

import { PLAN_KEY, type PlanKey } from "./plans"
import { DEMO_PERSONA_PASSWORD_MIN_LENGTH } from "./constants"

/**
 * Demo / trial configuration.
 *
 * Deliberately a separate module from `lib/env.ts` rather than an addition to it.
 * Two reasons:
 *  1. `lib/env.ts` is not `server-only`, and it already exposes
 *     `SUPABASE_SERVICE_ROLE_KEY`. Adding a demo secret there widens an existing
 *     exposure path. This module is `server-only`, so a client import fails at
 *     build time.
 *  2. `lib/env.ts`'s schema treats missing fields as fatal. Every demo variable
 *     here is optional with a safe default, so upgrading the code never breaks a
 *     running deployment.
 *
 * Parsing is done with small explicit helpers rather than a Zod object, because
 * the Zod object in `lib/env.ts` reports a single `is_valid` flag and we would
 * rather have each demo knob degrade to its own documented default.
 *
 * `DEMO_DISABLED` defaults to `true`: the subsystem is dark until explicitly
 * enabled. That default *is* the kill switch.
 */

/** Reads a boolean-ish env var. Absent, empty, or unrecognised -> `fallback`. */
function readFlag(name: string, fallback: boolean): boolean {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === "") return fallback
  return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase())
}

/** Reads an integer env var, clamped to `min`. Anything unparseable -> `fallback`. */
function readInt(name: string, fallback: number, min = 0): number {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === "") return fallback
  const parsed = Number.parseInt(raw.trim(), 10)
  if (!Number.isFinite(parsed)) {
    console.warn(`[demo] ${name} is not a valid integer; using default ${fallback}`)
    return fallback
  }
  if (parsed < min) {
    console.warn(`[demo] ${name} is below ${min}; clamping to ${min}`)
    return min
  }
  return parsed
}

function readString(name: string): string | undefined {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === "") return undefined
  return raw.trim()
}

/** Master switch. `true` means every demo entry point refuses. */
export const DEMO_DISABLED = readFlag("DEMO_DISABLED", true)

export const DEMO_MAX_ACTIVE_TENANTS = readInt("DEMO_MAX_ACTIVE_TENANTS", 25, 1)

const defaultPlanKey = readString("DEMO_DEFAULT_PLAN_KEY") ?? PLAN_KEY.DEMO
export const DEMO_DEFAULT_PLAN_KEY = defaultPlanKey as PlanKey

export const DEMO_MAX_EXTENSION_MINUTES = readInt("DEMO_MAX_EXTENSION_MINUTES", 1440, 1)

export const DEMO_RETENTION_DAYS = readInt("DEMO_RETENTION_DAYS", 2, 0)

export const DEMO_IDLE_PURGE_HOURS = readInt("DEMO_IDLE_PURGE_HOURS", 72, 1)

export const DEMO_STALE_SEED_MINUTES = readInt("DEMO_STALE_SEED_MINUTES", 10, 1)

export const DEMO_STALE_SEED_THRESHOLD_MS = DEMO_STALE_SEED_MINUTES * 60_000

/** Guards `scripts/demo-seed.ts` so it cannot be pointed at production casually. */
export const DEMO_SEED_ALLOW = readFlag("DEMO_SEED_ALLOW", false)

export const CRON_SECRET = readString("CRON_SECRET")

export const DEMO_CAPTCHA_SECRET = readString("DEMO_CAPTCHA_SECRET")

export const DEMO_CAPTCHA_SITE_KEY = readString("NEXT_PUBLIC_DEMO_CAPTCHA_SITE_KEY")

const personaPassword = readString("DEMO_PERSONA_PASSWORD")

/**
 * The shared persona password is intentionally public once the demo is on, but it
 * must still be non-trivial: it is the only thing standing between a visitor and a
 * valid session. Too short and the demo is trivially brute-forceable.
 */
export const DEMO_PERSONA_PASSWORD_IS_USABLE =
  personaPassword !== undefined && personaPassword.length >= DEMO_PERSONA_PASSWORD_MIN_LENGTH

/**
 * Why the demo is currently unusable, or `null` when it is configured correctly.
 * Surfaced on the operator console; never surfaced to an anonymous visitor, since
 * the reason would describe the deployment rather than help the user.
 */
export function demoConfigError(): string | null {
  if (DEMO_DISABLED) return "Demo subsystem is disabled (DEMO_DISABLED)."
  if (!DEMO_PERSONA_PASSWORD_IS_USABLE) {
    return `DEMO_PERSONA_PASSWORD must be set and at least ${DEMO_PERSONA_PASSWORD_MIN_LENGTH} characters.`
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for persona provisioning."
  }
  return null
}

/** The demo is usable and may serve requests. */
export const DEMO_READY = demoConfigError() === null

/**
 * The persona password is read only at the point of a real sign-in. It is never
 * logged, never persisted, and never written to a `DemoEvent`.
 */
export function getPersonaPassword(): string | null {
  return DEMO_PERSONA_PASSWORD_IS_USABLE ? personaPassword! : null
}

export const demoEnv = {
  DEMO_DISABLED,
  DEMO_MAX_ACTIVE_TENANTS,
  DEMO_DEFAULT_PLAN_KEY,
  DEMO_MAX_EXTENSION_MINUTES,
  DEMO_RETENTION_DAYS,
  DEMO_IDLE_PURGE_HOURS,
  DEMO_STALE_SEED_MINUTES,
  DEMO_SEED_ALLOW,
  DEMO_CAPTCHA_SITE_KEY,
  DEMO_READY,
} as const
