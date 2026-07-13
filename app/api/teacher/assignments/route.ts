import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"

export async function GET() {
  try {
    const { profile } = await requireRole("TEACHER")

    const teacher = await prisma.teacher.findFirst({
      where: { profileId: profile.id },
      select: { id: true, schoolId: true, branchId: true },
    })
    if (!teacher) return NextResponse.json([])

    const activeSession = await prisma.academicSession.findFirst({
      where: { schoolId: teacher.schoolId, isCurrent: true },
      select: { id: true },
    })
    if (!activeSession) return NextResponse.json([])

    const assignments = await prisma.teacherAssignment.findMany({
      where: { teacherId: teacher.id, academicSessionId: activeSession.id },
      include: { class: true, section: true, subject: true },
    })

    return NextResponse.json(assignments)
  } catch {
    return NextResponse.json([])
  }
}
