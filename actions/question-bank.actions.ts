"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getSchoolId, getBranchId } from "@/lib/school-context"
import { logAuditEvent } from "@/lib/audit"
import { z } from "zod"

const questionSchema = z.object({
  subjectId: z.string().uuid("Invalid subject"),
  classId: z.string().uuid("Invalid class"),
  question: z.string().min(1, "Question is required"),
  questionType: z.enum(["MCQ", "TRUE_FALSE", "SHORT_ANSWER", "LONG_ANSWER"]),
  options: z.string().optional(),
  correctAnswer: z.string().optional(),
  marks: z.string().min(1, "Marks are required"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  explanation: z.string().optional(),
})

export async function createQuestion(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")

  const schoolId = getSchoolId(profile, formData, "Create Question")
  const branchId = getBranchId(profile, formData, "Create Question")

  const subjectId = formData.get("subjectId") as string
  const classId = formData.get("classId") as string
  const question = formData.get("question") as string
  const questionType = formData.get("questionType") as string
  const optionsRaw = formData.get("options") as string
  const correctAnswer = (formData.get("correctAnswer") as string) || null
  const marks = formData.get("marks") as string
  const difficulty = (formData.get("difficulty") as string) || "MEDIUM"
  const explanation = (formData.get("explanation") as string) || null

  let options = null
  if (optionsRaw) {
    try {
      options = JSON.parse(optionsRaw)
    } catch {
      return { error: "Invalid options JSON", success: false }
    }
  }

  const parsed = questionSchema.safeParse({
    subjectId, classId, question, questionType, options: optionsRaw,
    correctAnswer, marks, difficulty, explanation,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  try {
    await prisma.questionBank.create({
      data: {
        school: { connect: { id: schoolId } },
        branch: { connect: { id: branchId } },
        subject: { connect: { id: subjectId } },
        class: { connect: { id: classId } },
        question,
        questionType: questionType as any,
        options,
        correctAnswer,
        marks: parseInt(marks),
        difficulty,
        explanation,
        createdBy: { connect: { id: profile.id } },
      },
    })

    await logAuditEvent({
      userId: profile.id,
      schoolId,
      branchId,
      action: "CREATE",
      entityType: "QuestionBank",
      newValues: { question: question.substring(0, 100), questionType },
    })

    revalidatePath("/dashboard/exams/question-bank")
    return { success: true, error: undefined }
  } catch {
    return { error: "Failed to create question. Please try again.", success: false }
  }
}

export async function getQuestionBank(filters: {
  subjectId?: string
  classId?: string
  questionType?: string
  difficulty?: string
}) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")

  const where: any = {
    isActive: true,
    schoolId: profile.schoolId || undefined,
  }

  if (filters.subjectId) where.subjectId = filters.subjectId
  if (filters.classId) where.classId = filters.classId
  if (filters.questionType) where.questionType = filters.questionType
  if (filters.difficulty) where.difficulty = filters.difficulty

  return prisma.questionBank.findMany({
    where,
    include: {
      subject: { select: { name: true } },
      class: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function deleteQuestion(questionId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")

  const existing = await prisma.questionBank.findUnique({
    where: { id: questionId },
    select: { schoolId: true },
  })
  if (!existing) return { error: "Question not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && existing.schoolId !== profile.schoolId) {
    return { error: "Unauthorized", success: false }
  }

  await prisma.questionBank.update({
    where: { id: questionId },
    data: { isActive: false },
  })

  revalidatePath("/dashboard/exams/question-bank")
  return { success: true }
}
