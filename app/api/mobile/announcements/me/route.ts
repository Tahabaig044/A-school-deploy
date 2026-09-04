import { getMobileUserFromRequest, jsonError } from "@/lib/supabase/mobile-auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const mobileUser = await getMobileUserFromRequest(req)
  if (!mobileUser) return jsonError("Unauthorized", 401)

  const profile = await prisma.profile.findUnique({ where: { id: mobileUser.id } })
  if (!profile) return jsonError("Unauthorized", 401)
  if (!profile.schoolId) return jsonError("School not found", 404)

  const announcements = await prisma.announcement.findMany({
    where: {
      schoolId: profile.schoolId,
      isPublished: true,
    },
    include: {
      author: {
        select: { id: true, firstName: true, lastName: true },
      },
      reads: {
        where: { profileId: profile.id },
        select: { readAt: true },
      },
    },
    orderBy: { publishedAt: "desc" },
  })

  const result = announcements.map((a) => ({
    id: a.id,
    title: a.title,
    content: a.content,
    audience: a.audience,
    publishedAt: a.publishedAt,
    author: a.author,
    isRead: a.reads.length > 0,
    readAt: a.reads[0]?.readAt ?? null,
  }))

  return Response.json({ announcements: result })
}
