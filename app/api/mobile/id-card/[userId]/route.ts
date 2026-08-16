import { getMobileUserFromRequest, jsonError } from "@/lib/supabase/mobile-auth"
import { getIdCardDataForUserForProfile } from "@/services/id-card"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params

  const mobileUser = await getMobileUserFromRequest(req)
  if (!mobileUser) return jsonError("Unauthorized", 401)

  const actor = await prisma.profile.findUnique({ where: { id: mobileUser.id } })
  if (!actor) return jsonError("Unauthorized", 401)

  const data = await getIdCardDataForUserForProfile(actor, userId)
  if (!data) return jsonError("ID card not found or not authorized", 404)

  return Response.json({ card: data })
}