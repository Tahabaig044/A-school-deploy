import { getMobileUserFromRequest, jsonError } from "@/lib/supabase/mobile-auth"
import { requireIdCardVerifierForProfile, verifyIdCardToken } from "@/services/id-card"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const mobileUser = await getMobileUserFromRequest(req)
  if (!mobileUser) return jsonError("Unauthorized", 401)

  const actor = await prisma.profile.findUnique({ where: { id: mobileUser.id } })
  if (!actor) return jsonError("Unauthorized", 401)

  const allowed = await requireIdCardVerifierForProfile(actor)
  if (!allowed) return jsonError("Forbidden", 403)

  let body: { token?: string }
  try {
    body = await req.json()
  } catch {
    return jsonError("Invalid JSON", 400)
  }

  const token = body?.token?.trim()
  if (!token) return jsonError("Missing token", 400)

  const verification = await verifyIdCardToken(token, {
    role: actor.role,
    schoolId: actor.schoolId,
    id: actor.id,
  })

  if (!verification.verified && verification.reason === "UNAUTHORIZED") {
    return jsonError("Forbidden", 403)
  }

  return Response.json(verification)
}