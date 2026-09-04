import { getMobileUserFromRequest, jsonError } from "@/lib/supabase/mobile-auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const mobileUser = await getMobileUserFromRequest(req)
  if (!mobileUser) return jsonError("Unauthorized", 401)

  const profile = await prisma.profile.findUnique({ where: { id: mobileUser.id } })
  if (!profile) return jsonError("Unauthorized", 401)

  const notifications = await prisma.notification.findMany({
    where: { userId: profile.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return Response.json({ notifications })
}
