"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"

export async function markAttendance(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL", "TEACHER")

  const teacher = await prisma.teacher.findFirst({ where: { profileId: profile.id } })
  if (!teacher && !["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN"].includes(profile.role)) {
    return { error: "Teacher profile not found.", success: false }
  }

  const studentId = formData.get("studentId") as string
  const classId = formData.get("classId") as string
  const sectionId = formData.get("sectionId") as string
  const academicSessionId = formData.get("academicSessionId") as string
  const date = formData.get("date") as string
  const status = formData.get("status") as string
  const remarks = formData.get("remarks") as string

  const existing = await prisma.studentAttendance.findUnique({
    where: { studentId_date_academicSessionId: { studentId, date: new Date(date), academicSessionId } },
  })

  if (existing) {
    await prisma.studentAttendance.update({
      where: { id: existing.id },
      data: {
        status: status as any,
        remarks: remarks || null,
        markedById: teacher?.id ?? undefined,
      },
    })
  } else {
    await prisma.studentAttendance.create({
      data: {
        studentId,
        classId,
        sectionId: sectionId || null,
        academicSessionId,
        date: new Date(date),
        status: status as any,
        markedById: teacher?.id || "",
        remarks: remarks || null,
      },
    })
  }

  revalidatePath("/dashboard/attendance")
  return { success: true, error: undefined }
}

export async function bulkMarkAttendance(formData: FormData) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL", "TEACHER")

  const teacher = await prisma.teacher.findFirst({ where: { profileId: profile.id } })
  const classId = formData.get("classId") as string
  const sectionId = formData.get("sectionId") as string
  const academicSessionId = formData.get("academicSessionId") as string
  const date = formData.get("date") as string
  const defaultStatus = formData.get("defaultStatus") as string

  const students = await prisma.student.findMany({
    where: {
      enrollments: {
        some: {
          classId,
          ...(sectionId ? { sectionId } : {}),
          academicSessionId,
          status: "ACTIVE",
        },
      },
    },
    select: { id: true },
  })

  for (const student of students) {
    const attendanceStatus = (formData.get(`status_${student.id}`) as string) || defaultStatus

    const existing = await prisma.studentAttendance.findUnique({
      where: {
        studentId_date_academicSessionId: {
          studentId: student.id,
          date: new Date(date),
          academicSessionId,
        },
      },
    })

    if (existing) {
      await prisma.studentAttendance.update({
        where: { id: existing.id },
        data: { status: attendanceStatus as any, markedById: teacher?.id || "" },
      })
    } else {
      await prisma.studentAttendance.create({
        data: {
          studentId: student.id,
          classId,
          sectionId: sectionId || null,
          academicSessionId,
          date: new Date(date),
          status: attendanceStatus as any,
          markedById: teacher?.id || "",
        },
      })
    }
  }

  revalidatePath("/dashboard/attendance")
}

export async function markStaffAttendance(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const staffId = formData.get("staffId") as string
  const date = formData.get("date") as string
  const status = formData.get("status") as string
  const checkIn = formData.get("checkIn") as string
  const checkOut = formData.get("checkOut") as string

  const existing = await prisma.staffAttendance.findUnique({
    where: { staffId_date: { staffId, date: new Date(date) } },
  })

  if (existing) {
    await prisma.staffAttendance.update({
      where: { id: existing.id },
      data: {
        status: status as any,
        checkIn: checkIn ? new Date(`${date}T${checkIn}`) : undefined,
        checkOut: checkOut ? new Date(`${date}T${checkOut}`) : undefined,
      },
    })
  } else {
    await prisma.staffAttendance.create({
      data: {
        staffId,
        date: new Date(date),
        status: status as any,
        checkIn: checkIn ? new Date(`${date}T${checkIn}`) : null,
        checkOut: checkOut ? new Date(`${date}T${checkOut}`) : null,
      },
    })
  }

  revalidatePath("/dashboard/staff-attendance")
  return { success: true, error: undefined }
}
