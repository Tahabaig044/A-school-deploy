"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth"
import { z } from "zod"

async function getStudentRecord() {
  const user = await requireAuth()
  if (!user) return { user: null, student: null, enrollment: null }

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile || profile.role !== "STUDENT") return { user: null, student: null, enrollment: null }

  const student = await prisma.student.findFirst({
    where: { email: user.email! },
    include: {
      enrollments: {
        where: { status: "ACTIVE" },
        include: { class: true, section: true, academicSession: true },
        take: 1,
      },
    },
  })
  if (!student) return { user: null, student: null, enrollment: null }

  return { user, student, enrollment: student.enrollments[0] || null }
}

export async function getStudentAttendance(month?: string) {
  const { user, student, enrollment } = await getStudentRecord()
  if (!user || !student || !enrollment) return []

  const now = new Date()
  const targetMonth = month ? parseInt(month) : now.getMonth()
  const targetYear = now.getFullYear()
  const startDate = new Date(targetYear, targetMonth, 1)
  const endDate = new Date(targetYear, targetMonth + 1, 0)

  return prisma.studentAttendance.findMany({
    where: {
      studentId: student.id,
      date: { gte: startDate, lte: endDate },
    },
    include: { class: true, section: true },
    orderBy: { date: "desc" },
  })
}

export async function getStudentFees() {
  const { user, student } = await getStudentRecord()
  if (!user || !student) return { invoices: [], summary: null }

  const invoices = await prisma.feeInvoice.findMany({
    where: { studentId: student.id },
    include: {
      items: { include: { feeStructure: true } },
      payments: { orderBy: { paymentDate: "desc" } },
      academicSession: true,
    },
    orderBy: { invoiceDate: "desc" },
  })

  const totalDue = invoices
    .filter((inv) => ["PENDING", "PARTIAL", "OVERDUE"].includes(inv.status))
    .reduce((sum, inv) => sum + Number(inv.totalAmount) - Number(inv.paidAmount), 0)

  const totalPaid = invoices.reduce((sum, inv) => sum + Number(inv.paidAmount), 0)

  return {
    invoices,
    summary: { totalDue, totalPaid, invoiceCount: invoices.length },
  }
}

export async function getStudentResults(academicSessionId?: string) {
  const { user, student, enrollment } = await getStudentRecord()
  if (!user || !student) return []

  let sessionId = academicSessionId
  if (!sessionId && enrollment) {
    sessionId = enrollment.academicSessionId
  }
  if (!sessionId) return []

  return prisma.examResult.findMany({
    where: {
      studentId: student.id,
      exam: { academicSessionId: sessionId },
    },
    include: {
      exam: { include: { examType: true, subject: true } },
    },
    orderBy: { exam: { examDate: "desc" } },
  })
}

export async function getStudentHomework() {
  const { user, student, enrollment } = await getStudentRecord()
  if (!user || !student || !enrollment) return []

  const allHomework = await prisma.homework.findMany({
    where: {
      classId: enrollment.classId,
      academicSessionId: enrollment.academicSessionId,
    },
    include: {
      subject: true,
      teacher: { select: { firstName: true, lastName: true } },
      submissions: {
        where: { studentId: student.id },
        orderBy: { submittedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { dueDate: "desc" },
  })

  return allHomework.map((hw) => {
    const latestSub = hw.submissions[0] || null
    const now = new Date()
    const dueDate = new Date(hw.dueDate)
    return {
      ...hw,
      latestSubmission: latestSub,
      submissionStatus: latestSub
        ? latestSub.status === "GRADED"
          ? "GRADED"
          : latestSub.isLate
            ? "LATE"
            : "SUBMITTED"
        : "NOT_SUBMITTED",
      isOverdue: !latestSub && dueDate < now,
    }
  })
}

const submitSchema = z.object({
  homeworkId: z.string().uuid(),
  content: z.string().optional(),
})

export async function submitHomework(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { user, student, enrollment } = await getStudentRecord()
  if (!user || !student || !enrollment) return { error: "Not authenticated.", success: false }

  const homeworkId = formData.get("homeworkId") as string
  const content = (formData.get("content") as string) || undefined

  const parsed = submitSchema.safeParse({ homeworkId, content })
  if (!parsed.success) return { error: parsed.error.issues[0].message, success: false }

  const homework = await prisma.homework.findFirst({
    where: { id: homeworkId, classId: enrollment.classId, academicSessionId: enrollment.academicSessionId },
  })
  if (!homework) return { error: "Homework not found.", success: false }

  const dueDate = new Date(homework.dueDate)
  const now = new Date()
  const isLate = now > dueDate

  const attachmentsJson = formData.get("attachments") as string
  let attachments: { url: string; fileName: string; fileType: string; fileSize: number }[] = []
  if (attachmentsJson) {
    try { attachments = JSON.parse(attachmentsJson) } catch { }
  }

  const submission = await prisma.homeworkSubmission.create({
    data: {
      homeworkId,
      studentId: student.id,
      content,
      status: "SUBMITTED",
      isLate,
      submittedAt: now,
    },
  })

  if (attachments.length > 0) {
    await prisma.submissionAttachment.createMany({
      data: attachments.map((a) => ({
        submissionId: submission.id,
        fileName: a.fileName,
        fileType: a.fileType,
        fileSize: a.fileSize,
        filePath: a.url,
      })),
    })
  }

  revalidatePath("/portal/student/homework")
  return { success: true }
}

export async function getHomeworkDetail(homeworkId: string) {
  const { user, student, enrollment } = await getStudentRecord()
  if (!user || !student || !enrollment) return null

  const homework = await prisma.homework.findFirst({
    where: { id: homeworkId, classId: enrollment.classId, academicSessionId: enrollment.academicSessionId },
    include: {
      subject: true,
      teacher: { select: { firstName: true, lastName: true } },
      class: { select: { name: true } },
      section: { select: { name: true } },
    },
  })
  if (!homework) return null

  const submissions = await prisma.homeworkSubmission.findMany({
    where: { homeworkId, studentId: student.id },
    include: { attachments: true },
    orderBy: { submittedAt: "desc" },
  })

  const latestSubmission = submissions[0] || null
  const now = new Date()
  const dueDate = new Date(homework.dueDate)

  return {
    ...homework,
    latestSubmission,
    submissions,
    submissionStatus: latestSubmission
      ? latestSubmission.status === "GRADED"
        ? "GRADED"
        : latestSubmission.isLate
          ? "LATE"
          : "SUBMITTED"
      : "NOT_SUBMITTED",
    canSubmit: !latestSubmission || latestSubmission.status === "RETURNED",
    isPastDue: !latestSubmission && now > dueDate,
    statusHistory: submissions.map((s) => ({
      id: s.id,
      status: s.status,
      content: s.content,
      marksObtained: s.marksObtained,
      feedback: s.feedback,
      returnReason: s.returnReason,
      submittedAt: s.submittedAt,
      isLate: s.isLate,
      attachments: s.attachments,
    })),
  }
}

export async function getStudentTimetable() {
  const { user, student, enrollment } = await getStudentRecord()
  if (!user || !student || !enrollment) return []

  return prisma.timetable.findMany({
    where: {
      classId: enrollment.classId,
      sectionId: enrollment.sectionId || undefined,
      academicSessionId: enrollment.academicSessionId,
    },
    include: {
      subject: true,
      teacher: { select: { firstName: true, lastName: true } },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  })
}

export async function getStudentReportCards() {
  const { user, student, enrollment } = await getStudentRecord()
  if (!user || !student) return []

  let sessionId = enrollment?.academicSessionId
  if (!sessionId) return []

  return prisma.reportCard.findMany({
    where: {
      studentId: student.id,
      academicSessionId: sessionId,
      isPublished: true,
    },
    include: {
      exam: { include: { examType: true, subject: true } },
    },
    orderBy: { exam: { examDate: "desc" } },
  })
}

export async function getStudentLeaveRequests() {
  const { user } = await getStudentRecord()
  if (!user) return []

  return prisma.leaveRequest.findMany({
    where: { profileId: user.id },
    orderBy: { createdAt: "desc" },
  })
}

export async function createStudentLeaveRequest(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { user } = await getStudentRecord()
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
    revalidatePath("/portal/student/leave-requests")
    return { success: true, error: undefined }
  } catch {
    return { error: "Failed to create leave request.", success: false }
  }
}

export async function getStudentProfile() {
  const { user, student, enrollment } = await getStudentRecord()
  if (!user || !student) return null
  return { profile: { firstName: user.user_metadata?.first_name, email: user.email }, student, enrollment }
}

export async function getStudentMessages() {
  const { user } = await getStudentRecord()
  if (!user) return []

  return prisma.message.findMany({
    where: { receiverId: user.id },
    include: {
      sender: { select: { firstName: true, lastName: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })
}
