"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { logAuditEvent } from "@/lib/audit"
import { getSchoolId, getBranchId } from "@/lib/school-context"

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

  if (Number(amount) <= 0) return { error: "Amount must be positive.", success: false }

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
}

export async function updateExpense(
  expenseId: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const category = formData.get("category") as string
  const amount = formData.get("amount") as string
  const description = formData.get("description") as string || null
  const expenseDate = formData.get("expenseDate") as string

  if (Number(amount) <= 0) return { error: "Amount must be positive.", success: false }

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
}

export async function deleteExpense(expenseId: string) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")
  await prisma.expense.delete({ where: { id: expenseId } })
  revalidatePath("/dashboard/expenses")
  return { success: true }
}
