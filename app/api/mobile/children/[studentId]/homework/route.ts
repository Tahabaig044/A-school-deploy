import { getMobileUserFromRequest, jsonError } from "@/lib/supabase/mobile-auth"
import { prisma } from "@/lib/prisma"
import { isValidUuid } from "@/lib/validate-uuid"

export async function GET(req: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params
  if (!isValidUuid(studentId)) return jsonError("Invalid student ID format", 400)
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

  const homework = await prisma.homework.findMany({
    where: {
      schoolId: student.schoolId,
      classId: enrollment.classId,
      sectionId: enrollment.sectionId,
      academicSessionId: currentSession.id,
      isActive: true,
    },
    include: {
      subject: true,
      submissions: {
        where: { studentId },
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
