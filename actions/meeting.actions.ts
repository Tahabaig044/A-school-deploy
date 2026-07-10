"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getSchoolId } from "@/lib/school-context"
import { z } from "zod"

const meetingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  meetingType: z.enum(["PARENT_TEACHER", "STAFF", "DEPARTMENT"]),
  startDateTime: z.string(),
  endDateTime: z.string(),
  location: z.string().optional(),
  attendeeIds: z.array(z.string().uuid()).min(1, "At least one attendee is required"),
})

export async function createMeeting(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL")
  const schoolId = getSchoolId(profile, formData, "Create Meeting")

  const title = formData.get("title") as string
  const description = formData.get("description") as string || undefined
  const meetingType = formData.get("meetingType") as string
  const startDateTime = formData.get("startDateTime") as string
  const endDateTime = formData.get("endDateTime") as string
  const location = formData.get("location") as string || undefined
  const attendeeIds = formData.get("attendeeIds") as string

  const parsed = meetingSchema.safeParse({
    title,
    description,
    meetingType,
    startDateTime,
    endDateTime,
    location,
    attendeeIds: attendeeIds ? JSON.parse(attendeeIds) : [],
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  const meeting = await prisma.meeting.create({
    data: {
      school: { connect: { id: schoolId } },
      branch: { connect: { id: profile.branchId! } },
      title: parsed.data.title,
      description: parsed.data.description,
      meetingType: parsed.data.meetingType,
      startDateTime: new Date(parsed.data.startDateTime),
      endDateTime: new Date(parsed.data.endDateTime),
      location: parsed.data.location,
      createdBy: { connect: { id: profile.id } },
      attendees: {
        create: parsed.data.attendeeIds.map((id) => ({
          profile: { connect: { id } },
        })),
      },
    },
  })

  revalidatePath("/dashboard/meetings")
  revalidatePath("/portal/teacher/meetings")
  return { success: true, error: undefined }
}

export async function updateMeetingStatus(meetingId: string, status: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL")

  await prisma.meeting.update({
    where: { id: meetingId },
    data: { status: status as any },
  })

  revalidatePath("/dashboard/meetings")
  return { success: true }
}

export async function updateAttendeeStatus(meetingId: string, profileId: string, status: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL", "TEACHER", "PARENT")

  await prisma.meetingAttendee.update({
    where: {
      meetingId_profileId: { meetingId, profileId },
    },
    data: { status },
  })

  revalidatePath("/dashboard/meetings")
  revalidatePath("/portal/teacher/meetings")
  return { success: true }
}

export async function addMeetingNote(meetingId: string, content: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL", "TEACHER")

  await prisma.meetingNote.create({
    data: {
      meeting: { connect: { id: meetingId } },
      author: { connect: { id: profile.id } },
      content,
    },
  })

  revalidatePath("/dashboard/meetings")
  return { success: true }
}

const VALID_MEETING_TYPES = ["PARENT_TEACHER", "STAFF", "DEPARTMENT"] as const

export async function getMeetings(meetingType?: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL", "TEACHER", "PARENT")

  const validType = meetingType && VALID_MEETING_TYPES.includes(meetingType as any) ? meetingType : undefined

  return prisma.meeting.findMany({
    where: {
      schoolId: profile.schoolId!,
      ...(validType ? { meetingType: validType as any } : {}),
      OR: [
        { createdById: profile.id },
        { attendees: { some: { profileId: profile.id } } },
      ],
    },
    include: {
      createdBy: { select: { firstName: true, lastName: true } },
      attendees: {
        include: {
          profile: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
      },
      notes: {
        include: {
          author: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { startDateTime: "desc" },
  })
}

export async function getMeetingById(meetingId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL", "TEACHER", "PARENT")

  return prisma.meeting.findFirst({
    where: { id: meetingId },
    include: {
      createdBy: { select: { firstName: true, lastName: true } },
      attendees: {
        include: {
          profile: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
      },
      notes: {
        include: {
          author: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      attachments: true,
    },
  })
}

export async function getTeacherAvailability(teacherId: string, date: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL", "TEACHER", "PARENT")

  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  const meetings = await prisma.meeting.findMany({
    where: {
      attendees: { some: { profileId: teacherId } },
      startDateTime: { gte: startOfDay },
      endDateTime: { lte: endOfDay },
      status: { not: "CANCELLED" },
    },
    select: {
      id: true,
      title: true,
      startDateTime: true,
      endDateTime: true,
      status: true,
    },
  })

  return meetings
}
