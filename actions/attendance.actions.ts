"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getSchoolId, getBranchId } from "@/lib/school-context"

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

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { schoolId: true, branchId: true },
  })

  if (!cls) return { error: "Class not found.", success: false }

  if (profile.role !== "SUPER_ADMIN") {
    if (cls.schoolId !== profile.schoolId) {
      return { error: "Unauthorized", success: false }
    }
  }

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
  revalidatePath("/portal/student/attendance")
  revalidatePath("/portal/parent/attendance")
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

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { schoolId: true, branchId: true },
  })

  if (!cls) return

  if (profile.role !== "SUPER_ADMIN") {
    if (cls.schoolId !== profile.schoolId) return
  }

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

  const attendanceDate = new Date(date)
  const markedById = teacher?.id || ""

  const studentIds = students.map((s) => s.id)
  const existingRecords = await prisma.studentAttendance.findMany({
    where: {
      studentId: { in: studentIds },
      date: attendanceDate,
      academicSessionId,
    },
    select: { id: true, studentId: true },
  })

  const existingMap = new Map(existingRecords.map((r) => [r.studentId, r.id]))

  const toCreate: { studentId: string; classId: string; sectionId: string | null; academicSessionId: string; date: Date; status: any; markedById: string }[] = []
  const toUpdate: { id: string; status: any; markedById: string }[] = []

  for (const student of students) {
    const attendanceStatus = (formData.get(`status_${student.id}`) as string) || defaultStatus
    const existingId = existingMap.get(student.id)

    if (existingId) {
      toUpdate.push({ id: existingId, status: attendanceStatus, markedById })
    } else {
      toCreate.push({
        studentId: student.id,
        classId,
        sectionId: sectionId || null,
        academicSessionId,
        date: attendanceDate,
        status: attendanceStatus,
        markedById,
      })
    }
  }

  await prisma.$transaction(async (tx) => {
    if (toCreate.length > 0) {
      await tx.studentAttendance.createMany({ data: toCreate })
    }
    if (toUpdate.length > 0) {
      await Promise.all(
        toUpdate.map((item) =>
          tx.studentAttendance.update({
            where: { id: item.id },
            data: { status: item.status, markedById: item.markedById },
          })
        )
      )
    }
  })

  revalidatePath("/dashboard/attendance")
  revalidatePath("/portal/student/attendance")
  revalidatePath("/portal/parent/attendance")
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

  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { schoolId: true },
  })

  if (!staff) return { error: "Staff not found.", success: false }

  if (profile.role !== "SUPER_ADMIN") {
    if (staff.schoolId !== profile.schoolId) {
      return { error: "Unauthorized", success: false }
    }
  }

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
