import { getMobileUserFromRequest, jsonError } from "@/lib/supabase/mobile-auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const mobileUser = await getMobileUserFromRequest(req)
  if (!mobileUser) return jsonError("Unauthorized", 401)

  const profile = await prisma.profile.findUnique({ where: { id: mobileUser.id } })
  if (!profile || profile.role !== "TEACHER") return jsonError("Forbidden", 403)
  if (!profile.schoolId) return jsonError("School not found", 404)

  const teacher = await prisma.teacher.findFirst({
    where: { schoolId: profile.schoolId, profileId: profile.id },
  })
  if (!teacher) return jsonError("Teacher not found", 404)

  const currentSession = await prisma.academicSession.findFirst({
    where: { schoolId: profile.schoolId, isCurrent: true },
  })
  if (!currentSession) return jsonError("No active academic session", 404)

  const slots = await prisma.timetable.findMany({
    where: {
      schoolId: profile.schoolId,
      teacherId: teacher.id,
      academicSessionId: currentSession.id,
    },
    include: {
      subject: true,
      class: true,
      section: true,
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  })

  return Response.json({ timetable: slots })
}
