"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getSchoolId } from "@/lib/school-context"
import { z } from "zod"

const calendarEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  eventType: z.enum(["HOLIDAY", "EXAM", "EVENT", "MEETING", "ACADEMIC_SESSION", "OTHER"]),
  startDate: z.string(),
  endDate: z.string(),
  isAllDay: z.boolean().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  color: z.string().optional(),
  academicSessionId: z.string().uuid().optional(),
})

export async function createCalendarEvent(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")
  const schoolId = getSchoolId(profile, formData, "Create Calendar Event")

  const title = formData.get("title") as string
  const description = formData.get("description") as string || undefined
  const eventType = formData.get("eventType") as string
  const startDate = formData.get("startDate") as string
  const endDate = formData.get("endDate") as string
  const isAllDay = formData.get("isAllDay") === "true"
  const startTime = formData.get("startTime") as string || undefined
  const endTime = formData.get("endTime") as string || undefined
  const color = formData.get("color") as string || undefined
  const academicSessionId = formData.get("academicSessionId") as string || undefined

  const parsed = calendarEventSchema.safeParse({
    title,
    description,
    eventType,
    startDate,
    endDate,
    isAllDay,
    startTime,
    endTime,
    color,
    academicSessionId,
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
    startDate: new Date(parsed.data.startDate),
    endDate: new Date(parsed.data.endDate),
    isAllDay: parsed.data.isAllDay ?? true,
    startTime: parsed.data.startTime,
    endTime: parsed.data.endTime,
    color: parsed.data.color,
    createdBy: { connect: { id: profile.id } },
  }

  if (parsed.data.academicSessionId) {
    data.academicSession = { connect: { id: parsed.data.academicSessionId } }
  }

  await prisma.calendarEvent.create({ data })

  revalidatePath("/dashboard/calendar")
  return { success: true, error: undefined }
}

export async function updateCalendarEvent(
  eventId: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const title = formData.get("title") as string
  const description = formData.get("description") as string || undefined
  const eventType = formData.get("eventType") as string
  const startDate = formData.get("startDate") as string
  const endDate = formData.get("endDate") as string
  const isAllDay = formData.get("isAllDay") === "true"
  const startTime = formData.get("startTime") as string || undefined
  const endTime = formData.get("endTime") as string || undefined
  const color = formData.get("color") as string || undefined

  await prisma.calendarEvent.update({
    where: { id: eventId },
    data: {
      title,
      description,
      eventType: eventType as any,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isAllDay,
      startTime,
      endTime,
      color,
    },
  })

  revalidatePath("/dashboard/calendar")
  return { success: true, error: undefined }
}

export async function deleteCalendarEvent(eventId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  await prisma.calendarEvent.delete({
    where: { id: eventId },
  })

  revalidatePath("/dashboard/calendar")
  return { success: true }
}

export async function getCalendarEvents(startDate?: string, endDate?: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PARENT", "STUDENT")

  const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const end = endDate ? new Date(endDate) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)

  return prisma.calendarEvent.findMany({
    where: {
      schoolId: profile.schoolId!,
      startDate: { lte: end },
      endDate: { gte: start },
    },
    include: {
      createdBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { startDate: "asc" },
  })
}

export async function getCalendarEventById(eventId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PARENT", "STUDENT")

  return prisma.calendarEvent.findFirst({
    where: { id: eventId },
    include: {
      createdBy: { select: { firstName: true, lastName: true } },
    },
  })
}

export async function getHolidays() {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PARENT", "STUDENT")

  return prisma.calendarEvent.findMany({
    where: {
      schoolId: profile.schoolId!,
      eventType: "HOLIDAY",
      endDate: { gte: new Date() },
    },
    orderBy: { startDate: "asc" },
  })
}

export async function getExamSchedule() {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PARENT", "STUDENT")

  return prisma.calendarEvent.findMany({
    where: {
      schoolId: profile.schoolId!,
      eventType: "EXAM",
      endDate: { gte: new Date() },
    },
    orderBy: { startDate: "asc" },
  })
}
