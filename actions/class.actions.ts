"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getSchoolId, getBranchId } from "@/lib/school-context"
import { logAuditEvent } from "@/lib/audit"

export async function createClass(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const schoolId = getSchoolId(profile, formData, "Create Class")
  const branchId = getBranchId(profile, formData, "Create Class")
  const name = formData.get("name") as string
  const code = formData.get("code") as string
  const order = parseInt(formData.get("order") as string) || 0

  await prisma.class.create({
    data: {
      school: { connect: { id: schoolId } },
      branch: { connect: { id: branchId } },
      name,
      code,
      order,
    },
  })

  await logAuditEvent({
    userId: profile.id,
    schoolId,
    branchId,
    action: "CREATE",
    entityType: "Class",
    newValues: { name, code, order },
  })

  revalidatePath("/dashboard/classes")
  return { success: true, error: undefined }
}

export async function updateClass(
  classId: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const name = formData.get("name") as string
  const code = formData.get("code") as string
  const order = parseInt(formData.get("order") as string) || 0

  await prisma.class.update({
    where: { id: classId },
    data: { name, code, order },
  })

  revalidatePath("/dashboard/classes")
  return { success: true, error: undefined }
}

export async function deleteClass(classId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN")
  await prisma.class.delete({ where: { id: classId } })

  await logAuditEvent({
    userId: profile.id,
    action: "DELETE",
    entityType: "Class",
    entityId: classId,
  })

  revalidatePath("/dashboard/classes")
}

export async function createSection(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const classId = formData.get("classId") as string
  const name = formData.get("name") as string
  const capacity = parseInt(formData.get("capacity") as string) || 30

  await prisma.section.create({
    data: { classId, name, capacity },
  })

  revalidatePath(`/dashboard/classes/${classId}`)
  return { success: true, error: undefined }
}

export async function deleteSection(sectionId: string) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const section = await prisma.section.findUnique({ where: { id: sectionId } })
  await prisma.section.delete({ where: { id: sectionId } })

  if (section) revalidatePath(`/dashboard/classes/${section.classId}`)
}
