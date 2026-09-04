import { getMobileUserFromRequest, jsonError } from "@/lib/supabase/mobile-auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const mobileUser = await getMobileUserFromRequest(req)
  if (!mobileUser) return jsonError("Unauthorized", 401)

  const profile = await prisma.profile.findUnique({ where: { id: mobileUser.id } })
  if (!profile) return jsonError("Unauthorized", 401)
  if (!profile.schoolId) return jsonError("School not found", 404)

  const messages = await prisma.message.findMany({
    where: {
      schoolId: profile.schoolId,
      receiverId: profile.id,
      isDeleted: false,
      isDraft: false,
    },
    include: {
      sender: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return Response.json({ messages })
}
