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

  const { searchParams } = new URL(req.url)
  const academicSessionId = searchParams.get("academicSessionId")

  let sessionFilter: { schoolId: string; isCurrent?: boolean; id?: string } = {
    schoolId: student.schoolId,
  }
  if (academicSessionId) {
    sessionFilter.id = academicSessionId
  } else {
    sessionFilter.isCurrent = true
  }

  const session = await prisma.academicSession.findFirst({ where: sessionFilter })
  if (!session) return jsonError("Academic session not found", 404)

  const reportCards = await prisma.reportCard.findMany({
    where: {
      studentId,
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
