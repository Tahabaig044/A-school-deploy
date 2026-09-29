import "server-only"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * Stateless service-role Supabase client.
 *
 * Why this exists and why `lib/supabase/server.ts` cannot be reused:
 * both factories in that module call `await cookies()`, so they only work inside a
 * request scope. The demo seed worker runs under Next.js `after()`, and the purge
 * job runs from a cron callback — neither has a cookie jar, and `createClient()`
 * would throw. There is also no need for session persistence here, which is why
 * `@supabase/supabase-js` is used directly instead of `@supabase/ssr`.
 *
 * SECURITY: the service-role key bypasses Row Level Security and every
 * authorization check. `import "server-only"` makes an accidental import from a
 * client component a build error rather than a leaked credential. Never import
 * this from a `"use client"` file, and never return its result to the browser.
 */

let cached: SupabaseClient | null = null

export function createAdminClient(): SupabaseClient {
  if (cached) return cached

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "The admin client cannot be created.",
    )
  }

  cached = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })

  return cached
}

/**
 * Resets the cached client. Used by long-lived scripts that rotate credentials,
 * and by tests.
 */
export function resetAdminClient(): void {
  cached = null
}
