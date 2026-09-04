"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { logAuditEvent } from "@/lib/audit"

export async function assignClassTeacher(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL")

  const classId = formData.get("classId") as string
  const teacherId = formData.get("teacherId") as string

  if (!classId || !teacherId) {
    return { error: "Class and Teacher are required.", success: false }
  }

  const classData = await prisma.class.findUnique({
    where: { id: classId },
    select: { schoolId: true, branchId: true, classTeacherId: true },
  })
  if (!classData) return { error: "Class not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && classData.schoolId !== profile.schoolId) {
    return { error: "Unauthorized", success: false }
  }

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { schoolId: true, status: true },
  })
  if (!teacher) return { error: "Teacher not found.", success: false }
  if (teacher.status !== "ACTIVE")
    return { error: "Cannot assign inactive teacher as class teacher.", success: false }
  if (profile.role !== "SUPER_ADMIN" && teacher.schoolId !== profile.schoolId) {
    return { error: "Teacher does not belong to this school.", success: false }
  }

  try {
    const oldTeacherId = classData.classTeacherId

    await prisma.class.update({
      where: { id: classId },
      data: { classTeacherId: teacherId },
    })

    await logAuditEvent({
      userId: profile.id,
      schoolId: classData.schoolId,
      branchId: classData.branchId,
      action: "UPDATE",
      entityType: "Class",
      entityId: classId,
      oldValues: oldTeacherId ? { classTeacherId: oldTeacherId } : undefined,
      newValues: { classTeacherId: teacherId },
    })

    revalidatePath(`/dashboard/classes/${classId}`)
    revalidatePath("/dashboard/classes")
    return { success: true }
  } catch {
    return { error: "Failed to assign class teacher.", success: false }
  }
}

export async function removeClassTeacher(
  classId: string,
): Promise<{ error?: string; success?: boolean }> {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const classData = await prisma.class.findUnique({
    where: { id: classId },
    select: { schoolId: true },
  })
  if (!classData) return { error: "Class not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && classData.schoolId !== profile.schoolId) {
    return { error: "Unauthorized", success: false }
  }

  try {
    await prisma.class.update({
      where: { id: classId },
      data: { classTeacherId: null },
    })

    revalidatePath(`/dashboard/classes/${classId}`)
    revalidatePath("/dashboard/classes")
    return { success: true }
  } catch {
    return { error: "Failed to remove class teacher.", success: false }
  }
}
