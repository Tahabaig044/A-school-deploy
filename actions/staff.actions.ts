"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getSchoolId, getBranchId } from "@/lib/school-context"
import { logAuditEvent } from "@/lib/audit"
import { z } from "zod"

const staffSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  employeeCode: z.string().min(1, "Employee code is required").max(50),
  department: z.string().min(1, "Department is required").max(100),
  designation: z.string().min(1, "Designation is required").max(100),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email").optional().nullable(),
  joiningDate: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "RESIGNED"]).optional(),
})

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

  const parsed = staffSchema.safeParse({
    firstName, lastName, employeeCode, department, designation, phone, email, joiningDate,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  try {
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
  } catch (e) {
    return { error: "Failed to create staff. Please try again.", success: false }
  }
}

export async function updateStaff(
  staffId: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  // School isolation: verify staff belongs to user's school
  const existing = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { schoolId: true },
  })
  if (!existing) return { error: "Staff not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && existing.schoolId !== profile.schoolId) {
    return { error: "Unauthorized", success: false }
  }

  const firstName = formData.get("firstName") as string
  const lastName = formData.get("lastName") as string
  const employeeCode = formData.get("employeeCode") as string
  const department = formData.get("department") as string
  const designation = formData.get("designation") as string
  const phone = formData.get("phone") as string
  const email = formData.get("email") as string
  const joiningDate = formData.get("joiningDate") as string
  const status = formData.get("status") as string

  const parsed = staffSchema.safeParse({
    firstName, lastName, employeeCode, department, designation, phone, email, joiningDate, status,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  try {
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
  } catch (e) {
    return { error: "Failed to update staff. Please try again.", success: false }
  }
}

export async function deleteStaff(staffId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN")

  // School isolation: verify staff belongs to user's school
  const existing = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { schoolId: true },
  })
  if (!existing) return
  if (profile.role !== "SUPER_ADMIN" && existing.schoolId !== profile.schoolId) return

  try {
    await prisma.staff.delete({ where: { id: staffId } })
    revalidatePath("/dashboard/staff")
  } catch (e) {
    // Silently fail — staff may have dependent records
  }
}
