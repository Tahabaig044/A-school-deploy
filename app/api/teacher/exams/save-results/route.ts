import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { isValidUuid } from "@/lib/validate-uuid"

function validateCsrfOrigin(request: Request): boolean {
  const origin = request.headers.get("origin")
  const host = request.headers.get("host")
  if (!origin && !host) return true
  const allowed = process.env.NEXT_PUBLIC_APP_URL
  if (!allowed) return true
  if (origin) {
    return origin === allowed || origin.endsWith(`.${new URL(allowed).hostname}`)
  }
  if (host) {
    return host === new URL(allowed).host
  }
  return true
}

export async function POST(request: Request) {
  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 })
  }

  try {
    const { profile } = await requireRole("TEACHER")

    const teacher = await prisma.teacher.findFirst({
      where: { profileId: profile.id },
      select: { id: true, schoolId: true },
    })
    if (!teacher) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

    const { examId, results } = await request.json()

    if (!examId || !isValidUuid(examId)) {
      return NextResponse.json({ error: "Invalid exam ID" }, { status: 400 })
    }
    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json({ error: "Results must be a non-empty array" }, { status: 400 })
    }
    if (results.length > 500) {
      return NextResponse.json({ error: "Too many results (max 500)" }, { status: 400 })
    }

    const exam = await prisma.exam.findFirst({
      where: { id: examId, class: { schoolId: teacher.schoolId } },
      select: { id: true, isPublished: true, totalMarks: true },
    })
    if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 })

    for (const result of results) {
      if (!result.studentId || !isValidUuid(result.studentId)) {
        return NextResponse.json({ error: "Invalid student ID in results" }, { status: 400 })
      }
      if (result.marksObtained !== null && result.marksObtained !== undefined) {
        const marks = Number(result.marksObtained)
        if (isNaN(marks) || marks < 0 || marks > Number(exam.totalMarks)) {
          return NextResponse.json(
            { error: `Marks must be between 0 and ${exam.totalMarks}` },
            { status: 400 },
          )
        }
        await prisma.examResult.upsert({
          where: { examId_studentId: { examId: exam.id, studentId: result.studentId } },
          update: { marksObtained: marks, remarks: result.remarks || null },
          create: {
            examId: exam.id,
            studentId: result.studentId,
            marksObtained: marks,
            remarks: result.remarks || null,
          },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }
}
