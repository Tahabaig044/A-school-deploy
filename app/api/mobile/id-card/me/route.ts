import { getMobileUserFromRequest, jsonError } from "@/lib/supabase/mobile-auth"
import { getMyIdCardForProfile } from "@/services/id-card"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const mobileUser = await getMobileUserFromRequest(req)
  if (!mobileUser) return jsonError("Unauthorized", 401)

  const profile = await prisma.profile.findUnique({ where: { id: mobileUser.id } })
  if (!profile) return jsonError("Unauthorized", 401)

  const data = await getMyIdCardForProfile(profile)
  if (!data) return jsonError("ID card not available", 404)

  return Response.json({ card: data })
}
