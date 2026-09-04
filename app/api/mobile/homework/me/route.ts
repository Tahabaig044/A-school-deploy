import { getMobileUserFromRequest, jsonError } from "@/lib/supabase/mobile-auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const mobileUser = await getMobileUserFromRequest(req)
  if (!mobileUser) return jsonError("Unauthorized", 401)

  const profile = await prisma.profile.findUnique({ where: { id: mobileUser.id } })
  if (!profile || profile.role !== "STUDENT") return jsonError("Forbidden", 403)
  if (!profile.schoolId) return jsonError("School not found", 404)

  const student = await prisma.student.findFirst({
    where: { schoolId: profile.schoolId, email: profile.email },
  })
  if (!student) return jsonError("Student not found", 404)

  const currentSession = await prisma.academicSession.findFirst({
    where: { schoolId: profile.schoolId, isCurrent: true },
  })
  if (!currentSession) return jsonError("No active academic session", 404)

  const enrollment = await prisma.studentEnrollment.findFirst({
    where: {
      studentId: student.id,
      academicSessionId: currentSession.id,
      status: "ACTIVE",
    },
  })
  if (!enrollment) return jsonError("No active enrollment found", 404)

  const homework = await prisma.homework.findMany({
    where: {
      schoolId: profile.schoolId,
      classId: enrollment.classId,
      sectionId: enrollment.sectionId,
      academicSessionId: currentSession.id,
      isActive: true,
    },
    include: {
      subject: true,
      submissions: {
        where: { studentId: student.id },
      },
    },
    orderBy: { dueDate: "desc" },
  })

  const result = homework.map((hw) => ({
    id: hw.id,
    title: hw.title,
    description: hw.description,
    dueDate: hw.dueDate,
    totalMarks: hw.totalMarks,
    subject: hw.subject,
    submission: hw.submissions[0] ?? null,
  }))

  return Response.json({ homework: result })
}
