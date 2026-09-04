"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getSchoolId, getBranchId } from "@/lib/school-context"
import { z } from "zod"

const subjectSchema = z.object({
  name: z.string().min(1, "Subject name is required").max(100),
  code: z.string().min(1, "Subject code is required").max(20),
  type: z.enum(["CORE", "ELECTIVE"]),
})

const classSubjectSchema = z.object({
  classId: z.string().uuid("Invalid class ID"),
  subjectId: z.string().uuid("Invalid subject ID"),
})

export async function createSubject(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL")

  const schoolId = getSchoolId(profile, formData, "Create Subject")
  const branchId = getBranchId(profile, formData, "Create Subject")
  const name = formData.get("name") as string
  const code = formData.get("code") as string
  const type = formData.get("type") as string

  const parsed = subjectSchema.safeParse({ name, code, type })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  try {
    await prisma.subject.create({
      data: {
        school: { connect: { id: schoolId } },
        branch: { connect: { id: branchId } },
        name,
        code,
        type: type as any,
      },
    })

    revalidatePath("/dashboard/subjects")
    return { success: true, error: undefined }
  } catch (e) {
    return { error: "Failed to create subject. Please try again.", success: false }
  }
}

export async function updateSubject(
  subjectId: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL")

  // School isolation: verify subject belongs to user's school
  const existing = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { schoolId: true },
  })
  if (!existing) return { error: "Subject not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && existing.schoolId !== profile.schoolId) {
    return { error: "Unauthorized", success: false }
  }

  const name = formData.get("name") as string
  const code = formData.get("code") as string
  const type = formData.get("type") as string

  const parsed = subjectSchema.safeParse({ name, code, type })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  try {
    await prisma.subject.update({
      where: { id: subjectId },
      data: { name, code, type: type as any },
    })

    revalidatePath("/dashboard/subjects")
    return { success: true, error: undefined }
  } catch (e) {
    return { error: "Failed to update subject. Please try again.", success: false }
  }
}

export async function deleteSubject(subjectId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN")

  // School isolation: verify subject belongs to user's school
  const existing = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { schoolId: true },
  })
  if (!existing) return
  if (profile.role !== "SUPER_ADMIN" && existing.schoolId !== profile.schoolId) return

  try {
    await prisma.subject.delete({ where: { id: subjectId } })
    revalidatePath("/dashboard/subjects")
  } catch (e) {
    // Silently fail — subject may have dependent records
  }
}

export async function assignSubjectToClass(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL")

  const classId = formData.get("classId") as string
  const subjectId = formData.get("subjectId") as string

  const parsed = classSubjectSchema.safeParse({ classId, subjectId })
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

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { schoolId: true },
  })
  if (!subject) return { error: "Subject not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && subject.schoolId !== profile.schoolId) {
    return { error: "Forbidden", success: false }
  }

  try {
    await prisma.classSubject.create({
      data: { classId, subjectId },
    })

    revalidatePath("/dashboard/subjects")
    return { success: true, error: undefined }
  } catch (e) {
    return { error: "Failed to assign subject. It may already be assigned.", success: false }
  }
}

export async function removeSubjectFromClass(classSubjectId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const link = await prisma.classSubject.findUnique({
    where: { id: classSubjectId },
    include: { class: { select: { schoolId: true } } },
  })
  if (!link) return
  if (profile.role !== "SUPER_ADMIN" && link.class.schoolId !== profile.schoolId) return

  try {
    await prisma.classSubject.delete({ where: { id: classSubjectId } })
    revalidatePath("/dashboard/subjects")
  } catch (e) {
    // Silently fail
  }
}
