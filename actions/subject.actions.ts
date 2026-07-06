"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getSchoolId, getBranchId } from "@/lib/school-context"

export async function createSubject(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL")

  const schoolId = getSchoolId(profile, formData, "Create Subject")
  const branchId = getBranchId(profile, formData, "Create Subject")
  const name = formData.get("name") as string
  const code = formData.get("code") as string
  const type = formData.get("type") as string

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
}

export async function updateSubject(
  subjectId: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL")

  const name = formData.get("name") as string
  const code = formData.get("code") as string
  const type = formData.get("type") as string

  await prisma.subject.update({
    where: { id: subjectId },
    data: { name, code, type: type as any },
  })

  revalidatePath("/dashboard/subjects")
  return { success: true, error: undefined }
}

export async function deleteSubject(subjectId: string) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN")
  await prisma.subject.delete({ where: { id: subjectId } })
  revalidatePath("/dashboard/subjects")
}

export async function assignSubjectToClass(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL")

  const classId = formData.get("classId") as string
  const subjectId = formData.get("subjectId") as string

  await prisma.classSubject.create({
    data: { classId, subjectId },
  })

  revalidatePath("/dashboard/subjects")
  return { success: true, error: undefined }
}

export async function removeSubjectFromClass(classSubjectId: string) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")
  await prisma.classSubject.delete({ where: { id: classSubjectId } })
  revalidatePath("/dashboard/subjects")
}
