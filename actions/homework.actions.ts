"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getSchoolId, getBranchId } from "@/lib/school-context"
import { z } from "zod"

const homeworkSchema = z.object({
  schoolId: z.string().uuid(),
  branchId: z.string().uuid(),
  classId: z.string().uuid(),
  sectionId: z.string().uuid().optional(),
  subjectId: z.string().uuid(),
  teacherId: z.string().uuid(),
  academicSessionId: z.string().uuid(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z.string().min(1, "Due date is required"),
  totalMarks: z.number().int().min(0).optional(),
})

const homeworkSubmissionSchema = z.object({
  homeworkId: z.string().uuid(),
  content: z.string().optional(),
  filePath: z.string().optional(),
})

export async function createHomework(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")

  const schoolId = getSchoolId(profile, formData, "Create Homework")
  const branchId = getBranchId(profile, formData, "Create Homework")
  const classId = formData.get("classId") as string
  const sectionId = (formData.get("sectionId") as string) || undefined
  const subjectId = formData.get("subjectId") as string
  const teacherId = formData.get("teacherId") as string
  const academicSessionId = formData.get("academicSessionId") as string
  const title = formData.get("title") as string
  const description = (formData.get("description") as string) || undefined
  const dueDate = formData.get("dueDate") as string
  const totalMarksStr = formData.get("totalMarks") as string
  const totalMarks = totalMarksStr ? Number(totalMarksStr) : undefined

  const parsed = homeworkSchema.safeParse({
    schoolId,
    branchId,
    classId,
    sectionId,
    subjectId,
    teacherId,
    academicSessionId,
    title,
    description,
    dueDate,
    totalMarks,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  await prisma.homework.create({
    data: {
      school: { connect: { id: schoolId } },
      branch: { connect: { id: branchId } },
      class: { connect: { id: classId } },
      section: sectionId ? { connect: { id: sectionId } } : undefined,
      subject: { connect: { id: subjectId } },
      teacher: { connect: { id: teacherId } },
      academicSession: { connect: { id: academicSessionId } },
      title,
      description,
      dueDate: new Date(dueDate),
      totalMarks,
    },
  })

  revalidatePath("/dashboard/homework")
  revalidatePath("/portal/student/homework")
  revalidatePath("/portal/parent/homework")
  return { success: true, error: undefined }
}

export async function updateHomework(
  homeworkId: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")

  const existing = await prisma.homework.findUnique({
    where: { id: homeworkId },
    select: { schoolId: true },
  })
  if (!existing) return { error: "Homework not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && existing.schoolId !== profile.schoolId) {
    return { error: "Forbidden", success: false }
  }

  const title = formData.get("title") as string
  const description = (formData.get("description") as string) || undefined
  const dueDate = formData.get("dueDate") as string
  const totalMarksStr = formData.get("totalMarks") as string
  const totalMarks = totalMarksStr ? Number(totalMarksStr) : undefined
  const isActive = formData.get("isActive") === "true"

  await prisma.homework.update({
    where: { id: homeworkId },
    data: {
      title,
      description,
      dueDate: new Date(dueDate),
      totalMarks,
      isActive,
    },
  })

  revalidatePath("/dashboard/homework")
  revalidatePath("/portal/student/homework")
  revalidatePath("/portal/parent/homework")
  return { success: true, error: undefined }
}

export async function deleteHomework(homeworkId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")

  const existing = await prisma.homework.findUnique({
    where: { id: homeworkId },
    select: { schoolId: true },
  })
  if (!existing) return { error: "Homework not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && existing.schoolId !== profile.schoolId) {
    return { error: "Forbidden", success: false }
  }

  await prisma.homework.delete({ where: { id: homeworkId } })
  revalidatePath("/dashboard/homework")
  revalidatePath("/portal/student/homework")
  revalidatePath("/portal/parent/homework")
  return { success: true }
}

export async function getHomework(
  schoolId: string,
  branchId: string,
  filters?: {
    classId?: string
    subjectId?: string
    teacherId?: string
    academicSessionId?: string
  },
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "STUDENT")

  const effectiveSchoolId = profile.role === "SUPER_ADMIN" ? schoolId : profile.schoolId!

  return prisma.homework.findMany({
    where: {
      schoolId: effectiveSchoolId,
      ...(profile.role === "SUPER_ADMIN" ? { branchId } : {}),
      ...(filters?.classId && { classId: filters.classId }),
      ...(filters?.subjectId && { subjectId: filters.subjectId }),
      ...(filters?.teacherId && { teacherId: filters.teacherId }),
      ...(filters?.academicSessionId && { academicSessionId: filters.academicSessionId }),
    },
    include: {
      class: true,
      section: true,
      subject: true,
      teacher: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { submissions: true } },
    },
    orderBy: { dueDate: "desc" },
  })
}

export async function getHomeworkById(homeworkId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "STUDENT")

  const homework = await prisma.homework.findUnique({
    where: { id: homeworkId },
    include: {
      class: true,
      section: true,
      subject: true,
      teacher: { select: { id: true, firstName: true, lastName: true } },
      academicSession: true,
    },
  })
  if (!homework) return null
  if (profile.role !== "SUPER_ADMIN" && homework.schoolId !== profile.schoolId) return null

  return homework
}

export async function submitHomework(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "STUDENT")

  const homeworkId = formData.get("homeworkId") as string
  const content = (formData.get("content") as string) || undefined
  const filePath = (formData.get("filePath") as string) || undefined

  const parsed = homeworkSubmissionSchema.safeParse({ homeworkId, content, filePath })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  const homework = await prisma.homework.findUnique({ where: { id: homeworkId } })
  if (!homework) return { error: "Homework not found.", success: false }

  if (profile.role !== "SUPER_ADMIN" && homework.schoolId !== profile.schoolId) {
    return { error: "Forbidden", success: false }
  }

  if (profile.role === "STUDENT") {
    const student = await prisma.student.findFirst({
      where: { email: profile.email ?? "" },
      select: { schoolId: true },
    })
    if (!student || student.schoolId !== homework.schoolId) {
      return { error: "Forbidden", success: false }
    }
  }

  if (new Date() > homework.dueDate) {
    return { error: "Submission deadline has passed.", success: false }
  }

  const existing = await prisma.homeworkSubmission.findFirst({
    where: { homeworkId, studentId: profile.id },
    orderBy: { submittedAt: "desc" },
  })

  if (existing) {
    await prisma.homeworkSubmission.update({
      where: { id: existing.id },
      data: { content, filePath, status: "SUBMITTED", submittedAt: new Date() },
    })
  } else {
    await prisma.homeworkSubmission.create({
      data: { homeworkId, studentId: profile.id, content, filePath, status: "SUBMITTED" },
    })
  }

  revalidatePath("/dashboard/homework/submissions")
  return { success: true, error: undefined }
}

export async function gradeHomework(
  submissionId: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")

  const marksObtained = Number(formData.get("marksObtained") as string)
  const feedback = (formData.get("feedback") as string) || undefined

  const submission = await prisma.homeworkSubmission.findUnique({
    where: { id: submissionId },
    include: { homework: { select: { id: true, teacherId: true, schoolId: true, totalMarks: true } } },
  })
  if (!submission) return { error: "Submission not found.", success: false }

  if (profile.role === "TEACHER" && submission.homework.teacherId !== profile.id) {
    return { error: "Forbidden", success: false }
  }
  if (profile.role !== "SUPER_ADMIN" && submission.homework.schoolId !== profile.schoolId) {
    return { error: "Forbidden", success: false }
  }

  if (submission.homework.totalMarks && marksObtained > submission.homework.totalMarks) {
    return { error: "Marks cannot exceed total marks.", success: false }
  }

  await prisma.homeworkSubmission.update({
    where: { id: submissionId },
    data: {
      marksObtained,
      feedback,
      status: "GRADED",
      gradedAt: new Date(),
    },
  })

  revalidatePath("/dashboard/homework/check")
  revalidatePath("/portal/student/homework")
  revalidatePath("/portal/parent/homework")
  return { success: true, error: undefined }
}

export async function getHomeworkSubmissions(homeworkId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")

  const homework = await prisma.homework.findUnique({
    where: { id: homeworkId },
    select: { schoolId: true, teacherId: true },
  })
  if (!homework) return []
  if (profile.role === "TEACHER" && homework.teacherId !== profile.id) return []
  if (profile.role !== "SUPER_ADMIN" && homework.schoolId !== profile.schoolId) return []

  return prisma.homeworkSubmission.findMany({
    where: { homeworkId },
    include: {
      student: {
        select: { id: true, firstName: true, lastName: true, admissionNo: true },
      },
    },
    orderBy: { submittedAt: "desc" },
  })
}

export async function getStudentSubmissions(studentId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "STUDENT", "TEACHER")

  if (profile.role === "STUDENT") {
    const own = await prisma.student.findFirst({ where: { email: profile.email ?? "" } })
    if (!own || own.id !== studentId) return []
  } else if (profile.role !== "SUPER_ADMIN") {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { schoolId: true },
    })
    if (!student || student.schoolId !== profile.schoolId) return []
  }

  return prisma.homeworkSubmission.findMany({
    where: { studentId },
    include: {
      homework: {
        include: {
          class: true,
          subject: true,
          teacher: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { submittedAt: "desc" },
  })
}
