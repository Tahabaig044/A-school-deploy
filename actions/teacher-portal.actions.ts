"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import { z } from "zod"

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

  const assignments = await prisma.teacherAssignment.findMany({
    where: { teacherId: teacher.id, academicSessionId: activeSession.id },
    select: { classId: true },
  })
  const classIds = [...new Set(assignments.map((a) => a.classId))]

  return prisma.timetable.findMany({
    where: {
      academicSessionId: activeSession.id,
      OR: [
        { teacherId: teacher.id },
        ...(classIds.length > 0 ? [{ isFree: true, classId: { in: classIds } }] : []),
      ],
    },
    include: {
      class: true,
      section: true,
      subject: true,
      teacher: {
        include: { profile: { select: { firstName: true, lastName: true } } },
      },
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

export async function getTeacherExams() {
  const { user, teacher } = await getTeacherRecord()
  if (!user || !teacher) return []

  const activeSession = await prisma.academicSession.findFirst({
    where: { schoolId: teacher.schoolId, isCurrent: true },
    select: { id: true },
  })
  if (!activeSession) return []

  const assignments = await prisma.teacherAssignment.findMany({
    where: { teacherId: teacher.id, academicSessionId: activeSession.id },
    select: { classId: true, subjectId: true },
  })
  const classIds = [...new Set(assignments.map((a) => a.classId))]

  return prisma.exam.findMany({
    where: {
      classId: { in: classIds },
      academicSessionId: activeSession.id,
    },
    include: {
      class: true,
      subject: true,
      examType: true,
      _count: { select: { results: true } },
    },
    orderBy: { examDate: "desc" },
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

export async function cancelTeacherLeaveRequest(leaveId: string) {
  const { user } = await getTeacherRecord()
  if (!user) return { error: "Not authenticated.", success: false }

  const leave = await prisma.leaveRequest.findFirst({
    where: { id: leaveId, profileId: user.id, status: "PENDING" },
  })
  if (!leave) return { error: "Leave request not found or cannot be cancelled.", success: false }

  await prisma.leaveRequest.update({
    where: { id: leaveId },
    data: { status: "CANCELLED" },
  })

  revalidatePath("/portal/teacher/leave-requests")
  return { success: true }
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
  const address = formData.get("address") as string
  const emergencyContact = formData.get("emergencyContact") as string

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
        data: {
          firstName, lastName,
          phone: phone || null,
          address: address || null,
        },
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

export async function getTeacherDashboardStats() {
  const { user, teacher, profile } = await getTeacherRecord()
  if (!user || !teacher || !profile) return null

  const activeSession = await prisma.academicSession.findFirst({
    where: { schoolId: teacher.schoolId, isCurrent: true },
    select: { id: true },
  })
  if (!activeSession) {
    return { teacher, profile, assignments: [], todaySlots: [], stats: null }
  }

  const assignments = await prisma.teacherAssignment.findMany({
    where: { teacherId: teacher.id, academicSessionId: activeSession.id },
    include: { class: true, section: true, subject: true },
  })

  const classIds = [...new Set(assignments.map((a) => a.classId))]

  const dayNames = [null, "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]
  const todayDayName = dayNames[new Date().getDay()]

  const todaySlots = todayDayName
    ? await prisma.timetable.findMany({
        where: {
          academicSessionId: activeSession.id,
          dayOfWeek: todayDayName as any,
          OR: [
            { teacherId: teacher.id },
            ...(classIds.length > 0 ? [{ isFree: true, classId: { in: classIds } }] : []),
          ],
        },
        include: { class: true, section: true, subject: true },
        orderBy: { startTime: "asc" },
      })
    : []

  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)
  const tomorrow = new Date(todayDate)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const existingAttendance = await prisma.studentAttendance.findMany({
    where: {
      classId: { in: classIds },
      date: { gte: todayDate, lt: tomorrow },
      academicSessionId: activeSession.id,
    },
    select: { classId: true, sectionId: true },
    distinct: ["classId", "sectionId"],
  })

  const attendanceDone = new Set(existingAttendance.map((a) => `${a.classId}-${a.sectionId || ""}`))
  const todaySlotsWithAttendance = todaySlots.map((slot) => ({
    ...slot,
    attendanceDone: attendanceDone.has(`${slot.classId}-${slot.sectionId || ""}`),
  }))

  const totalStudents = await prisma.student.count({
    where: {
      enrollments: {
        some: {
          classId: { in: classIds },
          academicSessionId: activeSession.id,
          status: "ACTIVE",
        },
      },
    },
  })

  const pendingHomework = await prisma.homework.count({
    where: { teacherId: teacher.id, isActive: true, dueDate: { gte: new Date() } },
  })

  const overdueHomework = await prisma.homework.count({
    where: { teacherId: teacher.id, isActive: true, dueDate: { lt: new Date() } },
  })

  const upcomingExams = await prisma.exam.count({
    where: {
      classId: { in: classIds },
      academicSessionId: activeSession.id,
      examDate: { gte: todayDate },
    },
  })

  const unreadMessages = await prisma.message.count({
    where: { receiverId: user.id, isRead: false },
  })

  const pendingLeave = await prisma.leaveRequest.count({
    where: { profileId: user.id, status: "PENDING" },
  })

  const announcements = await prisma.announcement.findMany({
    where: {
      schoolId: teacher.schoolId,
      isPublished: true,
      OR: [
        { audience: "ALL" },
        { audience: "TEACHERS" },
        { audience: "SCHOOL" },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      author: { select: { firstName: true, lastName: true } },
    },
  })

  const meetings = await prisma.meeting.findMany({
    where: {
      attendees: { some: { profileId: user.id } },
      status: { in: ["PENDING", "APPROVED"] },
    },
    include: {
      createdBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { startDateTime: "asc" },
    take: 5,
  })

  return {
    teacher,
    profile,
    assignments,
    stats: {
      totalStudents,
      classCount: classIds.length,
      pendingHomework,
      overdueHomework,
      upcomingExams,
      unreadMessages,
      pendingLeave,
    },
    todaySlots: todaySlotsWithAttendance,
    announcements,
    meetings,
  }
}

export async function getTeacherExamsForMarks() {
  const { user, teacher } = await getTeacherRecord()
  if (!user || !teacher) return []

  const activeSession = await prisma.academicSession.findFirst({
    where: { schoolId: teacher.schoolId, isCurrent: true },
    select: { id: true },
  })
  if (!activeSession) return []

  const assignments = await prisma.teacherAssignment.findMany({
    where: { teacherId: teacher.id, academicSessionId: activeSession.id },
    select: { classId: true, subjectId: true },
  })
  const classIds = [...new Set(assignments.map((a) => a.classId))]

  const exams = await prisma.exam.findMany({
    where: {
      classId: { in: classIds },
      academicSessionId: activeSession.id,
    },
    include: {
      class: true,
      subject: true,
      examType: true,
      _count: { select: { results: true } },
    },
    orderBy: { examDate: "desc" },
  })

  return exams
}

export async function getTeacherMeetings() {
  const { user } = await getTeacherRecord()
  if (!user) return []

  return prisma.meeting.findMany({
    where: {
      attendees: { some: { profileId: user.id } },
    },
    include: {
      createdBy: { select: { firstName: true, lastName: true, role: true } },
      attendees: {
        include: {
          profile: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
      },
      notes: {
        include: { author: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
        take: 3,
      },
      _count: { select: { notes: true } },
    },
    orderBy: { startDateTime: "desc" },
  })
}

export async function getTeacherStudentDetail(studentId: string) {
  const { user, teacher } = await getTeacherRecord()
  if (!user || !teacher) return null

  const activeSession = await prisma.academicSession.findFirst({
    where: { schoolId: teacher.schoolId, isCurrent: true },
    select: { id: true },
  })
  if (!activeSession) return null

  const student = await prisma.student.findFirst({
    where: { id: studentId },
    include: {
      enrollments: {
        where: { status: "ACTIVE", academicSessionId: activeSession.id },
        include: { class: true, section: true },
      },
      parents: { include: { parent: true } },
      attendance: {
        where: { academicSessionId: activeSession.id },
        orderBy: { date: "desc" },
        take: 30,
      },
      examResults: {
        where: { exam: { academicSessionId: activeSession.id } },
        include: { exam: { include: { subject: true, examType: true } } },
        orderBy: { exam: { examDate: "desc" } },
      },
      homeworkSubmissions: {
        where: { homework: { teacherId: teacher.id } },
        include: { homework: { include: { subject: true } } },
        orderBy: { submittedAt: "desc" },
      },
    },
  })

  if (!student) return null

  const totalAttendanceDays = student.attendance.length
  const presentDays = student.attendance.filter((a) => a.status === "PRESENT").length
  const attendancePercentage = totalAttendanceDays > 0 ? Math.round((presentDays / totalAttendanceDays) * 100) : 0

  return {
    ...student,
    attendancePercentage,
    totalAttendanceDays,
    presentDays,
  }
}

export async function getTeacherTodayAttendanceStatus() {
  const { user, teacher } = await getTeacherRecord()
  if (!user || !teacher) return []

  const activeSession = await prisma.academicSession.findFirst({
    where: { schoolId: teacher.schoolId, isCurrent: true },
    select: { id: true },
  })
  if (!activeSession) return []

  const assignments = await prisma.teacherAssignment.findMany({
    where: { teacherId: teacher.id, academicSessionId: activeSession.id },
    select: { classId: true, sectionId: true },
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const statuses = []
  for (const a of assignments) {
    const key = `${a.classId}-${a.sectionId || "all"}`
    const count = await prisma.studentAttendance.count({
      where: {
        classId: a.classId,
        sectionId: a.sectionId || undefined,
        date: { gte: today, lt: tomorrow },
        academicSessionId: activeSession.id,
      },
    })
    statuses.push({ classId: a.classId, sectionId: a.sectionId, done: count > 0 })
  }

  return statuses
}

const homeworkSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z.string().min(1, "Due date is required"),
  totalMarks: z.number().int().min(0).optional(),
})

export async function createTeacherHomework(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { user, teacher } = await getTeacherRecord()
  if (!user || !teacher) return { error: "Not authenticated.", success: false }

  const title = formData.get("title") as string
  const description = formData.get("description") as string || undefined
  const dueDate = formData.get("dueDate") as string
  const totalMarksStr = formData.get("totalMarks") as string
  const totalMarks = totalMarksStr ? Number(totalMarksStr) : undefined
  const classId = formData.get("classId") as string
  const sectionId = formData.get("sectionId") as string || undefined
  const subjectId = formData.get("subjectId") as string

  const parsed = homeworkSchema.safeParse({ title, description, dueDate, totalMarks })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  if (!classId || !subjectId) {
    return { error: "Class and subject are required.", success: false }
  }

  const activeSession = await prisma.academicSession.findFirst({
    where: { schoolId: teacher.schoolId, isCurrent: true },
    select: { id: true },
  })
  if (!activeSession) return { error: "No active session found.", success: false }

  try {
    await prisma.homework.create({
      data: {
        schoolId: teacher.schoolId,
        branchId: teacher.branchId,
        classId,
        sectionId: sectionId || null,
        subjectId,
        teacherId: teacher.id,
        academicSessionId: activeSession.id,
        title,
        description,
        dueDate: new Date(dueDate),
        totalMarks,
      },
    })
    revalidatePath("/portal/teacher/homework")
    revalidatePath("/portal/student/homework")
    revalidatePath("/portal/parent/homework")
    return { success: true }
  } catch {
    return { error: "Failed to create homework.", success: false }
  }
}

export async function updateTeacherHomework(
  homeworkId: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { user, teacher } = await getTeacherRecord()
  if (!user || !teacher) return { error: "Not authenticated.", success: false }

  const title = formData.get("title") as string
  const description = formData.get("description") as string || undefined
  const dueDate = formData.get("dueDate") as string
  const totalMarksStr = formData.get("totalMarks") as string
  const totalMarks = totalMarksStr ? Number(totalMarksStr) : undefined

  await prisma.homework.update({
    where: { id: homeworkId, teacherId: teacher.id },
    data: { title, description, dueDate: new Date(dueDate), totalMarks },
  })

  revalidatePath("/portal/teacher/homework")
  revalidatePath("/portal/student/homework")
  revalidatePath("/portal/parent/homework")
  return { success: true }
}

export async function deleteTeacherHomework(homeworkId: string) {
  const { user, teacher } = await getTeacherRecord()
  if (!user || !teacher) return { error: "Not authenticated.", success: false }

  await prisma.homework.delete({ where: { id: homeworkId, teacherId: teacher.id } })
  revalidatePath("/portal/teacher/homework")
  revalidatePath("/portal/student/homework")
  revalidatePath("/portal/parent/homework")
  return { success: true }
}

export async function getTeacherHomeworkSubmissions(homeworkId: string) {
  const { user, teacher } = await getTeacherRecord()
  if (!user || !teacher) return []

  return prisma.homeworkSubmission.findMany({
    where: { homeworkId },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, admissionNo: true } },
      homework: { select: { title: true, totalMarks: true } },
    },
    orderBy: { submittedAt: "desc" },
  })
}

export async function gradeTeacherHomeworkSubmission(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { user, teacher } = await getTeacherRecord()
  if (!user || !teacher) return { error: "Not authenticated.", success: false }

  const submissionId = formData.get("submissionId") as string
  const marksObtained = Number(formData.get("marksObtained") as string)
  const feedback = formData.get("feedback") as string || undefined

  const submission = await prisma.homeworkSubmission.findUnique({
    where: { id: submissionId },
    include: { homework: true },
  })
  if (!submission) return { error: "Submission not found.", success: false }
  if (submission.homework.totalMarks && marksObtained > submission.homework.totalMarks) {
    return { error: "Marks cannot exceed total marks.", success: false }
  }

  await prisma.homeworkSubmission.update({
    where: { id: submissionId },
    data: { marksObtained, feedback, status: "GRADED", gradedAt: new Date() },
  })

  revalidatePath("/portal/teacher/homework")
  revalidatePath("/portal/student/homework")
  revalidatePath("/portal/parent/homework")
  return { success: true }
}

export async function returnHomeworkForResubmission(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { user, teacher } = await getTeacherRecord()
  if (!user || !teacher) return { error: "Not authenticated.", success: false }

  const submissionId = formData.get("submissionId") as string
  const returnReason = formData.get("returnReason") as string

  if (!submissionId || !returnReason) {
    return { error: "Submission ID and reason are required.", success: false }
  }

  const submission = await prisma.homeworkSubmission.findUnique({
    where: { id: submissionId },
    include: { homework: { select: { teacherId: true } } },
  })
  if (!submission) return { error: "Submission not found.", success: false }
  if (submission.homework.teacherId !== teacher.id) {
    return { error: "Not authorized to grade this submission.", success: false }
  }

  await prisma.homeworkSubmission.update({
    where: { id: submissionId },
    data: { status: "RETURNED", returnReason, marksObtained: null, feedback: null, gradedAt: null },
  })

  revalidatePath("/portal/teacher/homework")
  revalidatePath("/portal/student/homework")
  revalidatePath("/portal/parent/homework")
  return { success: true }
}

export async function getTeacherHomeworkById(homeworkId: string) {
  const { user, teacher } = await getTeacherRecord()
  if (!user || !teacher) return null

  return prisma.homework.findFirst({
    where: { id: homeworkId, teacherId: teacher.id },
    include: {
      class: { select: { id: true, name: true } },
      section: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true, code: true } },
    },
  })
}

export async function createTeacherMeeting(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { user, teacher, profile } = await getTeacherRecord()
  if (!user || !teacher || !profile) return { error: "Not authenticated.", success: false }

  const title = formData.get("title") as string
  const description = formData.get("description") as string || undefined
  const meetingType = formData.get("meetingType") as string
  const startDateTime = formData.get("startDateTime") as string
  const endDateTime = formData.get("endDateTime") as string
  const location = formData.get("location") as string || undefined
  const parentProfileId = formData.get("parentProfileId") as string

  if (!title || !startDateTime || !endDateTime) {
    return { error: "Title, start and end time are required.", success: false }
  }

  try {
    await prisma.meeting.create({
      data: {
        schoolId: teacher.schoolId,
        branchId: teacher.branchId,
        title,
        description,
        meetingType: (meetingType as any) || "PARENT_TEACHER",
        startDateTime: new Date(startDateTime),
        endDateTime: new Date(endDateTime),
        location,
        createdById: user.id,
        attendees: {
          create: [
            { profileId: user.id },
            ...(parentProfileId ? [{ profileId: parentProfileId }] : []),
          ],
        },
      },
    })
    if (parentProfileId) {
      await prisma.notification.create({
        data: {
          userId: parentProfileId,
          title: `Meeting: ${title}`,
          content: `A meeting "${title}" has been scheduled with you.`,
          type: "MEETING",
          category: "MEETING",
          link: "/portal/parent/meetings",
        },
      })
    }
    revalidatePath("/portal/teacher/meetings")
    return { success: true }
  } catch {
    return { error: "Failed to create meeting.", success: false }
  }
}

export async function updateTeacherMeetingStatus(meetingId: string, status: string) {
  const { user } = await getTeacherRecord()
  if (!user) return { error: "Not authenticated.", success: false }

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    select: { title: true, attendees: { select: { profileId: true } }, createdById: true },
  })
  if (!meeting) return { error: "Meeting not found.", success: false }

  await prisma.meeting.update({
    where: { id: meetingId },
    data: { status: status as any },
  })

  const allIds = [...new Set([...meeting.attendees.map((a) => a.profileId), meeting.createdById])]
  for (const uid of allIds) {
    if (uid === user.id) continue
    await prisma.notification.create({
      data: {
        userId: uid,
        title: `Meeting: ${meeting.title}`,
        content: `Meeting "${meeting.title}" has been ${status.toLowerCase()}.`,
        type: "MEETING",
        category: "MEETING",
        link: "/portal/teacher/meetings",
      },
    })
  }

  revalidatePath("/portal/teacher/meetings")
  return { success: true }
}

export async function addTeacherMeetingNote(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { user } = await getTeacherRecord()
  if (!user) return { error: "Not authenticated.", success: false }

  const meetingId = formData.get("meetingId") as string
  const content = formData.get("content") as string

  if (!meetingId || !content) return { error: "Meeting ID and content are required.", success: false }

  await prisma.meetingNote.create({
    data: { meetingId, authorId: user.id, content },
  })

  revalidatePath("/portal/teacher/meetings")
  return { success: true }
}

export async function getTeacherAssignments() {
  const { user, teacher } = await getTeacherRecord()
  if (!user || !teacher) return []
  const activeSession = await prisma.academicSession.findFirst({
    where: { schoolId: teacher.schoolId, isCurrent: true },
    select: { id: true },
  })
  if (!activeSession) return []

  return prisma.teacherAssignment.findMany({
    where: { teacherId: teacher.id, academicSessionId: activeSession.id },
    include: { class: true, section: true, subject: true },
  })
}
