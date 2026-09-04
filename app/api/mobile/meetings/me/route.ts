import { getMobileUserFromRequest, jsonError } from "@/lib/supabase/mobile-auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const mobileUser = await getMobileUserFromRequest(req)
  if (!mobileUser) return jsonError("Unauthorized", 401)

  const profile = await prisma.profile.findUnique({ where: { id: mobileUser.id } })
  if (!profile) return jsonError("Unauthorized", 401)
  if (!profile.schoolId) return jsonError("School not found", 404)

  const attendees = await prisma.meetingAttendee.findMany({
    where: {
      profileId: profile.id,
      meeting: { schoolId: profile.schoolId },
    },
    include: {
      meeting: {
        include: {
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  })

  const meetings = attendees.map((a) => ({
    ...a.meeting,
    attendeeStatus: a.status,
    notes: a.notes,
  }))

  return Response.json({ meetings })
}
