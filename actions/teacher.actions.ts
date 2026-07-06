"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getSchoolId, getBranchId } from "@/lib/school-context"
import { logAuditEvent } from "@/lib/audit"

export async function createTeacher(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const schoolId = getSchoolId(profile, formData, "Create Teacher")
  const branchId = getBranchId(profile, formData, "Create Teacher")
  const firstName = formData.get("firstName") as string
  const lastName = formData.get("lastName") as string
  const employeeCode = formData.get("employeeCode") as string
  const phone = formData.get("phone") as string
  const email = formData.get("email") as string
  const address = formData.get("address") as string
  const qualification = formData.get("qualification") as string
  const specialization = formData.get("specialization") as string
  const joiningDate = formData.get("joiningDate") as string

  await prisma.teacher.create({
    data: {
      schoolId,
      branchId,
      firstName,
      lastName,
      employeeCode,
      phone: phone || null,
      email: email || null,
      address: address || null,
      qualification: qualification || null,
      specialization: specialization || null,
      joiningDate: joiningDate ? new Date(joiningDate) : null,
    },
  })

  await logAuditEvent({
    userId: profile.id,
    schoolId,
    branchId,
    action: "CREATE",
    entityType: "Teacher",
    newValues: { firstName, lastName, employeeCode },
  })

  revalidatePath("/dashboard/teachers")
  return { success: true, error: undefined }
}

export async function updateTeacher(
  teacherId: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const firstName = formData.get("firstName") as string
  const lastName = formData.get("lastName") as string
  const employeeCode = formData.get("employeeCode") as string
  const phone = formData.get("phone") as string
  const email = formData.get("email") as string
  const address = formData.get("address") as string
  const qualification = formData.get("qualification") as string
  const specialization = formData.get("specialization") as string
  const joiningDate = formData.get("joiningDate") as string
  const status = formData.get("status") as string

  await prisma.teacher.update({
    where: { id: teacherId },
    data: {
      firstName,
      lastName,
      employeeCode,
      phone: phone || null,
      email: email || null,
      address: address || null,
      qualification: qualification || null,
      specialization: specialization || null,
      joiningDate: joiningDate ? new Date(joiningDate) : null,
      status: status as any,
    },
  })

  revalidatePath("/dashboard/teachers")
  revalidatePath(`/dashboard/teachers/${teacherId}`)
  return { success: true, error: undefined }
}

export async function deleteTeacher(teacherId: string) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN")
  await prisma.teacher.delete({ where: { id: teacherId } })
  revalidatePath("/dashboard/teachers")
}
