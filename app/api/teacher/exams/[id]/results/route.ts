import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profile } = await requireRole("TEACHER")
    const { id } = await params

    const teacher = await prisma.teacher.findFirst({
      where: { profileId: profile.id },
      select: { id: true, schoolId: true },
    })
    if (!teacher) return NextResponse.json([])

    const exam = await prisma.exam.findFirst({
      where: { id, class: { schoolId: teacher.schoolId } },
      select: { totalMarks: true, passingMarks: true, classId: true },
    })
    if (!exam) return NextResponse.json([])

    const activeSession = await prisma.academicSession.findFirst({
      where: { schoolId: teacher.schoolId, isCurrent: true },
      select: { id: true },
    })
    if (!activeSession) return NextResponse.json([])

    const students = await prisma.student.findMany({
      where: {
        enrollments: {
          some: {
            classId: exam.classId,
            academicSessionId: activeSession.id,
            status: "ACTIVE",
          },
        },
      },
      select: { id: true, firstName: true, lastName: true, admissionNo: true },
      orderBy: { firstName: "asc" },
    })

    const existingResults = await prisma.examResult.findMany({
      where: { examId: id },
      select: { studentId: true, marksObtained: true, grade: true, remarks: true },
    })
    const resultMap = new Map(existingResults.map((r) => [r.studentId, r]))

    const results = students.map((s) => {
      const existing = resultMap.get(s.id)
      return {
        studentId: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        admissionNo: s.admissionNo,
        marksObtained: existing ? Number(existing.marksObtained) : null,
        grade: existing?.grade || null,
        remarks: existing?.remarks || null,
      }
    })

    return NextResponse.json(results)
  } catch {
    return NextResponse.json([])
  }
}
