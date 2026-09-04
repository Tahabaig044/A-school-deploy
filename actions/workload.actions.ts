"use server"

import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const WORKLOAD_DEFAULTS_KEY = "workload_defaults"

export async function getTeacherWorkload(schoolId: string, academicSessionId?: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL")
  if (profile.role !== "SUPER_ADMIN" && profile.schoolId !== schoolId) return []

  const teachers = await prisma.teacher.findMany({
    where: { schoolId, status: "ACTIVE" },
    include: {
      assignments: {
        where: academicSessionId ? { academicSessionId } : {},
        include: { class: true, section: true, subject: true },
      },
    },
  })

  const slotWhere: any = { teacher: { schoolId } }
  if (academicSessionId) slotWhere.academicSessionId = academicSessionId

  const allSlots = await prisma.timetable.findMany({
    where: slotWhere,
    select: { teacherId: true, dayOfWeek: true, startTime: true, endTime: true },
  })

  const slotsByTeacher: Record<string, typeof allSlots> = {}
  for (const slot of allSlots) {
    if (!slot.teacherId) continue
    if (!slotsByTeacher[slot.teacherId]) slotsByTeacher[slot.teacherId] = []
    slotsByTeacher[slot.teacherId].push(slot)
  }

  const defaults = await getWorkloadDefaults(schoolId)

  return teachers.map((teacher) => {
    const slots = slotsByTeacher[teacher.id] || []
    const totalPeriods = slots.length

    const periodsByDay: Record<string, number> = {}
    for (const slot of slots) {
      periodsByDay[slot.dayOfWeek] = (periodsByDay[slot.dayOfWeek] || 0) + 1
    }

    const maxPerDay = teacher.maxPeriodsPerDay || defaults.maxPeriodsPerDay
    const maxPerWeek = teacher.maxPeriodsPerWeek || defaults.maxPeriodsPerWeek
    const overloadedDays = Object.entries(periodsByDay)
      .filter(([, count]) => maxPerDay && count > maxPerDay)
      .map(([day]) => day)

    const isOverloaded = (maxPerWeek && totalPeriods > maxPerWeek) || overloadedDays.length > 0
    const isUnderloaded = maxPerWeek && totalPeriods < Math.ceil(maxPerWeek * 0.6)

    return {
      teacherId: teacher.id,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      employeeCode: teacher.employeeCode,
      department: teacher.department,
      designation: teacher.designation,
      maxPeriodsPerDay: maxPerDay,
      maxPeriodsPerWeek: maxPerWeek,
      totalPeriods,
      periodsByDay,
      overloadedDays,
      totalAssignments: teacher.assignments.length,
      isOverloaded,
      isUnderloaded,
    }
  })
}

export async function getTeacherWorkloadDetail(teacherId: string, academicSessionId?: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL")

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: {
      schoolId: true,
      firstName: true,
      lastName: true,
      employeeCode: true,
      department: true,
      designation: true,
      maxPeriodsPerDay: true,
      maxPeriodsPerWeek: true,
    },
  })
  if (!teacher) return null
  if (profile.role !== "SUPER_ADMIN" && profile.schoolId !== teacher.schoolId) return null

  const defaults = await getWorkloadDefaults(teacher.schoolId)

  let activeSessionId = academicSessionId
  if (!activeSessionId) {
    const session = await prisma.academicSession.findFirst({
      where: { schoolId: teacher.schoolId, isCurrent: true },
      select: { id: true },
    })
    if (session) activeSessionId = session.id
  }

  const [timetableSlots, assignments] = await Promise.all([
    prisma.timetable.findMany({
      where: { teacherId, ...(activeSessionId ? { academicSessionId: activeSessionId } : {}) },
      include: {
        class: { select: { name: true } },
        section: { select: { name: true } },
        subject: { select: { name: true, code: true } },
      },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
    prisma.teacherAssignment.findMany({
      where: { teacherId, ...(activeSessionId ? { academicSessionId: activeSessionId } : {}) },
      include: {
        class: { select: { name: true } },
        section: { select: { name: true } },
        subject: { select: { name: true, code: true } },
      },
    }),
  ])

  const periodsByDay: Record<string, { count: number; slots: typeof timetableSlots }> = {}
  for (const slot of timetableSlots) {
    if (!periodsByDay[slot.dayOfWeek]) periodsByDay[slot.dayOfWeek] = { count: 0, slots: [] }
    periodsByDay[slot.dayOfWeek].count++
    periodsByDay[slot.dayOfWeek].slots.push(slot)
  }

  const maxPerDay = teacher.maxPeriodsPerDay || defaults.maxPeriodsPerDay
  const maxPerWeek = teacher.maxPeriodsPerWeek || defaults.maxPeriodsPerWeek
  const totalPeriods = timetableSlots.length

  return {
    teacher,
    defaults,
    totalPeriods,
    periodsByDay,
    maxPeriodsPerDay: maxPerDay,
    maxPeriodsPerWeek: maxPerWeek,
    isOverloaded:
      (maxPerWeek && totalPeriods > maxPerWeek) ||
      Object.values(periodsByDay).some((d) => maxPerDay && d.count > maxPerDay),
    isUnderloaded: maxPerWeek ? totalPeriods < Math.ceil(maxPerWeek * 0.6) : false,
    weeklySlots: timetableSlots,
    assignments,
  }
}

export async function getWorkloadDefaults(schoolId: string) {
  const setting = await prisma.setting.findUnique({
    where: { schoolId_key: { schoolId, key: WORKLOAD_DEFAULTS_KEY } },
  })
  if (setting?.value) {
    try {
      return JSON.parse(setting.value)
    } catch {}
  }
  return { maxPeriodsPerDay: 8, maxPeriodsPerWeek: 40 }
}

const workloadSettingsSchema = z.object({
  maxPeriodsPerDay: z.coerce.number().int().min(1).max(16),
  maxPeriodsPerWeek: z.coerce.number().int().min(1).max(60),
})

export async function updateWorkloadDefaults(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")
  const schoolId = formData.get("schoolId") as string

  if (profile.role !== "SUPER_ADMIN" && profile.schoolId !== schoolId) {
    return { error: "Not authorized.", success: false }
  }

  const parsed = workloadSettingsSchema.safeParse({
    maxPeriodsPerDay: formData.get("maxPeriodsPerDay"),
    maxPeriodsPerWeek: formData.get("maxPeriodsPerWeek"),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message, success: false }

  await prisma.setting.upsert({
    where: { schoolId_key: { schoolId, key: WORKLOAD_DEFAULTS_KEY } },
    update: { value: JSON.stringify(parsed.data) },
    create: { schoolId, key: WORKLOAD_DEFAULTS_KEY, value: JSON.stringify(parsed.data) },
  })

  revalidatePath("/dashboard/workload")
  revalidatePath("/dashboard/timetable")
  return { success: true }
}

const teacherLimitsSchema = z.object({
  maxPeriodsPerDay: z.coerce.number().int().min(0).max(16).optional(),
  maxPeriodsPerWeek: z.coerce.number().int().min(0).max(60).optional(),
})

export async function updateTeacherWorkloadLimits(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")
  const teacherId = formData.get("teacherId") as string

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { schoolId: true },
  })
  if (!teacher) return { error: "Teacher not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && profile.schoolId !== teacher.schoolId) {
    return { error: "Not authorized.", success: false }
  }

  const parsed = teacherLimitsSchema.safeParse({
    maxPeriodsPerDay: formData.get("maxPeriodsPerDay") || undefined,
    maxPeriodsPerWeek: formData.get("maxPeriodsPerWeek") || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message, success: false }

  await prisma.teacher.update({
    where: { id: teacherId },
    data: {
      maxPeriodsPerDay: parsed.data.maxPeriodsPerDay || null,
      maxPeriodsPerWeek: parsed.data.maxPeriodsPerWeek || null,
    },
  })

  revalidatePath("/dashboard/workload")
  revalidatePath("/dashboard/timetable")
  return { success: true }
}

export async function checkWorkloadBeforeAssign(
  teacherId: string,
  dayOfWeek: string,
  academicSessionId: string,
) {
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { maxPeriodsPerDay: true, maxPeriodsPerWeek: true, schoolId: true },
  })
  if (!teacher) return { allowed: false, reason: "Teacher not found" }

  const defaults = await getWorkloadDefaults(teacher.schoolId)
  const maxPerDay = teacher.maxPeriodsPerDay || defaults.maxPeriodsPerDay
  const maxPerWeek = teacher.maxPeriodsPerWeek || defaults.maxPeriodsPerWeek

  const dayCount = await prisma.timetable.count({
    where: { teacherId, dayOfWeek: dayOfWeek as any, academicSessionId },
  })
  if (maxPerDay && dayCount >= maxPerDay) {
    return {
      allowed: false,
      reason: `Teacher already has ${dayCount} periods on ${dayOfWeek} (max: ${maxPerDay}). Would exceed daily limit.`,
      current: dayCount,
      max: maxPerDay,
    }
  }

  const weekCount = await prisma.timetable.count({
    where: { teacherId, academicSessionId },
  })
  if (maxPerWeek && weekCount >= maxPerWeek) {
    return {
      allowed: false,
      reason: `Teacher already has ${weekCount} periods this week (max: ${maxPerWeek}). Would exceed weekly limit.`,
      current: weekCount,
      max: maxPerWeek,
    }
  }

  return {
    allowed: true,
    current: { day: dayCount, week: weekCount },
    max: { day: maxPerDay, week: maxPerWeek },
  }
}

export async function getDepartmentWorkload(schoolId: string, academicSessionId?: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL")
  if (profile.role !== "SUPER_ADMIN" && profile.schoolId !== schoolId) return []

  const workload = await getTeacherWorkload(schoolId, academicSessionId)

  const deptMap: Record<
    string,
    {
      teachers: typeof workload
      totalPeriods: number
      avgPeriods: number
      overloaded: number
      underloaded: number
    }
  > = {}
  for (const w of workload) {
    const dept = w.department || "Unassigned"
    if (!deptMap[dept]) {
      deptMap[dept] = {
        teachers: [],
        totalPeriods: 0,
        avgPeriods: 0,
        overloaded: 0,
        underloaded: 0,
      }
    }
    deptMap[dept].teachers.push(w)
    deptMap[dept].totalPeriods += w.totalPeriods
    if (w.isOverloaded) deptMap[dept].overloaded++
    if (w.isUnderloaded) deptMap[dept].underloaded++
  }

  return Object.entries(deptMap).map(([department, data]) => ({
    department,
    teacherCount: data.teachers.length,
    totalPeriods: data.totalPeriods,
    avgPeriods: data.teachers.length > 0 ? Math.round(data.totalPeriods / data.teachers.length) : 0,
    overloaded: data.overloaded,
    underloaded: data.underloaded,
    teachers: data.teachers,
  }))
}

export async function getClassDistribution(schoolId: string, academicSessionId?: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL")
  if (profile.role !== "SUPER_ADMIN" && profile.schoolId !== schoolId) return []

  const slotWhere: any = { teacher: { schoolId } }
  if (academicSessionId) slotWhere.academicSessionId = academicSessionId

  const slots = await prisma.timetable.findMany({
    where: slotWhere,
    include: {
      class: { select: { name: true } },
      teacher: { select: { id: true, firstName: true, lastName: true } },
    },
  })

  const classMap: Record<
    string,
    { className: string; totalPeriods: number; teachers: Set<string> }
  > = {}
  for (const slot of slots) {
    const key = slot.classId
    if (!classMap[key]) {
      classMap[key] = { className: slot.class.name, totalPeriods: 0, teachers: new Set() }
    }
    classMap[key].totalPeriods++
    if (slot.teacher) {
      classMap[key].teachers.add(`${slot.teacher.firstName} ${slot.teacher.lastName}`)
    }
  }

  return Object.entries(classMap)
    .map(([, data]) => ({
      className: data.className,
      totalPeriods: data.totalPeriods,
      teacherCount: data.teachers.size,
    }))
    .sort((a, b) => b.totalPeriods - a.totalPeriods)
}
