"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getSchoolId, getBranchId } from "@/lib/school-context"
import { logAuditEvent } from "@/lib/audit"

export async function createFeeStructure(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT")

  const schoolId = getSchoolId(profile, formData, "Create Fee Structure")
  const branchId = getBranchId(profile, formData, "Create Fee Structure")
  const name = formData.get("name") as string
  const amount = formData.get("amount") as string
  const frequency = formData.get("frequency") as string
  const category = formData.get("category") as string

  await prisma.feeStructure.create({
    data: {
      school: { connect: { id: schoolId } },
      branch: { connect: { id: branchId } },
      name,
      amount,
      frequency: frequency as any,
      category: category as any,
    },
  })

  await logAuditEvent({
    userId: profile.id,
    schoolId,
    branchId,
    action: "CREATE",
    entityType: "FeeStructure",
    newValues: { name, amount, frequency, category },
  })

  revalidatePath("/dashboard/fees/fee-structures")
  return { success: true, error: undefined }
}

export async function updateFeeStructure(
  feeStructureId: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT")

  const name = formData.get("name") as string
  const amount = formData.get("amount") as string
  const frequency = formData.get("frequency") as string
  const category = formData.get("category") as string
  const isActive = formData.get("isActive") === "true"

  await prisma.feeStructure.update({
    where: { id: feeStructureId },
    data: {
      name,
      amount,
      frequency: frequency as any,
      category: category as any,
      isActive,
    },
  })

  revalidatePath("/dashboard/fees/fee-structures")
  return { success: true, error: undefined }
}

export async function deleteFeeStructure(feeStructureId: string) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")
  await prisma.feeStructure.delete({ where: { id: feeStructureId } })
  revalidatePath("/dashboard/fees/fee-structures")
  return { success: true }
}

export async function assignFeePlan(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT")

  const studentId = formData.get("studentId") as string
  const feeStructureId = formData.get("feeStructureId") as string
  const academicSessionId = formData.get("academicSessionId") as string
  const discountType = formData.get("discountType") as string || null
  const discountValue = formData.get("discountValue") as string || null

  await prisma.studentFeePlan.create({
    data: {
      studentId,
      feeStructureId,
      academicSessionId,
      discountType,
      discountValue: discountValue || null,
    },
  })

  revalidatePath("/dashboard/fees")
  return { success: true, error: undefined }
}

export async function generateInvoice(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT")

  const studentId = formData.get("studentId") as string
  const academicSessionId = formData.get("academicSessionId") as string
  const dueDate = formData.get("dueDate") as string
  const notes = formData.get("notes") as string || null

  const feePlans = await prisma.studentFeePlan.findMany({
    where: { studentId, academicSessionId, isActive: true },
    include: { feeStructure: true },
  })

  if (!feePlans.length) {
    return { error: "No active fee plans found for this student.", success: false }
  }

  const totalAmount = feePlans.reduce((sum, plan) => sum + Number(plan.feeStructure.amount), 0)
  const totalDiscount = feePlans.reduce((sum, plan) => {
    if (plan.discountType === "PERCENTAGE") {
      return sum + (Number(plan.feeStructure.amount) * Number(plan.discountValue || 0)) / 100
    }
    if (plan.discountType === "FIXED") {
      return sum + Number(plan.discountValue || 0)
    }
    return sum
  }, 0)

  const year = new Date().getFullYear()
  const count = await prisma.feeInvoice.count()
  const invoiceNumber = `INV-${year}-${String(count + 1).padStart(5, "0")}`

  const invoice = await prisma.feeInvoice.create({
    data: {
      studentId,
      academicSessionId,
      invoiceNumber,
      invoiceDate: new Date(),
      dueDate: new Date(dueDate),
      totalAmount: String(totalAmount),
      discountAmount: String(totalDiscount),
      notes,
      items: {
        create: feePlans.map(plan => ({
          feeStructureId: plan.feeStructureId,
          amount: plan.feeStructure.amount,
        })),
      },
    },
  })

  revalidatePath("/dashboard/fees/invoices")
  return { success: true, error: undefined, invoice }
}

export async function recordPayment(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT")

  const invoiceId = formData.get("invoiceId") as string
  const amount = formData.get("amount") as string
  const paymentDate = formData.get("paymentDate") as string
  const paymentMode = formData.get("paymentMode") as string
  const referenceNumber = formData.get("referenceNumber") as string || null
  const notes = formData.get("notes") as string || null

  const invoice = await prisma.feeInvoice.findUnique({ where: { id: invoiceId } })
  if (!invoice) return { error: "Invoice not found.", success: false }
  if (invoice.status === "CANCELLED") return { error: "Cannot pay a cancelled invoice.", success: false }

  const parsedAmount = Number(amount)
  if (parsedAmount <= 0) return { error: "Payment amount must be positive.", success: false }

  const remaining = Number(invoice.totalAmount) + Number(invoice.lateFee) - Number(invoice.paidAmount) - Number(invoice.discountAmount)
  if (parsedAmount > remaining) {
    return { error: "Payment amount exceeds remaining balance.", success: false }
  }

  const count = await prisma.payment.count()
  const receiptNumber = `RCPT-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        invoiceId,
        receiptNumber,
        amount: String(parsedAmount),
        paymentDate: new Date(paymentDate),
        paymentMode: paymentMode as any,
        referenceNumber,
        notes,
        recordedBy: profile.id,
      },
    })

    const updatedPaidAmount = Number(invoice.paidAmount) + parsedAmount
    const totalDue = Number(invoice.totalAmount) + Number(invoice.lateFee) - Number(invoice.discountAmount)
    const newStatus = updatedPaidAmount >= totalDue ? "PAID" : "PARTIAL"

    await tx.feeInvoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: String(updatedPaidAmount),
        status: newStatus,
      },
    })
  })

  await logAuditEvent({
    userId: profile.id,
    action: "PAYMENT",
    entityType: "FeePayment",
    entityId: invoiceId,
    newValues: { amount: parsedAmount, receiptNumber, paymentMode },
  })

  revalidatePath("/dashboard/fees/invoices")
  return { success: true, error: undefined }
}

export async function getFeeDefaulters(branchId: string, academicSessionId: string) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT")

  const overdueInvoices = await prisma.feeInvoice.findMany({
    where: {
      dueDate: { lt: new Date() },
      status: { in: ["PENDING", "PARTIAL"] },
      student: { branchId },
      academicSessionId,
    },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, admissionNo: true, phone: true } },
    },
    orderBy: { dueDate: "asc" },
  })

  return overdueInvoices
}

export async function getCollectionReport(
  branchId: string,
  fromDate: string,
  toDate: string
) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT")

  const payments = await prisma.payment.findMany({
    where: {
      paymentDate: { gte: new Date(fromDate), lte: new Date(toDate) },
      invoice: { student: { branchId } },
    },
    include: {
      invoice: {
        include: { student: { select: { firstName: true, lastName: true, admissionNo: true } } },
      },
    },
    orderBy: { paymentDate: "desc" },
  })

  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const byMode = payments.reduce<Record<string, number>>((acc, p) => {
    acc[p.paymentMode] = (acc[p.paymentMode] || 0) + Number(p.amount)
    return acc
  }, {})

  return { payments, totalCollected, byMode }
}
