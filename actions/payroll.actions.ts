"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getSchoolId, getBranchId } from "@/lib/school-context"
import { z } from "zod"

const salaryStructureSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  basicSalary: z.string().min(1, "Basic salary is required"),
  allowance: z.string().optional(),
  deduction: z.string().optional(),
})

export async function createSalaryStructure(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT")
  const schoolId = getSchoolId(profile, formData, "Create Salary Structure")
  const branchId = getBranchId(profile, formData, "Create Salary Structure")

  const parsed = salaryStructureSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    basicSalary: formData.get("basicSalary"),
    allowance: formData.get("allowance"),
    deduction: formData.get("deduction"),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  await prisma.salaryStructure.create({
    data: {
      school: { connect: { id: schoolId } },
      branch: { connect: { id: branchId } },
      name: parsed.data.name,
      description: parsed.data.description,
      basicSalary: parsed.data.basicSalary,
      allowance: parsed.data.allowance || "0",
      deduction: parsed.data.deduction || "0",
    },
  })

  revalidatePath("/dashboard/staff/salary-structures")
  return { success: true, error: undefined }
}

export async function generateSalarySlips(month: number, year: number) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT")

  const staffWithSalary = await prisma.staffSalary.findMany({
    where: {
      isActive: true,
      staff: { schoolId: profile.schoolId || undefined },
    },
    include: {
      staff: { select: { id: true, firstName: true, lastName: true, schoolId: true } },
      salaryStructure: true,
    },
  })

  let created = 0
  for (const record of staffWithSalary) {
    const existing = await prisma.salarySlip.findUnique({
      where: { staffId_month_year: { staffId: record.staffId, month, year } },
    })

    if (existing) continue

    const netSalary =
      Number(record.salaryStructure.basicSalary) +
      Number(record.salaryStructure.allowance) -
      Number(record.salaryStructure.deduction)

    await prisma.salarySlip.create({
      data: {
        staff: { connect: { id: record.staffId } },
        structure: { connect: { id: record.salaryStructureId } },
        month,
        year,
        basicSalary: record.salaryStructure.basicSalary,
        allowance: record.salaryStructure.allowance,
        deduction: record.salaryStructure.deduction,
        netSalary: String(netSalary),
      },
    })
    created++
  }

  revalidatePath("/dashboard/staff/payroll")
  return { success: true, created }
}

export async function getSalarySlips(month: number, year: number) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT")

  return prisma.salarySlip.findMany({
    where: {
      month,
      year,
      staff: { schoolId: profile.schoolId || undefined },
    },
    include: {
      staff: { select: { firstName: true, lastName: true, employeeCode: true } },
      structure: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function markSlipPaid(slipId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT")

  const slip = await prisma.salarySlip.findUnique({
    where: { id: slipId },
    select: { staff: { select: { schoolId: true } } },
  })
  if (!slip) return { error: "Salary slip not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && slip.staff.schoolId !== profile.schoolId) {
    return { error: "Forbidden", success: false }
  }

  await prisma.salarySlip.update({
    where: { id: slipId },
    data: { status: "PAID", paidAt: new Date() },
  })

  revalidatePath("/dashboard/staff/payroll")
  return { success: true }
}

export async function getSalaryStructures() {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT")

  return prisma.salaryStructure.findMany({
    where: {
      isActive: true,
      schoolId: profile.schoolId || undefined,
    },
    orderBy: { createdAt: "desc" },
  })
}
