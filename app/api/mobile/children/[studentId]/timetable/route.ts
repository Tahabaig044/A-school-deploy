import { getMobileUserFromRequest, jsonError } from "@/lib/supabase/mobile-auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params
  const mobileUser = await getMobileUserFromRequest(req)
  if (!mobileUser) return jsonError("Unauthorized", 401)

  const profile = await prisma.profile.findUnique({ where: { id: mobileUser.id } })
  if (!profile || profile.role !== "PARENT") return jsonError("Forbidden", 403)

  const parent = await prisma.parent.findFirst({
    where: { profileId: profile.id },
  })
  if (!parent) return jsonError("Parent profile not found", 404)

  const studentParent = await prisma.studentParent.findFirst({
    where: { parentId: parent.id, studentId },
  })
  if (!studentParent) return jsonError("Not authorized for this student", 403)

  const student = await prisma.student.findUnique({ where: { id: studentId } })
  if (!student) return jsonError("Student not found", 404)

  const currentSession = await prisma.academicSession.findFirst({
    where: { schoolId: student.schoolId, isCurrent: true },
  })
  if (!currentSession) return jsonError("No active academic session", 404)

  const enrollment = await prisma.studentEnrollment.findFirst({
    where: {
      studentId,
      academicSessionId: currentSession.id,
      status: "ACTIVE",
    },
  })
  if (!enrollment) return jsonError("No active enrollment found", 404)

  const slots = await prisma.timetable.findMany({
    where: {
      schoolId: student.schoolId,
      classId: enrollment.classId,
      sectionId: enrollment.sectionId,
      academicSessionId: currentSession.id,
    },
    include: {
      subject: true,
      teacher: true,
      class: true,
      section: true,
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  })

  return Response.json({ timetable: slots })
}
