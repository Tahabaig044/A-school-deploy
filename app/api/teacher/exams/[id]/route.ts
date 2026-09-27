import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { isValidUuid } from "@/lib/validate-uuid"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profile } = await requireRole("TEACHER")
    const { id } = await params

    if (!isValidUuid(id)) {
      return NextResponse.json({ error: "Invalid exam ID format" }, { status: 400 })
    }

    const teacher = await prisma.teacher.findFirst({
      where: { profileId: profile.id },
      select: { id: true, schoolId: true },
    })
    if (!teacher) return NextResponse.json(null, { status: 404 })

    const exam = await prisma.exam.findFirst({
      where: { id, class: { schoolId: teacher.schoolId } },
      include: {
        class: { select: { name: true } },
        subject: { select: { name: true, code: true } },
        examType: { select: { name: true } },
        _count: { select: { results: true } },
      },
    })

    return NextResponse.json(exam)
  } catch {
    return NextResponse.json(null, { status: 500 })
  }
}
