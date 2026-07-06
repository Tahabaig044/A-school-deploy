"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"

export async function createAssignment(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL")

  const teacherId = formData.get("teacherId") as string
  const classId = formData.get("classId") as string
  const sectionId = formData.get("sectionId") as string
  const subjectId = formData.get("subjectId") as string
  const academicSessionId = formData.get("academicSessionId") as string

  const existing = await prisma.teacherAssignment.findFirst({
    where: {
      teacherId,
      classId,
      sectionId: sectionId || null,
      subjectId,
      academicSessionId,
    },
  })

  if (existing) {
    return { error: "This teacher is already assigned to this class/section/subject.", success: false }
  }

  await prisma.teacherAssignment.create({
    data: {
      teacherId,
      classId,
      sectionId: sectionId || null,
      subjectId,
      academicSessionId,
    },
  })

  revalidatePath("/dashboard/assignments")
  return { success: true, error: undefined }
}

export async function deleteAssignment(assignmentId: string) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")
  await prisma.teacherAssignment.delete({ where: { id: assignmentId } })
  revalidatePath("/dashboard/assignments")
}
