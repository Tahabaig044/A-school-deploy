"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getSchoolId, getBranchId } from "@/lib/school-context"
import { logAuditEvent } from "@/lib/audit"
import { z } from "zod"

const teacherSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  employeeCode: z.string().min(1, "Employee code is required").max(50),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email").optional().nullable(),
  address: z.string().optional().nullable(),
  qualification: z.string().optional().nullable(),
  specialization: z.string().optional().nullable(),
  joiningDate: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "RESIGNED"]).optional(),
})

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

  const parsed = teacherSchema.safeParse({
    firstName, lastName, employeeCode, phone, email, address,
    qualification, specialization, joiningDate,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  try {
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
  } catch (e) {
    return { error: "Failed to create teacher. Please try again.", success: false }
  }
}

export async function updateTeacher(
  teacherId: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  // School isolation: verify teacher belongs to user's school
  const existing = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { schoolId: true },
  })
  if (!existing) return { error: "Teacher not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && existing.schoolId !== profile.schoolId) {
    return { error: "Unauthorized", success: false }
  }

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

  const parsed = teacherSchema.safeParse({
    firstName, lastName, employeeCode, phone, email, address,
    qualification, specialization, joiningDate, status,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  try {
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
  } catch (e) {
    return { error: "Failed to update teacher. Please try again.", success: false }
  }
}

export async function deleteTeacher(teacherId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN")

  // School isolation: verify teacher belongs to user's school
  const existing = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { schoolId: true },
  })
  if (!existing) return
  if (profile.role !== "SUPER_ADMIN" && existing.schoolId !== profile.schoolId) return

  try {
    await prisma.teacher.delete({ where: { id: teacherId } })
    revalidatePath("/dashboard/teachers")
  } catch (e) {
    // Silently fail — teacher may have dependent records
  }
}
