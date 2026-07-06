"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"

export async function createTimetableSlot(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL")

  const classId = formData.get("classId") as string
  const sectionId = formData.get("sectionId") as string
  const subjectId = formData.get("subjectId") as string
  const teacherId = formData.get("teacherId") as string
  const dayOfWeek = formData.get("dayOfWeek") as string
  const startTime = formData.get("startTime") as string
  const endTime = formData.get("endTime") as string
  const room = formData.get("room") as string
  const academicSessionId = formData.get("academicSessionId") as string

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { schoolId: true, branchId: true },
  })

  if (!cls) return { error: "Class not found.", success: false }

  const conflict = await prisma.timetable.findFirst({
    where: {
      teacherId,
      dayOfWeek: dayOfWeek as any,
      academicSessionId,
      OR: [
        { startTime: { lte: startTime }, endTime: { gt: startTime } },
        { startTime: { lt: endTime }, endTime: { gte: endTime } },
        { startTime: { gte: startTime }, endTime: { lte: endTime } },
      ],
    },
  })

  if (conflict) {
    return { error: "Teacher already has a class scheduled at this time.", success: false }
  }

  await prisma.timetable.create({
    data: {
      school: { connect: { id: cls.schoolId } },
      branch: { connect: { id: cls.branchId } },
      class: { connect: { id: classId } },
      section: sectionId ? { connect: { id: sectionId } } : undefined,
      subject: { connect: { id: subjectId } },
      teacher: { connect: { id: teacherId } },
      dayOfWeek: dayOfWeek as any,
      startTime,
      endTime,
      room: room || null,
      academicSession: { connect: { id: academicSessionId } },
    },
  })

  revalidatePath("/dashboard/timetable")
  return { success: true, error: undefined }
}

export async function deleteTimetableSlot(slotId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  // School isolation: verify timetable slot belongs to user's school
  const existing = await prisma.timetable.findUnique({
    where: { id: slotId },
    select: { schoolId: true },
  })
  if (!existing) return
  if (profile.role !== "SUPER_ADMIN" && existing.schoolId !== profile.schoolId) return

  await prisma.timetable.delete({ where: { id: slotId } })
  revalidatePath("/dashboard/timetable")
}

export async function updateTimetableSlot(
  slotId: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL")

  const slot = await prisma.timetable.findUnique({ where: { id: slotId } })
  if (!slot) return { error: "Timetable slot not found.", success: false }

  const subjectId = formData.get("subjectId") as string
  const teacherId = formData.get("teacherId") as string
  const dayOfWeek = formData.get("dayOfWeek") as string
  const startTime = formData.get("startTime") as string
  const endTime = formData.get("endTime") as string
  const room = formData.get("room") as string

  const conflict = await prisma.timetable.findFirst({
    where: {
      id: { not: slotId },
      teacherId,
      dayOfWeek: dayOfWeek as any,
      academicSessionId: slot.academicSessionId,
      OR: [
        { startTime: { lte: startTime }, endTime: { gt: startTime } },
        { startTime: { lt: endTime }, endTime: { gte: endTime } },
        { startTime: { gte: startTime }, endTime: { lte: endTime } },
      ],
    },
  })

  if (conflict) {
    return { error: "Teacher already has a class scheduled at this time.", success: false }
  }

  await prisma.timetable.update({
    where: { id: slotId },
    data: {
      subject: { connect: { id: subjectId } },
      teacher: { connect: { id: teacherId } },
      dayOfWeek: dayOfWeek as any,
      startTime,
      endTime,
      room: room || null,
    },
  })

  revalidatePath("/dashboard/timetable")
  return { success: true, error: undefined }
}
