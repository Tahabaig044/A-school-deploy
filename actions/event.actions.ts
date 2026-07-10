"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getSchoolId } from "@/lib/school-context"
import { z } from "zod"

const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  eventType: z.enum(["SCHOOL", "BRANCH", "CLASS"]),
  startDateTime: z.string(),
  endDateTime: z.string(),
  location: z.string().optional(),
  isRegistrationRequired: z.boolean().optional(),
  maxParticipants: z.number().optional(),
  classId: z.string().uuid().optional(),
  sectionId: z.string().uuid().optional(),
})

export async function createEvent(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")
  const schoolId = getSchoolId(profile, formData, "Create Event")

  const title = formData.get("title") as string
  const description = formData.get("description") as string || undefined
  const eventType = formData.get("eventType") as string
  const startDateTime = formData.get("startDateTime") as string
  const endDateTime = formData.get("endDateTime") as string
  const location = formData.get("location") as string || undefined
  const isRegistrationRequired = formData.get("isRegistrationRequired") === "true"
  const maxParticipants = formData.get("maxParticipants") ? Number(formData.get("maxParticipants")) : undefined
  const classId = formData.get("classId") as string || undefined
  const sectionId = formData.get("sectionId") as string || undefined

  const parsed = eventSchema.safeParse({
    title,
    description,
    eventType,
    startDateTime,
    endDateTime,
    location,
    isRegistrationRequired,
    maxParticipants,
    classId,
    sectionId,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  const data: any = {
    school: { connect: { id: schoolId } },
    branch: { connect: { id: profile.branchId! } },
    title: parsed.data.title,
    description: parsed.data.description,
    eventType: parsed.data.eventType,
    startDateTime: new Date(parsed.data.startDateTime),
    endDateTime: new Date(parsed.data.endDateTime),
    location: parsed.data.location,
    isRegistrationRequired: parsed.data.isRegistrationRequired || false,
    maxParticipants: parsed.data.maxParticipants,
    createdBy: { connect: { id: profile.id } },
  }

  if (parsed.data.classId) {
    data.class = { connect: { id: parsed.data.classId } }
  }
  if (parsed.data.sectionId) {
    data.section = { connect: { id: parsed.data.sectionId } }
  }

  await prisma.event.create({ data })

  revalidatePath("/dashboard/events")
  return { success: true, error: undefined }
}

export async function updateEventStatus(eventId: string, status: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  await prisma.event.update({
    where: { id: eventId },
    data: { status: status as any },
  })

  revalidatePath("/dashboard/events")
  return { success: true }
}

export async function registerForEvent(eventId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PARENT", "STUDENT")

  const event = await prisma.event.findFirst({
    where: { id: eventId },
    include: { _count: { select: { registrations: true } } },
  })

  if (!event) throw new Error("Event not found")
  if (event.maxParticipants && event._count.registrations >= event.maxParticipants) {
    throw new Error("Event is full")
  }

  await prisma.eventRegistration.create({
    data: {
      event: { connect: { id: eventId } },
      profile: { connect: { id: profile.id } },
    },
  })

  revalidatePath("/dashboard/events")
  revalidatePath("/portal/teacher/events")
  revalidatePath("/portal/student/events")
  revalidatePath("/portal/parent/events")
  return { success: true }
}

export async function cancelEventRegistration(eventId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PARENT", "STUDENT")

  await prisma.eventRegistration.delete({
    where: {
      eventId_profileId: { eventId, profileId: profile.id },
    },
  })

  revalidatePath("/dashboard/events")
  revalidatePath("/portal/teacher/events")
  revalidatePath("/portal/student/events")
  revalidatePath("/portal/parent/events")
  return { success: true }
}

export async function getEvents(eventType?: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PARENT", "STUDENT")

  return prisma.event.findMany({
    where: {
      schoolId: profile.schoolId!,
      status: "PUBLISHED",
      ...(eventType ? { eventType: eventType as any } : {}),
    },
    include: {
      createdBy: { select: { firstName: true, lastName: true } },
      _count: { select: { registrations: true } },
      registrations: {
        where: { profileId: profile.id },
        select: { id: true },
      },
    },
    orderBy: { startDateTime: "desc" },
  })
}

export async function getEventById(eventId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PARENT", "STUDENT")

  return prisma.event.findFirst({
    where: { id: eventId },
    include: {
      createdBy: { select: { firstName: true, lastName: true } },
      _count: { select: { registrations: true } },
      registrations: {
        include: {
          profile: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
      },
      attachments: true,
    },
  })
}

export async function getUpcomingEvents() {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PARENT", "STUDENT")

  return prisma.event.findMany({
    where: {
      schoolId: profile.schoolId!,
      status: "PUBLISHED",
      startDateTime: { gte: new Date() },
    },
    include: {
      _count: { select: { registrations: true } },
    },
    orderBy: { startDateTime: "asc" },
    take: 10,
  })
}
