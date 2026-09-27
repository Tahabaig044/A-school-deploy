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

  const { searchParams } = new URL(req.url)
  const now = new Date()
  const monthParam = searchParams.get("month")
  const yearParam = searchParams.get("year")
  const month = monthParam !== null ? parseInt(monthParam, 10) : now.getMonth()
  const year = yearParam !== null ? parseInt(yearParam, 10) : now.getFullYear()

  if (isNaN(month) || month < 0 || month > 11) return jsonError("Invalid month (0-11)", 400)
  if (isNaN(year) || year < 2000 || year > 2100) return jsonError("Invalid year", 400)

  const startDate = new Date(year, month, 1)
  const endDate = new Date(year, month + 1, 0, 23, 59, 59)

  const attendance = await prisma.studentAttendance.findMany({
    where: {
      studentId,
      date: { gte: startDate, lte: endDate },
      academicSession: { schoolId: profile.schoolId! },
    },
    orderBy: { date: "asc" },
  })

  return Response.json({ attendance, month, year })
}
