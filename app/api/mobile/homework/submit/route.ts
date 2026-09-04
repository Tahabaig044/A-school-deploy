import { getMobileUserFromRequest, jsonError } from "@/lib/supabase/mobile-auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const mobileUser = await getMobileUserFromRequest(req)
  if (!mobileUser) return jsonError("Unauthorized", 401)

  const profile = await prisma.profile.findUnique({ where: { id: mobileUser.id } })
  if (!profile || profile.role !== "STUDENT") return jsonError("Forbidden", 403)
  if (!profile.schoolId) return jsonError("School not found", 404)

  let body: { homeworkId?: string; content?: string }
  try {
    body = await req.json()
  } catch {
    return jsonError("Invalid request body", 400)
  }

  if (!body.homeworkId) return jsonError("homeworkId is required", 400)

  const student = await prisma.student.findFirst({
    where: { schoolId: profile.schoolId, email: profile.email },
  })
  if (!student) return jsonError("Student not found", 404)

  const homework = await prisma.homework.findUnique({
    where: { id: body.homeworkId },
  })
  if (!homework) return jsonError("Homework not found", 404)
  if (homework.schoolId !== profile.schoolId) return jsonError("Forbidden", 403)
  if (!homework.isActive) return jsonError("Homework is no longer active", 400)

  const existing = await prisma.homeworkSubmission.findFirst({
    where: { homeworkId: body.homeworkId, studentId: student.id },
  })
  if (existing) return jsonError("Already submitted", 400)

  const isLate = new Date() > homework.dueDate

  const submission = await prisma.homeworkSubmission.create({
    data: {
      homeworkId: body.homeworkId,
      studentId: student.id,
      content: body.content,
      isLate,
      status: "SUBMITTED",
    },
  })

  return Response.json({ submission }, { status: 201 })
}
