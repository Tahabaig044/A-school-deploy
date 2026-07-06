"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { logAuditEvent } from "@/lib/audit"
import { getSchoolId, getBranchId } from "@/lib/school-context"
import { z } from "zod"

const expenseSchema = z.object({
  category: z.string().min(1, "Category is required").max(100),
  amount: z.string().min(1, "Amount is required"),
  description: z.string().optional().nullable(),
  expenseDate: z.string().min(1, "Expense date is required"),
})

export async function createExpense(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT")

  const schoolId = getSchoolId(profile, formData, "Create Expense")
  const branchId = getBranchId(profile, formData, "Create Expense")
  const category = formData.get("category") as string
  const amount = formData.get("amount") as string
  const description = formData.get("description") as string || null
  const expenseDate = formData.get("expenseDate") as string

  const parsed = expenseSchema.safeParse({ category, amount, description, expenseDate })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  if (Number(amount) <= 0) return { error: "Amount must be positive.", success: false }

  try {
    await prisma.expense.create({
      data: {
        school: { connect: { id: schoolId } },
        branch: { connect: { id: branchId } },
        recorder: { connect: { id: profile.id } },
        category,
        amount,
        description,
        expenseDate: new Date(expenseDate),
      },
    })

    await logAuditEvent({
      userId: profile.id,
      schoolId,
      branchId,
      action: "CREATE",
      entityType: "Expense",
      newValues: { category, amount, description },
    })

    revalidatePath("/dashboard/expenses")
    return { success: true, error: undefined }
  } catch (e) {
    return { error: "Failed to create expense. Please try again.", success: false }
  }
}

export async function updateExpense(
  expenseId: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  // School isolation: verify expense belongs to user's school
  const existing = await prisma.expense.findUnique({
    where: { id: expenseId },
    select: { schoolId: true },
  })
  if (!existing) return { error: "Expense not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && existing.schoolId !== profile.schoolId) {
    return { error: "Unauthorized", success: false }
  }

  const category = formData.get("category") as string
  const amount = formData.get("amount") as string
  const description = formData.get("description") as string || null
  const expenseDate = formData.get("expenseDate") as string

  const parsed = expenseSchema.safeParse({ category, amount, description, expenseDate })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  if (Number(amount) <= 0) return { error: "Amount must be positive.", success: false }

  try {
    await prisma.expense.update({
      where: { id: expenseId },
      data: {
        category,
        amount,
        description,
        expenseDate: new Date(expenseDate),
      },
    })

    revalidatePath("/dashboard/expenses")
    return { success: true, error: undefined }
  } catch (e) {
    return { error: "Failed to update expense. Please try again.", success: false }
  }
}

export async function deleteExpense(expenseId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  // School isolation: verify expense belongs to user's school
  const existing = await prisma.expense.findUnique({
    where: { id: expenseId },
    select: { schoolId: true },
  })
  if (!existing) return { error: "Expense not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && existing.schoolId !== profile.schoolId) {
    return { error: "Unauthorized", success: false }
  }

  try {
    await prisma.expense.delete({ where: { id: expenseId } })
    revalidatePath("/dashboard/expenses")
    return { success: true }
  } catch (e) {
    return { error: "Failed to delete expense. Please try again.", success: false }
  }
}
