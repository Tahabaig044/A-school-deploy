"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"

function timeOverlaps(start1: string, end1: string, start2: string, end2: string) {
  return start1 < end2 && start2 < end1
}

export async function createTimetableSlot(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL")

  const classId = formData.get("classId") as string
  const sectionId = (formData.get("sectionId") as string) || undefined
  const subjectId = formData.get("subjectId") as string
  const teacherId = formData.get("teacherId") as string
  const dayOfWeek = formData.get("dayOfWeek") as string
  const startTime = formData.get("startTime") as string
  const endTime = formData.get("endTime") as string
  const room = (formData.get("room") as string) || undefined
  const academicSessionId = formData.get("academicSessionId") as string

  if (startTime >= endTime) {
    return { error: "End time must be after start time.", success: false }
  }

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { schoolId: true, branchId: true },
  })
  if (!cls) return { error: "Class not found.", success: false }

  const teacherConflictPromise = prisma.timetable.findFirst({
    where: {
      teacherId,
      dayOfWeek: dayOfWeek as any,
      academicSessionId,
      id: { not: undefined },
    },
  })

  const classWhere: any = {
    classId,
    dayOfWeek: dayOfWeek as any,
    academicSessionId,
  }
  if (sectionId) {
    classWhere.OR = [
      { sectionId },
      { sectionId: null },
    ]
  }
  const classConflictPromise = prisma.timetable.findFirst({ where: classWhere })

  const roomConflictPromise = room
    ? prisma.timetable.findFirst({
        where: {
          room,
          dayOfWeek: dayOfWeek as any,
          academicSessionId,
        },
      })
    : Promise.resolve(null)

  const [teacherConflict, classConflict, roomConflict] = await Promise.all([
    teacherConflictPromise,
    classConflictPromise,
    roomConflictPromise,
  ])

  if (teacherConflict && timeOverlaps(teacherConflict.startTime, teacherConflict.endTime, startTime, endTime)) {
    return { error: `Teacher already has a class at ${teacherConflict.startTime}-${teacherConflict.endTime}.`, success: false }
  }

  if (classConflict && timeOverlaps(classConflict.startTime, classConflict.endTime, startTime, endTime)) {
    return { error: `Class already has a slot at ${classConflict.startTime}-${classConflict.endTime}.`, success: false }
  }

  if (roomConflict && timeOverlaps(roomConflict.startTime, roomConflict.endTime, startTime, endTime)) {
    return { error: `Room "${room}" is already booked at ${roomConflict.startTime}-${roomConflict.endTime}.`, success: false }
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
  const room = (formData.get("room") as string) || undefined

  if (startTime >= endTime) {
    return { error: "End time must be after start time.", success: false }
  }

  const teacherConflictPromise = prisma.timetable.findFirst({
    where: {
      id: { not: slotId },
      teacherId,
      dayOfWeek: dayOfWeek as any,
      academicSessionId: slot.academicSessionId,
    },
  })

  const classWhere: any = {
    id: { not: slotId },
    classId: slot.classId,
    dayOfWeek: dayOfWeek as any,
    academicSessionId: slot.academicSessionId,
  }
  if (slot.sectionId) {
    classWhere.OR = [
      { sectionId: slot.sectionId },
      { sectionId: null },
    ]
  }
  const classConflictPromise = prisma.timetable.findFirst({ where: classWhere })

  const roomConflictPromise = room
    ? prisma.timetable.findFirst({
        where: {
          id: { not: slotId },
          room,
          dayOfWeek: dayOfWeek as any,
          academicSessionId: slot.academicSessionId,
        },
      })
    : Promise.resolve(null)

  const [teacherConflict, classConflict, roomConflict] = await Promise.all([
    teacherConflictPromise,
    classConflictPromise,
    roomConflictPromise,
  ])

  if (teacherConflict && timeOverlaps(teacherConflict.startTime, teacherConflict.endTime, startTime, endTime)) {
    return { error: `Teacher already has a class at ${teacherConflict.startTime}-${teacherConflict.endTime}.`, success: false }
  }

  if (classConflict && timeOverlaps(classConflict.startTime, classConflict.endTime, startTime, endTime)) {
    return { error: `Class already has a slot at ${classConflict.startTime}-${classConflict.endTime}.`, success: false }
  }

  if (roomConflict && timeOverlaps(roomConflict.startTime, roomConflict.endTime, startTime, endTime)) {
    return { error: `Room "${room}" is already booked at ${roomConflict.startTime}-${roomConflict.endTime}.`, success: false }
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

export async function getAllConflicts(academicSessionId: string) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL")

  const slots = await prisma.timetable.findMany({
    where: { academicSessionId },
    include: {
      class: true,
      section: true,
      subject: true,
      teacher: true,
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  })

  const conflicts: any[] = []

  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i]
      const b = slots[j]

      if (a.dayOfWeek !== b.dayOfWeek) continue
      if (!timeOverlaps(a.startTime, a.endTime, b.startTime, b.endTime)) continue

      if (a.teacherId === b.teacherId) {
        conflicts.push({
          type: "TEACHER",
          message: `Teacher ${a.teacher.firstName} ${a.teacher.lastName} is double-booked`,
          slotA: a,
          slotB: b,
        })
      }

      if (a.room && a.room === b.room) {
        conflicts.push({
          type: "ROOM",
          message: `Room "${a.room}" is double-booked`,
          slotA: a,
          slotB: b,
        })
      }

      if (a.classId === b.classId && a.sectionId === b.sectionId) {
        conflicts.push({
          type: "CLASS",
          message: `${a.class.name}${a.section ? `-${a.section.name}` : ""} is double-booked`,
          slotA: a,
          slotB: b,
        })
      }
    }
  }

  return conflicts
}

export async function getRoomUtilization(academicSessionId: string) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL")

  const slots = await prisma.timetable.findMany({
    where: { academicSessionId, room: { not: null } },
    include: { class: true, section: true, subject: true, teacher: true },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  })

  const roomMap: Record<string, any[]> = {}
  for (const slot of slots) {
    const room = slot.room!
    if (!roomMap[room]) roomMap[room] = []
    roomMap[room].push(slot)
  }

  return Object.entries(roomMap).map(([room, bookings]) => ({
    room,
    bookings,
    totalSlots: bookings.length,
  }))
}

export async function getTimetableForClass(classId: string, sectionId?: string, academicSessionId?: string) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL", "TEACHER")

  return prisma.timetable.findMany({
    where: {
      classId,
      ...(sectionId && { sectionId }),
      ...(academicSessionId && { academicSessionId }),
    },
    include: {
      subject: true,
      teacher: { select: { firstName: true, lastName: true } },
      section: true,
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  })
}
