import { getMobileUserFromRequest, jsonError } from "@/lib/supabase/mobile-auth"
import { prisma } from "@/lib/prisma"
import { isValidUuid } from "@/lib/validate-uuid"

export async function GET(req: Request) {
  const mobileUser = await getMobileUserFromRequest(req)
  if (!mobileUser) return jsonError("Unauthorized", 401)

  const profile = await prisma.profile.findUnique({ where: { id: mobileUser.id } })
  if (!profile || profile.role !== "STUDENT") return jsonError("Forbidden", 403)
  if (!profile.schoolId) return jsonError("School not found", 404)

  const { searchParams } = new URL(req.url)
  const academicSessionId = searchParams.get("academicSessionId")

  const student = await prisma.student.findFirst({
    where: { schoolId: profile.schoolId, email: profile.email },
  })
  if (!student) return jsonError("Student not found", 404)

  let sessionFilter: { schoolId: string; isCurrent?: boolean; id?: string } = {
    schoolId: profile.schoolId,
  }
  if (academicSessionId) {
    if (!isValidUuid(academicSessionId)) return jsonError("Invalid academicSessionId format", 400)
    sessionFilter.id = academicSessionId
  } else {
    sessionFilter.isCurrent = true
  }

  const session = await prisma.academicSession.findFirst({ where: sessionFilter })
  if (!session) return jsonError("Academic session not found", 404)

  const enrollment = await prisma.studentEnrollment.findFirst({
    where: {
      studentId: student.id,
      academicSessionId: session.id,
      status: "ACTIVE",
    },
  })
  if (!enrollment) return jsonError("No enrollment found", 404)

  const reportCards = await prisma.reportCard.findMany({
    where: {
      studentId: student.id,
      academicSessionId: session.id,
    },
    include: {
      exam: {
        include: {
          subject: true,
          examType: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const results = reportCards.map((rc) => ({
    examId: rc.examId,
    examName: rc.exam.name,
    examType: rc.exam.examType.name,
    subject: rc.exam.subject,
    totalMarks: rc.totalMarks,
    obtainedMarks: rc.obtainedMarks,
    percentage: rc.percentage,
    grade: rc.grade,
    rank: rc.rank,
    examDate: rc.exam.examDate,
    isPublished: rc.isPublished,
  }))

  return Response.json({ results, academicSession: session })
}
