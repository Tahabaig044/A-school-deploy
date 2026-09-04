import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const { profile } = await requireRole("TEACHER")

    const teacher = await prisma.teacher.findFirst({
      where: { profileId: profile.id },
      select: { id: true, schoolId: true, branchId: true },
    })
    if (!teacher) return NextResponse.json([])

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("id")

    if (studentId) {
      const student = await prisma.student.findFirst({
        where: { id: studentId, schoolId: teacher.schoolId },
        include: {
          enrollments: {
            include: { class: true, section: true, academicSession: true },
            orderBy: { academicSession: { startDate: "desc" } },
          },
          parents: { include: { parent: true } },
        },
      })
      if (!student) return NextResponse.json(null, { status: 404 })

      const currentEnrollment = student.enrollments.find(
        (e: { academicSession: { isCurrent: any } }) => e.academicSession.isCurrent,
      )

      const attendanceRecords = await prisma.studentAttendance.findMany({
        where: { studentId: student.id },
        select: { status: true, date: true },
        orderBy: { date: "desc" },
        take: 100,
      })

      const presentCount = attendanceRecords.filter(
        (a: { status: string }) => a.status === "PRESENT",
      ).length
      const totalCount = attendanceRecords.length
      const attendancePercent = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0

      return NextResponse.json({
        ...student,
        currentEnrollment,
        attendancePercent,
        attendanceCount: { present: presentCount, total: totalCount },
      })
    }

    const activeSession = await prisma.academicSession.findFirst({
      where: { schoolId: teacher.schoolId, isCurrent: true },
      select: { id: true },
    })
    if (!activeSession) return NextResponse.json([])

    const assignments = await prisma.teacherAssignment.findMany({
      where: { teacherId: teacher.id, academicSessionId: activeSession.id },
      select: { classId: true },
    })
    const classIds = [...new Set(assignments.map((a: { classId: any }) => a.classId))]

    if (classIds.length === 0) return NextResponse.json([])

    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const q = searchParams.get("q") || ""
    const skip = (page - 1) * limit

    const where: any = {
      enrollments: {
        some: {
          classId: { in: classIds },
          academicSessionId: activeSession.id,
          status: "ACTIVE",
        },
      },
    }
    if (q) {
      where.OR = [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { admissionNo: { contains: q, mode: "insensitive" } },
      ]
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        include: {
          enrollments: {
            where: { academicSessionId: activeSession.id, status: "ACTIVE" },
            include: { class: true, section: true },
          },
        },
        skip,
        take: limit,
        orderBy: { firstName: "asc" },
      }),
      prisma.student.count({ where }),
    ])

    return NextResponse.json({
      students: students.map(
        (s: { id: any; firstName: any; lastName: any; admissionNo: any; enrollments: any[] }) => ({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          admissionNo: s.admissionNo,
          enrollment: s.enrollments[0] || null,
        }),
      ),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch {
    return NextResponse.json([])
  }
}
