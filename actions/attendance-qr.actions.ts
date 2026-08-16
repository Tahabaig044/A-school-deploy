"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getBulkStudentIdCardData, verifyIdCardToken } from "@/services/id-card"

export async function getStudentsForQrCards(schoolId: string, classId: string, sectionId?: string, sessionId?: string) {
  return getBulkStudentIdCardData(schoolId, classId, sectionId, sessionId)
}

export async function markAttendanceByQr(
  token: string,
  classId: string,
  sectionId: string | null,
  academicSessionId: string
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL", "TEACHER")

  const verification = await verifyIdCardToken(token, {
    role: profile.role,
    schoolId: profile.schoolId,
    id: profile.id,
  })
  if (!verification.verified || !verification.data) {
    return { error: "Invalid or inactive card.", success: false }
  }
  if (!verification.data.attendanceEligible) {
    return { error: "This card is not eligible for attendance.", success: false }
  }

  const studentId = verification.data.studentId
  if (!studentId) {
    return { error: "This card is not linked to a student.", success: false }
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { schoolId: true, id: true, firstName: true, lastName: true },
  })
  if (!student) return { error: "Student not found.", success: false }

  if (profile.role !== "SUPER_ADMIN" && student.schoolId !== profile.schoolId) {
    return { error: "Unauthorized", success: false }
  }

  const teacher = await prisma.teacher.findFirst({ where: { profileId: profile.id } })
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const existing = await prisma.studentAttendance.findUnique({
    where: {
      studentId_date_academicSessionId: {
        studentId,
        date: today,
        academicSessionId,
      },
    },
  })

  if (existing) {
    if (existing.status === "PRESENT") {
      return { error: `${student.id.slice(0, 8)} is already marked present today.`, success: false }
    }
    await prisma.studentAttendance.update({
      where: { id: existing.id },
      data: { status: "PRESENT", markedById: teacher?.id || "", remarks: "QR Scan" },
    })
  } else {
    await prisma.studentAttendance.create({
      data: {
        studentId,
        classId,
        sectionId,
        academicSessionId,
        date: today,
        status: "PRESENT",
        markedById: teacher?.id || "",
        remarks: "QR Scan",
      },
    })
  }

  revalidatePath("/dashboard/attendance")
  revalidatePath("/portal/student/attendance")
  revalidatePath("/portal/parent/attendance")
  return { success: true, studentName: `${student.firstName} ${student.lastName}` }
}

export async function getClassesAndSessions(schoolId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL", "TEACHER")

  const [classes, sessions] = await Promise.all([
    prisma.class.findMany({
      where: profile.role === "SUPER_ADMIN" ? {} : { schoolId },
      include: { sections: { select: { id: true, name: true } } },
      orderBy: { order: "asc" },
    }),
    prisma.academicSession.findMany({
      where: { schoolId, isCurrent: true },
      select: { id: true, name: true },
    }),
  ])

  return { classes, sessions }
}