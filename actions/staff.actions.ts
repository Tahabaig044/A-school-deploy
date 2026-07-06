"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getSchoolId, getBranchId } from "@/lib/school-context"
import { logAuditEvent } from "@/lib/audit"

export async function createStaff(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const schoolId = getSchoolId(profile, formData, "Create Staff")
  const branchId = getBranchId(profile, formData, "Create Staff")
  const firstName = formData.get("firstName") as string
  const lastName = formData.get("lastName") as string
  const employeeCode = formData.get("employeeCode") as string
  const department = formData.get("department") as string
  const designation = formData.get("designation") as string
  const phone = formData.get("phone") as string
  const email = formData.get("email") as string
  const joiningDate = formData.get("joiningDate") as string

  await prisma.staff.create({
    data: {
      schoolId,
      branchId,
      firstName,
      lastName,
      employeeCode,
      department,
      designation,
      phone: phone || null,
      email: email || null,
      joiningDate: joiningDate ? new Date(joiningDate) : null,
    },
  })

  await logAuditEvent({
    userId: profile.id,
    schoolId,
    branchId,
    action: "CREATE",
    entityType: "Staff",
    newValues: { firstName, lastName, employeeCode },
  })

  revalidatePath("/dashboard/staff")
  return { success: true, error: undefined }
}

export async function updateStaff(
  staffId: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const firstName = formData.get("firstName") as string
  const lastName = formData.get("lastName") as string
  const employeeCode = formData.get("employeeCode") as string
  const department = formData.get("department") as string
  const designation = formData.get("designation") as string
  const phone = formData.get("phone") as string
  const email = formData.get("email") as string
  const joiningDate = formData.get("joiningDate") as string
  const status = formData.get("status") as string

  await prisma.staff.update({
    where: { id: staffId },
    data: {
      firstName,
      lastName,
      employeeCode,
      department,
      designation,
      phone: phone || null,
      email: email || null,
      joiningDate: joiningDate ? new Date(joiningDate) : null,
      status: status as any,
    },
  })

  revalidatePath("/dashboard/staff")
  return { success: true, error: undefined }
}

export async function deleteStaff(staffId: string) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN")
  await prisma.staff.delete({ where: { id: staffId } })
  revalidatePath("/dashboard/staff")
}
