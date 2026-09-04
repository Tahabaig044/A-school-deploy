import { getMobileUserFromRequest, jsonError } from "@/lib/supabase/mobile-auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const mobileUser = await getMobileUserFromRequest(req)
  if (!mobileUser) return jsonError("Unauthorized", 401)

  const profile = await prisma.profile.findUnique({ where: { id: mobileUser.id } })
  if (!profile) return jsonError("Unauthorized", 401)

  const announcement = await prisma.announcement.findUnique({ where: { id } })
  if (!announcement) return jsonError("Announcement not found", 404)
  if (announcement.schoolId !== profile.schoolId) return jsonError("Forbidden", 403)

  const read = await prisma.announcementRead.upsert({
    where: {
      announcementId_profileId: { announcementId: id, profileId: profile.id },
    },
    create: {
      announcementId: id,
      profileId: profile.id,
    },
    update: {},
  })

  return Response.json({ read })
}
