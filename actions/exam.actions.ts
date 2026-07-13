"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getSchoolId, getBranchId } from "@/lib/school-context"
import { logAuditEvent } from "@/lib/audit"
import { z } from "zod"
import type { Grade } from "@/lib/generated/prisma/enums"

const examTypeSchema = z.object({
  schoolId: z.string().uuid(),
  branchId: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  weight: z.number().int().min(1).default(1),
})

const examSchema = z.object({
  schoolId: z.string().uuid(),
  branchId: z.string().uuid(),
  examTypeId: z.string().uuid(),
  classId: z.string().uuid(),
  subjectId: z.string().uuid(),
  academicSessionId: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  totalMarks: z.number().int().min(1, "Total marks must be at least 1"),
  passingMarks: z.number().int().min(1, "Passing marks must be at least 1"),
  examDate: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  description: z.string().optional(),
}).refine((data) => data.passingMarks <= data.totalMarks, {
  message: "Passing marks cannot exceed total marks",
  path: ["passingMarks"],
})

const examScheduleSchema = z.object({
  examId: z.string().uuid(),
  room: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  notes: z.string().optional(),
})

const examResultSchema = z.object({
  examId: z.string().uuid(),
  studentId: z.string().uuid(),
  marksObtained: z.number().min(0, "Marks cannot be negative").optional(),
  grade: z.enum(["A_PLUS", "A", "B_PLUS", "B", "C_PLUS", "C", "D", "F"]).optional(),
  remarks: z.string().optional(),
})

function calculateGrade(percentage: number): string {
  if (percentage >= 90) return "A_PLUS"
  if (percentage >= 80) return "A"
  if (percentage >= 70) return "B_PLUS"
  if (percentage >= 60) return "B"
  if (percentage >= 50) return "C_PLUS"
  if (percentage >= 40) return "C"
  if (percentage >= 33) return "D"
  return "F"
}

export async function createExamType(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const schoolId = getSchoolId(profile, formData, "Create Exam Type")
  const branchId = getBranchId(profile, formData, "Create Exam Type")
  const name = formData.get("name") as string
  const description = formData.get("description") as string || undefined
  const weight = Number(formData.get("weight") as string) || 1

  const parsed = examTypeSchema.safeParse({ schoolId, branchId, name, description, weight })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  await prisma.examType.create({
    data: {
      school: { connect: { id: schoolId } },
      branch: { connect: { id: branchId } },
      name, description, weight,
    },
  })

  await logAuditEvent({
    userId: profile.id,
    schoolId,
    branchId,
    action: "CREATE",
    entityType: "ExamType",
    newValues: { name, weight },
  })

  revalidatePath("/dashboard/exams/exam-types")
  return { success: true, error: undefined }
}

export async function updateExamType(
  examTypeId: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  // School isolation: verify exam type belongs to user's school
  const existing = await prisma.examType.findUnique({
    where: { id: examTypeId },
    select: { schoolId: true },
  })
  if (!existing) return { error: "Exam type not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && existing.schoolId !== profile.schoolId) {
    return { error: "Unauthorized", success: false }
  }

  const name = formData.get("name") as string
  const description = formData.get("description") as string || undefined
  const weight = Number(formData.get("weight") as string) || 1
  const isActive = formData.get("isActive") === "true"

  await prisma.examType.update({
    where: { id: examTypeId },
    data: { name, description, weight, isActive },
  })

  revalidatePath("/dashboard/exams/exam-types")
  return { success: true, error: undefined }
}

export async function deleteExamType(examTypeId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  // School isolation: verify exam type belongs to user's school
  const existing = await prisma.examType.findUnique({
    where: { id: examTypeId },
    select: { schoolId: true },
  })
  if (!existing) return { error: "Exam type not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && existing.schoolId !== profile.schoolId) {
    return { error: "Unauthorized", success: false }
  }

  await prisma.examType.delete({ where: { id: examTypeId } })
  revalidatePath("/dashboard/exams/exam-types")
  return { success: true }
}

export async function getExamTypes(schoolId: string, branchId: string) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")

  return prisma.examType.findMany({
    where: { schoolId, branchId },
    orderBy: { name: "asc" },
  })
}

export async function createExam(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const schoolId = getSchoolId(profile, formData, "Create Exam")
  const branchId = getBranchId(profile, formData, "Create Exam")
  const examTypeId = formData.get("examTypeId") as string
  const classId = formData.get("classId") as string
  const subjectId = formData.get("subjectId") as string
  const academicSessionId = formData.get("academicSessionId") as string
  const name = formData.get("name") as string
  const totalMarks = Number(formData.get("totalMarks") as string)
  const passingMarks = Number(formData.get("passingMarks") as string)
  const examDate = formData.get("examDate") as string || undefined
  const startTime = formData.get("startTime") as string || undefined
  const endTime = formData.get("endTime") as string || undefined
  const description = formData.get("description") as string || undefined

  const parsed = examSchema.safeParse({
    schoolId, branchId, examTypeId, classId, subjectId, academicSessionId,
    name, totalMarks, passingMarks, examDate, startTime, endTime, description,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  await prisma.exam.create({
    data: {
      school: { connect: { id: schoolId } },
      branch: { connect: { id: branchId } },
      examType: { connect: { id: examTypeId } },
      class: { connect: { id: classId } },
      subject: { connect: { id: subjectId } },
      academicSession: { connect: { id: academicSessionId } },
      name, totalMarks, passingMarks,
      examDate: examDate ? new Date(examDate) : undefined,
      startTime, endTime, description,
    },
  })

  await logAuditEvent({
    userId: profile.id,
    schoolId,
    branchId,
    action: "CREATE",
    entityType: "Exam",
    newValues: { name, totalMarks, passingMarks },
  })

  revalidatePath("/dashboard/exams")
  return { success: true, error: undefined }
}

export async function updateExam(
  examId: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  // School isolation: verify exam belongs to user's school
  const existing = await prisma.exam.findUnique({
    where: { id: examId },
    select: { schoolId: true },
  })
  if (!existing) return { error: "Exam not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && existing.schoolId !== profile.schoolId) {
    return { error: "Unauthorized", success: false }
  }

  const name = formData.get("name") as string
  const totalMarks = Number(formData.get("totalMarks") as string)
  const passingMarks = Number(formData.get("passingMarks") as string)
  const examDate = formData.get("examDate") as string || undefined
  const startTime = formData.get("startTime") as string || undefined
  const endTime = formData.get("endTime") as string || undefined
  const description = formData.get("description") as string || undefined
  const isPublished = formData.get("isPublished") === "true"

  if (passingMarks > totalMarks) {
    return { error: "Passing marks cannot exceed total marks.", success: false }
  }

  await prisma.exam.update({
    where: { id: examId },
    data: {
      name, totalMarks, passingMarks,
      examDate: examDate ? new Date(examDate) : undefined,
      startTime, endTime, description, isPublished,
    },
  })

  revalidatePath("/dashboard/exams")
  return { success: true, error: undefined }
}

export async function deleteExam(examId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  // School isolation: verify exam belongs to user's school
  const existing = await prisma.exam.findUnique({
    where: { id: examId },
    select: { schoolId: true },
  })
  if (!existing) return { error: "Exam not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && existing.schoolId !== profile.schoolId) {
    return { error: "Unauthorized", success: false }
  }

  await prisma.exam.delete({ where: { id: examId } })
  revalidatePath("/dashboard/exams")
  return { success: true }
}

export async function getExams(
  schoolId: string,
  branchId: string,
  filters?: { classId?: string; subjectId?: string; examTypeId?: string; academicSessionId?: string }
) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")

  return prisma.exam.findMany({
    where: {
      schoolId, branchId,
      ...(filters?.classId && { classId: filters.classId }),
      ...(filters?.subjectId && { subjectId: filters.subjectId }),
      ...(filters?.examTypeId && { examTypeId: filters.examTypeId }),
      ...(filters?.academicSessionId && { academicSessionId: filters.academicSessionId }),
    },
    include: {
      examType: true,
      class: true,
      subject: true,
      academicSession: true,
      _count: { select: { results: true } },
    },
    orderBy: { examDate: "desc" },
  })
}

export async function getExamById(examId: string) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")

  return prisma.exam.findUnique({
    where: { id: examId },
    include: {
      examType: true,
      class: { include: { sections: true } },
      subject: true,
      academicSession: true,
      schedules: true,
    },
  })
}

export async function createExamSchedule(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const examId = formData.get("examId") as string
  const room = formData.get("room") as string || undefined
  const date = formData.get("date") as string
  const startTime = formData.get("startTime") as string
  const endTime = formData.get("endTime") as string
  const notes = formData.get("notes") as string || undefined

  const parsed = examScheduleSchema.safeParse({ examId, room, date, startTime, endTime, notes })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  await prisma.examSchedule.create({
    data: {
      examId, room, date: new Date(date), startTime, endTime, notes,
    },
  })

  revalidatePath("/dashboard/exams/schedule")
  return { success: true, error: undefined }
}

export async function deleteExamSchedule(scheduleId: string) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")
  await prisma.examSchedule.delete({ where: { id: scheduleId } })
  revalidatePath("/dashboard/exams/schedule")
  return { success: true }
}

export async function getExamSchedules(academicSessionId: string, branchId: string) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")

  return prisma.examSchedule.findMany({
    where: {
      exam: { academicSessionId, branchId },
    },
    include: {
      exam: {
        include: {
          examType: true,
          class: true,
          subject: true,
        },
      },
    },
    orderBy: { date: "asc" },
  })
}

export async function submitExamResult(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")

  const examId = formData.get("examId") as string
  const studentId = formData.get("studentId") as string
  const marksObtainedStr = formData.get("marksObtained") as string
  const remarks = formData.get("remarks") as string || undefined

  const marksObtained = marksObtainedStr ? Number(marksObtainedStr) : null

  const exam = await prisma.exam.findUnique({ where: { id: examId } })
  if (!exam) return { error: "Exam not found.", success: false }

  if (marksObtained !== null && marksObtained > exam.totalMarks) {
    return { error: "Marks obtained cannot exceed total marks.", success: false }
  }

  if (marksObtained !== null && marksObtained < 0) {
    return { error: "Marks cannot be negative.", success: false }
  }

  const percentage = marksObtained !== null ? (marksObtained / exam.totalMarks) * 100 : null
  const grade = percentage !== null ? calculateGrade(percentage) as any : undefined

  await prisma.examResult.upsert({
    where: { examId_studentId: { examId, studentId } },
    update: {
      marksObtained: marksObtained !== null ? String(marksObtained) : undefined,
      grade,
      remarks,
      gradedBy: profile.id,
      gradedAt: new Date(),
    },
    create: {
      examId,
      studentId,
      marksObtained: marksObtained !== null ? String(marksObtained) : undefined,
      grade,
      remarks,
      gradedBy: profile.id,
      gradedAt: new Date(),
    },
  })

  revalidatePath("/dashboard/exams/marks-entry")
  revalidatePath("/portal/student")
  revalidatePath("/portal/parent/results")
  return { success: true, error: undefined }
}

export async function submitBulkExamResults(
  examId: string,
  results: Array<{ studentId: string; marksObtained: number | null; remarks?: string }>
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")

  const exam = await prisma.exam.findUnique({ where: { id: examId } })
  if (!exam) return { error: "Exam not found.", success: false }

  for (const result of results) {
    if (result.marksObtained !== null && result.marksObtained > exam.totalMarks) {
      return { error: `Marks for student ${result.studentId} exceed total marks.`, success: false }
    }

    if (result.marksObtained !== null && result.marksObtained < 0) {
      return { error: `Marks for student ${result.studentId} cannot be negative.`, success: false }
    }
  }

  const studentIds = results.map((r) => r.studentId)
  const existingResults = await prisma.examResult.findMany({
    where: { examId, studentId: { in: studentIds } },
    select: { id: true, studentId: true },
  })
  const existingMap = new Map(existingResults.map((r) => [r.studentId, r.id]))

  const now = new Date()
  const toCreate: { examId: string; studentId: string; marksObtained: string | null; grade: Grade | null; remarks: string | null; gradedBy: string; gradedAt: Date }[] = []
  const toUpdate: { id: string; marksObtained: string | null; grade: Grade | null; remarks: string | null; gradedBy: string; gradedAt: Date }[] = []

  for (const result of results) {
    const percentage = result.marksObtained !== null ? (result.marksObtained / exam.totalMarks) * 100 : null
    const grade = percentage !== null ? calculateGrade(percentage) as Grade : null
    const marksStr = result.marksObtained !== null ? String(result.marksObtained) : null

    const existingId = existingMap.get(result.studentId)
    const data = {
      marksObtained: marksStr,
      grade,
      remarks: result.remarks || null,
      gradedBy: profile.id,
      gradedAt: now,
    }

    if (existingId) {
      toUpdate.push({ id: existingId, ...data })
    } else {
      toCreate.push({ examId, studentId: result.studentId, ...data })
    }
  }

  await prisma.$transaction(async (tx) => {
    if (toCreate.length > 0) {
      await tx.examResult.createMany({ data: toCreate })
    }
    if (toUpdate.length > 0) {
      await Promise.all(
        toUpdate.map((item) =>
          tx.examResult.update({
            where: { id: item.id },
            data: {
              marksObtained: item.marksObtained,
              grade: item.grade,
              remarks: item.remarks,
              gradedBy: item.gradedBy,
              gradedAt: item.gradedAt,
            },
          })
        )
      )
    }
  })

  revalidatePath("/dashboard/exams/marks-entry")
  revalidatePath("/portal/student")
  revalidatePath("/portal/parent/results")
  return { success: true, error: undefined }
}

export async function getExamResults(examId: string) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")

  return prisma.examResult.findMany({
    where: { examId },
    include: {
      student: {
        select: {
          id: true, firstName: true, lastName: true, admissionNo: true,
        },
      },
    },
    orderBy: { student: { firstName: "asc" } },
  })
}

export async function getStudentExamResults(studentId: string, academicSessionId: string) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "STUDENT", "PARENT")

  return prisma.examResult.findMany({
    where: {
      studentId,
      exam: { academicSessionId },
    },
    include: {
      exam: {
        include: {
          examType: true,
          subject: true,
        },
      },
    },
    orderBy: { exam: { examDate: "desc" } },
  })
}

export async function generateReportCard(
  _prevState: { error?: string; success?: boolean } | null,
  studentId: string,
  examId: string,
  academicSessionId: string
) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const [exam, result] = await Promise.all([
    prisma.exam.findUnique({ where: { id: examId } }),
    prisma.examResult.findUnique({
      where: { examId_studentId: { examId, studentId } },
    }),
  ])

  if (!exam) return { error: "Exam not found.", success: false }
  if (!result || result.marksObtained === null) {
    return { error: "No marks recorded for this student in this exam.", success: false }
  }

  const obtainedMarks = Number(result.marksObtained)
  const percentage = (obtainedMarks / exam.totalMarks) * 100
  const grade = calculateGrade(percentage) as any

  const classResults = await prisma.examResult.findMany({
    where: {
      examId,
      marksObtained: { not: null },
    },
  })

  const sortedResults = classResults
    .map((r) => ({ id: r.studentId, marks: Number(r.marksObtained!) }))
    .sort((a, b) => b.marks - a.marks)

  const rank = sortedResults.findIndex((r) => r.id === studentId) + 1

  await prisma.reportCard.upsert({
    where: { studentId_examId_academicSessionId: { studentId, examId, academicSessionId } },
    update: {
      totalMarks: exam.totalMarks,
      obtainedMarks: String(obtainedMarks),
      percentage,
      grade,
      rank,
    },
    create: {
      studentId,
      examId,
      academicSessionId,
      totalMarks: exam.totalMarks,
      obtainedMarks: String(obtainedMarks),
      percentage,
      grade,
      rank,
    },
  })

  revalidatePath("/dashboard/exams/report-cards")
  return { success: true, error: undefined }
}

export async function publishReportCard(reportCardId: string) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  await prisma.reportCard.update({
    where: { id: reportCardId },
    data: { isPublished: true, publishedAt: new Date() },
  })

  revalidatePath("/dashboard/exams/report-cards")
  return { success: true }
}

export async function unpublishReportCard(reportCardId: string) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  await prisma.reportCard.update({
    where: { id: reportCardId },
    data: { isPublished: false, publishedAt: null },
  })

  revalidatePath("/dashboard/exams/report-cards")
  return { success: true }
}

export async function getReportCards(filters: {
  studentId?: string
  examId?: string
  academicSessionId?: string
  classId?: string
  branchId?: string
}) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "STUDENT", "PARENT")

  return prisma.reportCard.findMany({
    where: {
      ...(filters.studentId && { studentId: filters.studentId }),
      ...(filters.examId && { examId: filters.examId }),
      ...(filters.academicSessionId && { academicSessionId: filters.academicSessionId }),
    },
    include: {
      student: {
        select: {
          id: true, firstName: true, lastName: true, admissionNo: true, branchId: true,
        },
      },
      exam: {
        include: {
          examType: true,
          subject: true,
          class: true,
        },
      },
    },
    orderBy: { rank: "asc" },
  })
}

export async function getStudentReportCards(studentId: string, academicSessionId: string) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "STUDENT", "PARENT")

  return prisma.reportCard.findMany({
    where: {
      studentId,
      academicSessionId,
      isPublished: true,
    },
    include: {
      exam: {
        include: {
          examType: true,
          subject: true,
        },
      },
    },
    orderBy: { exam: { examDate: "desc" } },
  })
}
