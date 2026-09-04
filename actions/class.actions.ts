"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getSchoolId, getBranchId } from "@/lib/school-context"
import { logAuditEvent } from "@/lib/audit"
import { z } from "zod"

const classSchema = z.object({
  name: z.string().min(1, "Class name is required").max(50),
  code: z.string().min(1, "Class code is required").max(20),
  order: z.number().int().min(0).default(0),
})

const sectionSchema = z.object({
  classId: z.string().uuid("Invalid class ID"),
  name: z.string().min(1, "Section name is required").max(20),
  capacity: z.number().int().min(1).default(30),
})

export async function createClass(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const schoolId = getSchoolId(profile, formData, "Create Class")
  const branchId = getBranchId(profile, formData, "Create Class")
  const name = formData.get("name") as string
  const code = formData.get("code") as string
  const order = parseInt(formData.get("order") as string) || 0

  const parsed = classSchema.safeParse({ name, code, order })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  try {
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
  } catch (e) {
    return { error: "Failed to create class. Please try again.", success: false }
  }
}

export async function updateClass(
  classId: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  // School isolation: verify class belongs to user's school
  const existing = await prisma.class.findUnique({
    where: { id: classId },
    select: { schoolId: true },
  })
  if (!existing) return { error: "Class not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && existing.schoolId !== profile.schoolId) {
    return { error: "Unauthorized", success: false }
  }

  const name = formData.get("name") as string
  const code = formData.get("code") as string
  const order = parseInt(formData.get("order") as string) || 0

  const parsed = classSchema.safeParse({ name, code, order })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  try {
    await prisma.class.update({
      where: { id: classId },
      data: { name, code, order },
    })

    revalidatePath("/dashboard/classes")
    return { success: true, error: undefined }
  } catch (e) {
    return { error: "Failed to update class. Please try again.", success: false }
  }
}

export async function deleteClass(classId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN")

  // School isolation: verify class belongs to user's school
  const existing = await prisma.class.findUnique({
    where: { id: classId },
    select: { schoolId: true },
  })
  if (!existing) return
  if (profile.role !== "SUPER_ADMIN" && existing.schoolId !== profile.schoolId) return

  try {
    await prisma.class.delete({ where: { id: classId } })

    await logAuditEvent({
      userId: profile.id,
      action: "DELETE",
      entityType: "Class",
      entityId: classId,
    })

    revalidatePath("/dashboard/classes")
  } catch (e) {
    // Silently fail — class may have dependent records
  }
}

export async function createSection(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const classId = formData.get("classId") as string
  const name = formData.get("name") as string
  const capacity = parseInt(formData.get("capacity") as string) || 30

  const parsed = sectionSchema.safeParse({ classId, name, capacity })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { schoolId: true },
  })
  if (!cls) return { error: "Class not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && cls.schoolId !== profile.schoolId) {
    return { error: "Forbidden", success: false }
  }

  try {
    await prisma.section.create({
      data: { classId, name, capacity },
    })

    revalidatePath(`/dashboard/classes/${classId}`)
    return { success: true, error: undefined }
  } catch (e) {
    return { error: "Failed to create section. Please try again.", success: false }
  }
}

export async function deleteSection(sectionId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  try {
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: { class: { select: { schoolId: true } } },
    })
    if (!section) return { error: "Section not found.", success: false }
    if (profile.role !== "SUPER_ADMIN" && section.class.schoolId !== profile.schoolId) {
      return { error: "Forbidden", success: false }
    }

    await prisma.section.delete({ where: { id: sectionId } })

    if (section) revalidatePath(`/dashboard/classes/${section.classId}`)
    return { success: true }
  } catch (e) {
    // Silently fail — section may have dependent records
  }
}

export async function updateSection(
  sectionId: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const name = formData.get("name") as string
  const capacity = parseInt(formData.get("capacity") as string) || 30

  const parsed = sectionSchema.safeParse({
    classId: "00000000-0000-0000-0000-000000000000",
    name,
    capacity,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: { class: { select: { schoolId: true } } },
  })
  if (!section) {
    return { error: "Section not found", success: false }
  }
  if (profile.role !== "SUPER_ADMIN" && section.class.schoolId !== profile.schoolId) {
    return { error: "Forbidden", success: false }
  }

  try {
    await prisma.section.update({
      where: { id: sectionId },
      data: { name, capacity },
    })

    revalidatePath(`/dashboard/classes/${section.classId}`)
    return { success: true, error: undefined }
  } catch (e) {
    return { error: "Failed to update section. Please try again.", success: false }
  }
}
