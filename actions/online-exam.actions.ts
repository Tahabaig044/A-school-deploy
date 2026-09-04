"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { getSchoolId, getBranchId } from "@/lib/school-context"
import { logAuditEvent } from "@/lib/audit"
import { z } from "zod"

const createExamSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  subjectId: z.string().uuid("Invalid subject"),
  classId: z.string().uuid("Invalid class"),
  academicSessionId: z.string().uuid("Invalid session"),
  durationMinutes: z.string().min(1, "Duration is required"),
  totalMarks: z.string().min(1, "Total marks are required"),
  passingMarks: z.string().min(1, "Passing marks are required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  shuffleQuestions: z.string(),
  showResults: z.string(),
})

export async function createOnlineExam(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")

  const schoolId = getSchoolId(profile, formData, "Create Online Exam")
  const branchId = getBranchId(profile, formData, "Create Online Exam")

  const parsed = createExamSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    subjectId: formData.get("subjectId"),
    classId: formData.get("classId"),
    academicSessionId: formData.get("academicSessionId"),
    durationMinutes: formData.get("durationMinutes"),
    totalMarks: formData.get("totalMarks"),
    passingMarks: formData.get("passingMarks"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    shuffleQuestions: formData.get("shuffleQuestions"),
    showResults: formData.get("showResults"),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false }
  }

  try {
    const exam = await prisma.onlineExam.create({
      data: {
        school: { connect: { id: schoolId } },
        branch: { connect: { id: branchId } },
        title: parsed.data.title,
        description: parsed.data.description,
        subject: { connect: { id: parsed.data.subjectId } },
        class: { connect: { id: parsed.data.classId } },
        academicSession: { connect: { id: parsed.data.academicSessionId } },
        durationMinutes: parseInt(parsed.data.durationMinutes),
        totalMarks: parseInt(parsed.data.totalMarks),
        passingMarks: parseInt(parsed.data.passingMarks),
        startTime: new Date(parsed.data.startTime),
        endTime: new Date(parsed.data.endTime),
        shuffleQuestions: parsed.data.shuffleQuestions === "true",
        showResults: parsed.data.showResults === "true",
        createdBy: { connect: { id: profile.id } },
      },
    })

    await logAuditEvent({
      userId: profile.id,
      schoolId,
      branchId,
      action: "CREATE",
      entityType: "OnlineExam",
      entityId: exam.id,
      newValues: { title: parsed.data.title },
    })

    revalidatePath("/dashboard/exams/online")
    return { success: true, error: undefined }
  } catch {
    return { error: "Failed to create exam. Please try again.", success: false }
  }
}

export async function addExamQuestion(
  examId: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")

  const exam = await prisma.onlineExam.findUnique({ where: { id: examId } })
  if (!exam) return { error: "Exam not found.", success: false }
  if (profile.role !== "SUPER_ADMIN" && exam.schoolId !== profile.schoolId) {
    return { error: "Forbidden", success: false }
  }

  const question = formData.get("question") as string
  const questionType = formData.get("questionType") as string
  const optionsRaw = formData.get("options") as string
  const correctAnswer = (formData.get("correctAnswer") as string) || null
  const marks = formData.get("marks") as string

  let options = null
  if (optionsRaw) {
    try {
      options = JSON.parse(optionsRaw)
    } catch {
      return { error: "Invalid options JSON", success: false }
    }
  }

  const questionCount = await prisma.onlineExamQuestion.count({ where: { examId } })

  await prisma.onlineExamQuestion.create({
    data: {
      exam: { connect: { id: examId } },
      question,
      questionType: questionType as any,
      options,
      correctAnswer,
      marks: parseInt(marks || "1"),
      order: questionCount + 1,
    },
  })

  revalidatePath(`/dashboard/exams/online/${examId}`)
  return { success: true, error: undefined }
}

export async function getOnlineExams() {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "STUDENT")

  const where: any = {
    isActive: true,
    schoolId: profile.schoolId || undefined,
  }

  if (profile.role === "STUDENT") {
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: { studentId: profile.id, status: "ACTIVE" },
      select: { classId: true },
    })
    if (enrollment) {
      where.classId = enrollment.classId
    }
  }

  return prisma.onlineExam.findMany({
    where,
    include: {
      subject: { select: { name: true } },
      class: { select: { name: true } },
      _count: { select: { questions: true, attempts: true } },
    },
    orderBy: { startTime: "desc" },
  })
}

export async function startExam(examId: string) {
  const { profile } = await requireRole("STUDENT")

  const exam = await prisma.onlineExam.findUnique({
    where: { id: examId },
    include: { questions: { orderBy: { order: "asc" } } },
  })

  if (!exam) return { error: "Exam not found" }
  if (!exam.isActive) return { error: "Exam is not active" }

  const enrollment = await prisma.studentEnrollment.findFirst({
    where: { studentId: profile.id, status: "ACTIVE", classId: exam.classId },
    select: { id: true },
  })
  if (!enrollment) return { error: "You are not enrolled in this exam." }

  const now = new Date()
  if (now < exam.startTime) return { error: "Exam has not started yet" }
  if (now > exam.endTime) return { error: "Exam has ended" }

  const existingAttempt = await prisma.onlineExamAttempt.findUnique({
    where: { examId_studentId: { examId, studentId: profile.id } },
  })

  if (existingAttempt) {
    if (existingAttempt.status === "SUBMITTED") {
      return { error: "You have already submitted this exam" }
    }
    return { attemptId: existingAttempt.id, questions: exam.questions }
  }

  const attempt = await prisma.onlineExamAttempt.create({
    data: {
      exam: { connect: { id: examId } },
      student: { connect: { id: profile.id } },
    },
  })

  return { attemptId: attempt.id, questions: exam.questions }
}

export async function submitExam(
  attemptId: string,
  answers: Record<string, string>,
) {
  const { profile } = await requireRole("STUDENT")

  const attempt = await prisma.onlineExamAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: {
        include: { questions: true },
      },
    },
  })

  if (!attempt) return { error: "Attempt not found" }
  if (attempt.studentId !== profile.id) return { error: "Unauthorized" }
  if (attempt.status === "SUBMITTED") return { error: "Already submitted" }

  let totalObtained = 0
  for (const question of attempt.exam.questions) {
    const userAnswer = answers[question.id]
    if (userAnswer && question.correctAnswer) {
      if (userAnswer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim()) {
        totalObtained += question.marks
      }
    }
  }

  const isPassed = totalObtained >= attempt.exam.passingMarks

  await prisma.onlineExamAttempt.update({
    where: { id: attemptId },
    data: {
      submittedAt: new Date(),
      answers: answers as any,
      totalObtained,
      isPassed,
      status: "SUBMITTED",
      isGraded: attempt.exam.questions.every((q) => q.questionType !== "LONG_ANSWER"),
    },
  })

  revalidatePath("/portal/student/exams")
  return { totalObtained, isPassed, totalMarks: attempt.exam.totalMarks }
}

export async function getExamResults(examId: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")

  const exam = await prisma.onlineExam.findUnique({
    where: { id: examId },
    select: { schoolId: true },
  })
  if (!exam) return []
  if (profile.role !== "SUPER_ADMIN" && exam.schoolId !== profile.schoolId) return []

  return prisma.onlineExamAttempt.findMany({
    where: {
      examId,
      status: "SUBMITTED",
    },
    include: {
      student: {
        select: { firstName: true, lastName: true, admissionNo: true },
      },
    },
    orderBy: { totalObtained: "desc" },
  })
}
