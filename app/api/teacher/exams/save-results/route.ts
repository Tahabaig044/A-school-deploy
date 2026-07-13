import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { profile } = await requireRole("TEACHER")

    const teacher = await prisma.teacher.findFirst({
      where: { profileId: profile.id },
      select: { id: true, schoolId: true },
    })
    if (!teacher) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

    const { examId, results } = await request.json()

    const exam = await prisma.exam.findFirst({
      where: { id: examId, class: { schoolId: teacher.schoolId } },
      select: { id: true, isPublished: true },
    })
    if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 })

    for (const result of results) {
      if (result.marksObtained !== null && result.marksObtained !== undefined) {
        await prisma.examResult.upsert({
          where: { examId_studentId: { examId: exam.id, studentId: result.studentId } },
          update: { marksObtained: result.marksObtained, remarks: result.remarks || null },
          create: {
            examId: exam.id,
            studentId: result.studentId,
            marksObtained: result.marksObtained,
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
