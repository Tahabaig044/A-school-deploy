import { getMobileUserFromRequest, jsonError } from "@/lib/supabase/mobile-auth"
import { prisma } from "@/lib/prisma"
import { getStudentAttendanceForMobile } from "@/services/mobile-attendance"

export async function GET(req: Request) {
  const mobileUser = await getMobileUserFromRequest(req)
  if (!mobileUser) return jsonError("Unauthorized", 401)

  const profile = await prisma.profile.findUnique({ where: { id: mobileUser.id } })
  if (!profile || profile.role !== "STUDENT") return jsonError("Forbidden", 403)

  const { searchParams } = new URL(req.url)
  const now = new Date()
  const monthParam = searchParams.get("month")
  const yearParam = searchParams.get("year")

  const month = monthParam !== null ? parseInt(monthParam, 10) : now.getMonth()
  const year = yearParam !== null ? parseInt(yearParam, 10) : now.getFullYear()

  if (isNaN(month) || month < 0 || month > 11) {
    return jsonError("Invalid month (0-11)", 400)
  }
  if (isNaN(year) || year < 2000 || year > 2100) {
    return jsonError("Invalid year", 400)
  }

  const data = await getStudentAttendanceForMobile(mobileUser.id, month, year)
  return Response.json(data)
}
