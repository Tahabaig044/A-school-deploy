import { createClient } from "@supabase/supabase-js"

/**
 * Mobile auth helper. The Flutter app authenticates with Supabase and sends
 * its access token as `Authorization: Bearer <token>`. We never trust client
 * claims about role/schoolId — we derive the authenticated user from the token
 * server-side and let the id-card service re-check authorization per request.
 */

export async function getMobileUserFromRequest(
  req: Request,
): Promise<{ id: string; email?: string } | null> {
  const authHeader = req.headers.get("authorization") || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : ""
  if (!token) return null

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  )

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)

  if (error || !user) return null
  return { id: user.id, email: user.email ?? undefined }
}

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status })
}
