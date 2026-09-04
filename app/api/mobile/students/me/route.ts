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

  const assignments = await prisma.teacherAssignment.findMany({
    where: {
      teacherId: teacher.id,
      academicSessionId: currentSession.id,
    },
    include: {
      class: true,
      section: true,
      subject: true,
    },
  })

  const classSectionMap = new Map<string, { classId: string; sectionId: string | null }>()
  for (const a of assignments) {
    const key = `${a.classId}-${a.sectionId ?? ""}`
    if (!classSectionMap.has(key)) {
      classSectionMap.set(key, { classId: a.classId, sectionId: a.sectionId })
    }
  }

  const enrollmentFilters = Array.from(classSectionMap.values()).map((cs) => ({
    classId: cs.classId,
    sectionId: cs.sectionId,
    academicSessionId: currentSession.id,
    status: "ACTIVE" as const,
  }))

  const enrollments = await prisma.studentEnrollment.findMany({
    where: { OR: enrollmentFilters },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          photoUrl: true,
          admissionNo: true,
        },
      },
      class: { select: { id: true, name: true } },
      section: { select: { id: true, name: true } },
    },
    orderBy: { student: { firstName: "asc" } },
  })

  return Response.json({
    assignments,
    students: enrollments.map((e) => ({
      ...e.student,
      class: e.class,
      section: e.section,
      rollNumber: e.rollNumber,
    })),
  })
}
