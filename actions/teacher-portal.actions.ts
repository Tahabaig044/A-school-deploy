"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth"

async function getTeacherRecord() {
  const user = await requireAuth()
  if (!user) return { user: null, teacher: null, profile: null }

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile || profile.role !== "TEACHER") return { user: null, teacher: null, profile: null }

  const teacher = await prisma.teacher.findFirst({
    where: { profileId: user.id },
  })

  return { user, teacher, profile }
}

export async function getTeacherClasses() {
  const { user, teacher } = await getTeacherRecord()
  if (!user || !teacher) return []

  const activeSession = await prisma.academicSession.findFirst({
    where: { schoolId: teacher.schoolId, isCurrent: true },
    select: { id: true },
  })
  if (!activeSession) return []

  const assignments = await prisma.teacherAssignment.findMany({
    where: {
      teacherId: teacher.id,
      academicSessionId: activeSession.id,
    },
    include: {
      class: true,
      section: true,
      subject: true,
      academicSession: true,
    },
  })

  return assignments
}

export async function getTeacherStudents(classId: string, sectionId?: string) {
  const { user, teacher } = await getTeacherRecord()
  if (!user || !teacher) return []

  const activeSession = await prisma.academicSession.findFirst({
    where: { schoolId: teacher.schoolId, isCurrent: true },
    select: { id: true },
  })
  if (!activeSession) return []

  return prisma.student.findMany({
    where: {
      enrollments: {
        some: {
          classId,
          ...(sectionId && { sectionId }),
          academicSessionId: activeSession.id,
          status: "ACTIVE",
        },
      },
    },
    include: {
      enrollments: {
        where: { status: "ACTIVE" },
        include: { class: true, section: true },
        take: 1,
      },
    },
    orderBy: { lastName: "asc" },
  })
}

export async function getTeacherTimetable() {
  const { user, teacher } = await getTeacherRecord()
  if (!user || !teacher) return []

  const activeSession = await prisma.academicSession.findFirst({
    where: { schoolId: teacher.schoolId, isCurrent: true },
    select: { id: true },
  })
  if (!activeSession) return []

  return prisma.timetable.findMany({
    where: {
      teacherId: teacher.id,
      academicSessionId: activeSession.id,
    },
    include: {
      class: true,
      section: true,
      subject: true,
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  })
}

export async function getTeacherHomework() {
  const { user, teacher } = await getTeacherRecord()
  if (!user || !teacher) return []

  return prisma.homework.findMany({
    where: { teacherId: teacher.id },
    include: {
      class: true,
      section: true,
      subject: true,
      _count: { select: { submissions: true } },
    },
    orderBy: { dueDate: "desc" },
  })
}

export async function getTeacherExamResults(academicSessionId?: string) {
  const { user, teacher } = await getTeacherRecord()
  if (!user || !teacher) return []

  let sessionId = academicSessionId
  if (!sessionId) {
    const activeSession = await prisma.academicSession.findFirst({
      where: { schoolId: teacher.schoolId, isCurrent: true },
      select: { id: true },
    })
    sessionId = activeSession?.id
  }
  if (!sessionId) return []

  const assignments = await prisma.teacherAssignment.findMany({
    where: { teacherId: teacher.id, academicSessionId: sessionId },
    select: { classId: true },
  })
  const classIds = assignments.map((a) => a.classId)

  return prisma.examResult.findMany({
    where: {
      exam: {
        classId: { in: classIds },
        academicSessionId: sessionId,
      },
    },
    include: {
      exam: { include: { examType: true, subject: true } },
      student: { select: { id: true, firstName: true, lastName: true, admissionNo: true } },
    },
    orderBy: { exam: { examDate: "desc" } },
  })
}

export async function getTeacherLeaveRequests() {
  const { user } = await getTeacherRecord()
  if (!user) return []

  return prisma.leaveRequest.findMany({
    where: { profileId: user.id },
    orderBy: { createdAt: "desc" },
  })
}

export async function createTeacherLeaveRequest(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { user } = await getTeacherRecord()
  if (!user) return { error: "Not authenticated.", success: false }

  const leaveType = formData.get("leaveType") as string
  const startDate = formData.get("startDate") as string
  const endDate = formData.get("endDate") as string
  const reason = formData.get("reason") as string

  if (!leaveType || !startDate || !endDate || !reason) {
    return { error: "All fields are required.", success: false }
  }

  try {
    await prisma.leaveRequest.create({
      data: {
        profileId: user.id,
        leaveType: leaveType as any,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
      },
    })
    revalidatePath("/portal/teacher/leave-requests")
    return { success: true, error: undefined }
  } catch {
    return { error: "Failed to create leave request.", success: false }
  }
}

export async function getTeacherProfile() {
  const { user, teacher, profile } = await getTeacherRecord()
  if (!user || !profile) return null
  return { ...profile, teacher }
}

export async function updateTeacherProfile(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { user, teacher } = await getTeacherRecord()
  if (!user) return { error: "Not authenticated.", success: false }

  const firstName = formData.get("firstName") as string
  const lastName = formData.get("lastName") as string
  const phone = formData.get("phone") as string

  if (!firstName || !lastName) {
    return { error: "First name and last name are required.", success: false }
  }

  try {
    await prisma.profile.update({
      where: { id: user.id },
      data: { firstName, lastName, phone: phone || null },
    })

    if (teacher) {
      await prisma.teacher.update({
        where: { id: teacher.id },
        data: { firstName, lastName, phone: phone || null },
      })
    }

    revalidatePath("/portal/teacher/profile")
    return { success: true, error: undefined }
  } catch {
    return { error: "Failed to update profile.", success: false }
  }
}

export async function getActiveSessionId(schoolId: string) {
  const session = await prisma.academicSession.findFirst({
    where: { schoolId, isCurrent: true },
    select: { id: true },
  })
  return session?.id
}
