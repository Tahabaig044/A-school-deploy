import { getMobileUserFromRequest, jsonError } from "@/lib/supabase/mobile-auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const mobileUser = await getMobileUserFromRequest(req)
  if (!mobileUser) return jsonError("Unauthorized", 401)

  const profile = await prisma.profile.findUnique({ where: { id: mobileUser.id } })
  if (!profile || profile.role !== "PARENT") return jsonError("Forbidden", 403)

  const parent = await prisma.parent.findFirst({
    where: { profileId: profile.id },
  })
  if (!parent) return jsonError("Parent profile not found", 404)

  const studentParents = await prisma.studentParent.findMany({
    where: { parentId: parent.id },
    include: {
      student: {
        include: {
          enrollments: {
            include: {
              class: true,
              section: true,
              academicSession: true,
            },
            where: { status: "ACTIVE" },
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  })

  const children = studentParents.map((sp) => ({
    id: sp.student.id,
    firstName: sp.student.firstName,
    lastName: sp.student.lastName,
    email: sp.student.email,
    admissionNo: sp.student.admissionNo,
    photoUrl: sp.student.photoUrl,
    enrollment: sp.student.enrollments[0] ?? null,
  }))

  return Response.json({ children })
}
