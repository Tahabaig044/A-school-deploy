"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"

export async function createAssignment(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL")

  const teacherId = formData.get("teacherId") as string
  const classId = formData.get("classId") as string
  const sectionId = formData.get("sectionId") as string
  const subjectId = formData.get("subjectId") as string
  const academicSessionId = formData.get("academicSessionId") as string

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { schoolId: true },
  })
  if (!teacher) return { error: "Teacher not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && teacher.schoolId !== profile.schoolId) {
    return { error: "Forbidden", success: false }
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
    return {
      error: "This teacher is already assigned to this class/section/subject.",
      success: false,
    }
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
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const assignment = await prisma.teacherAssignment.findUnique({
    where: { id: assignmentId },
    include: { class: { select: { schoolId: true } } },
  })
  if (!assignment) return
  if (profile.role !== "SUPER_ADMIN" && assignment.class.schoolId !== profile.schoolId) return

  await prisma.teacherAssignment.delete({ where: { id: assignmentId } })
  revalidatePath("/dashboard/assignments")
}
