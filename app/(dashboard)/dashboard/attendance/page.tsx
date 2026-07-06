import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { AttendanceMarker } from "./attendance-marker"

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL", "TEACHER")
  const params = await searchParams

  const classWhere = profile.role === "SUPER_ADMIN"
    ? {}
    : { schoolId: profile.schoolId!, branchId: profile.branchId! }

  const sessionWhere = profile.role === "SUPER_ADMIN"
    ? { isCurrent: true as const }
    : { schoolId: profile.schoolId!, isCurrent: true as const }

  const [classes, sessions] = await Promise.all([
    prisma.class.findMany({
      where: classWhere,
      include: { sections: true },
      orderBy: { order: "asc" },
    }),
    prisma.academicSession.findMany({ where: sessionWhere }),
  ])

  let students: any[] = []
  let existingAttendance: any[] = []

  if (params.classId && params.date) {
    const where: any = {
      enrollments: {
        some: {
          classId: params.classId,
          ...(params.sectionId ? { sectionId: params.sectionId } : {}),
          ...(params.sessionId ? { academicSessionId: params.sessionId } : {}),
          status: "ACTIVE",
        },
      },
    }

    if (profile.role !== "SUPER_ADMIN") {
      where.schoolId = profile.schoolId!
      if (profile.branchId) where.branchId = profile.branchId!
    }

    const studentWhere = where
    const attendanceWhere = params.sessionId ? {
      date: new Date(params.date),
      academicSessionId: params.sessionId,
      classId: params.classId,
      ...(params.sectionId ? { sectionId: params.sectionId } : {}),
    } : null

    const [studentsResult, attendanceResult] = await Promise.all([
      prisma.student.findMany({
        where: studentWhere,
        include: {
          enrollments: {
            where: {
              classId: params.classId,
              ...(params.sectionId ? { sectionId: params.sectionId } : {}),
              status: "ACTIVE",
            },
            take: 1,
            include: { class: true, section: true },
          },
        },
        orderBy: { firstName: "asc" },
      }),
      attendanceWhere
        ? prisma.studentAttendance.findMany({ where: attendanceWhere })
        : Promise.resolve([]),
    ])

    students = studentsResult
    existingAttendance = attendanceResult
  }

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Mark Attendance</h2>
        <p className="text-muted-foreground">Record daily student attendance</p>
      </div>
      <AttendanceMarker
        classes={JSON.parse(JSON.stringify(classes))}
        sessions={JSON.parse(JSON.stringify(sessions))}
        students={JSON.parse(JSON.stringify(students))}
        existingAttendance={JSON.parse(JSON.stringify(existingAttendance))}
        currentClassId={params.classId || ""}
        currentSectionId={params.sectionId || ""}
        currentSessionId={params.sessionId || ""}
        currentDate={params.date || ""}
      />
    </div>
  )
}
