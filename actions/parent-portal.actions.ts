"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getCurrentProfile, requireAuth } from "@/lib/auth"

async function getParentAuthContext() {
  const user = await requireAuth()
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== "PARENT") return null
  return { user, profile }
}

async function getParentRecord() {
  const ctx = await getParentAuthContext()
  if (!ctx) return { user: null, parent: null, children: [] }

  const parent = await prisma.parent.findFirst({
    where: { email: ctx.user.email! },
    include: {
      students: {
        include: {
          student: {
            include: {
              enrollments: {
                where: { status: "ACTIVE" },
                include: { class: true, section: true, academicSession: true },
                take: 1,
              },
              attendance: {
                orderBy: { date: "desc" },
                take: 30,
              },
              invoices: {
                orderBy: { invoiceDate: "desc" },
                include: { payments: true },
              },
              examResults: {
                include: { exam: { include: { examType: true, subject: true } } },
                orderBy: { createdAt: "desc" },
              },
              reportCards: {
                where: { isPublished: true },
                include: { exam: { include: { examType: true } } },
                orderBy: { createdAt: "desc" },
              },
              homeworkSubmissions: {
                include: {
                  homework: {
                    include: {
                      subject: true,
                      teacher: { select: { firstName: true, lastName: true } },
                    },
                  },
                },
                orderBy: { createdAt: "desc" },
                take: 20,
              },
            },
          },
        },
      },
    },
  })

  const children = parent?.students.map((sp) => sp.student) || []

  return { user: ctx.user, parent, children }
}

export async function getParentChildren() {
  const ctx = await getParentAuthContext()
  if (!ctx) return []

  const parent = await prisma.parent.findFirst({
    where: { email: ctx.user.email! },
    include: {
      students: {
        include: {
          student: {
            include: {
              enrollments: {
                where: { status: "ACTIVE" },
                include: { class: true, section: true, academicSession: true },
                take: 1,
              },
            },
          },
        },
      },
    },
  })

  return parent?.students.map((sp) => sp.student) || []
}

async function verifyParentChild(parentEmail: string, studentId: string) {
  const parent = await prisma.parent.findFirst({
    where: { email: parentEmail },
    include: {
      students: { where: { studentId }, select: { studentId: true } },
    },
  })
  return parent && parent.students.length > 0
}

export async function getChildAttendance(studentId: string, month?: string) {
  const ctx = await getParentAuthContext()
  if (!ctx) return []

  const isParent = await verifyParentChild(ctx.user.email!, studentId)
  if (!isParent) return []

  const now = new Date()
  const targetMonth = month ? parseInt(month) : now.getMonth()
  const targetYear = now.getFullYear()

  const startDate = new Date(targetYear, targetMonth, 1)
  const endDate = new Date(targetYear, targetMonth + 1, 0)

  return prisma.studentAttendance.findMany({
    where: {
      studentId,
      date: { gte: startDate, lte: endDate },
    },
    include: { class: true, section: true },
    orderBy: { date: "desc" },
  })
}

export async function getChildFees(studentId: string) {
  const ctx = await getParentAuthContext()
  if (!ctx) return { invoices: [], summary: null }

  const isParent = await verifyParentChild(ctx.user.email!, studentId)
  if (!isParent) return { invoices: [], summary: null }

  const invoices = await prisma.feeInvoice.findMany({
    where: { studentId },
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

export async function getChildResults(studentId: string, academicSessionId?: string) {
  const ctx = await getParentAuthContext()
  if (!ctx) return []

  const isParent = await verifyParentChild(ctx.user.email!, studentId)
  if (!isParent) return []

  let sessionId = academicSessionId
  if (!sessionId) {
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: { studentId, status: "ACTIVE" },
      select: { academicSessionId: true },
    })
    sessionId = enrollment?.academicSessionId
  }
  if (!sessionId) return []

  return prisma.examResult.findMany({
    where: {
      studentId,
      exam: { academicSessionId: sessionId },
    },
    include: {
      exam: { include: { examType: true, subject: true } },
    },
    orderBy: { exam: { examDate: "desc" } },
  })
}

export async function getChildHomework(studentId: string) {
  const ctx = await getParentAuthContext()
  if (!ctx) return []

  const isParent = await verifyParentChild(ctx.user.email!, studentId)
  if (!isParent) return []

  const enrollment = await prisma.studentEnrollment.findFirst({
    where: { studentId, status: "ACTIVE" },
    select: { classId: true, sectionId: true, academicSessionId: true },
  })
  if (!enrollment) return []

  return prisma.homework.findMany({
    where: {
      classId: enrollment.classId,
      academicSessionId: enrollment.academicSessionId,
    },
    include: {
      subject: true,
      teacher: { select: { firstName: true, lastName: true } },
      submissions: { where: { studentId } },
    },
    orderBy: { dueDate: "desc" },
  })
}

export async function getChildTimetable(studentId: string) {
  const ctx = await getParentAuthContext()
  if (!ctx) return []

  const isParent = await verifyParentChild(ctx.user.email!, studentId)
  if (!isParent) return []

  const enrollment = await prisma.studentEnrollment.findFirst({
    where: { studentId, status: "ACTIVE" },
    select: { classId: true, sectionId: true, academicSessionId: true },
  })
  if (!enrollment) return []

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

export async function getParentAnnouncements() {
  const ctx = await getParentAuthContext()
  if (!ctx) return []

  return prisma.announcement.findMany({
    where: {
      schoolId: ctx.profile.schoolId!,
      isPublished: true,
    },
    include: {
      author: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getParentLeaveRequests() {
  const ctx = await getParentAuthContext()
  if (!ctx) return []

  return prisma.leaveRequest.findMany({
    where: { profileId: ctx.user.id },
    orderBy: { createdAt: "desc" },
  })
}

export async function createParentLeaveRequest(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const ctx = await getParentAuthContext()
  if (!ctx) return { error: "Not authenticated.", success: false }

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
        profileId: ctx.user.id,
        leaveType: leaveType as any,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
      },
    })
    revalidatePath("/portal/parent/leave-requests")
    return { success: true, error: undefined }
  } catch {
    return { error: "Failed to create leave request.", success: false }
  }
}

export async function getParentProfile() {
  const ctx = await getParentAuthContext()
  if (!ctx) return null

  return prisma.profile.findUnique({ where: { id: ctx.user.id } })
}

export async function updateParentProfile(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const ctx = await getParentAuthContext()
  if (!ctx) return { error: "Not authenticated.", success: false }

  const firstName = formData.get("firstName") as string
  const lastName = formData.get("lastName") as string
  const phone = formData.get("phone") as string

  if (!firstName || !lastName) {
    return { error: "First name and last name are required.", success: false }
  }

  try {
    await prisma.profile.update({
      where: { id: ctx.user.id },
      data: { firstName, lastName, phone: phone || null },
    })
    revalidatePath("/portal/parent/profile")
    return { success: true, error: undefined }
  } catch {
    return { error: "Failed to update profile.", success: false }
  }
}
