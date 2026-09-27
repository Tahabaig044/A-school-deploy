import { getMobileUserFromRequest, jsonError } from "@/lib/supabase/mobile-auth"
import { prisma } from "@/lib/prisma"
import { isValidUuid } from "@/lib/validate-uuid"

export async function GET(req: Request) {
  const mobileUser = await getMobileUserFromRequest(req)
  if (!mobileUser) return jsonError("Unauthorized", 401)

  const profile = await prisma.profile.findUnique({ where: { id: mobileUser.id } })
  if (!profile || profile.role !== "TEACHER") return jsonError("Forbidden", 403)
  if (!profile.schoolId) return jsonError("School not found", 404)

  const { searchParams } = new URL(req.url)
  const examId = searchParams.get("examId")
  if (!examId) return jsonError("examId is required", 400)
  if (!isValidUuid(examId)) return jsonError("Invalid examId format", 400)

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { subject: true, class: true, examType: true },
  })
  if (!exam) return jsonError("Exam not found", 404)
  if (exam.schoolId !== profile.schoolId) return jsonError("Forbidden", 403)

  const results = await prisma.examResult.findMany({
    where: { examId },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          admissionNo: true,
        },
      },
    },
    orderBy: { marksObtained: "desc" },
  })

  return Response.json({ exam, results })
}
