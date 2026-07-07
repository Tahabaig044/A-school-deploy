"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth"

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

  return prisma.homework.findMany({
    where: {
      classId: enrollment.classId,
      academicSessionId: enrollment.academicSessionId,
    },
    include: {
      subject: true,
      teacher: { select: { firstName: true, lastName: true } },
      submissions: { where: { studentId: student.id } },
    },
    orderBy: { dueDate: "desc" },
  })
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
