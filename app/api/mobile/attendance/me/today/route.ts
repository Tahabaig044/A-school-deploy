import { getMobileUserFromRequest, jsonError } from "@/lib/supabase/mobile-auth"
import { prisma } from "@/lib/prisma"
import { getStudentTodayAttendance } from "@/services/mobile-attendance"

export async function GET(req: Request) {
  const mobileUser = await getMobileUserFromRequest(req)
  if (!mobileUser) return jsonError("Unauthorized", 401)

  const profile = await prisma.profile.findUnique({ where: { id: mobileUser.id } })
  if (!profile || profile.role !== "STUDENT") return jsonError("Forbidden", 403)

  const record = await getStudentTodayAttendance(mobileUser.id)
  return Response.json({ record })
}
