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

  const classes = profile.role === "SUPER_ADMIN"
    ? await prisma.class.findMany({ include: { sections: true }, orderBy: { order: "asc" } })
    : await prisma.class.findMany({
        where: { schoolId: profile.schoolId!, branchId: profile.branchId! },
        include: { sections: true },
        orderBy: { order: "asc" },
      })

  const sessions = profile.role === "SUPER_ADMIN"
    ? await prisma.academicSession.findMany({ where: { isCurrent: true } })
    : await prisma.academicSession.findMany({ where: { schoolId: profile.schoolId!, isCurrent: true } })

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

    students = await prisma.student.findMany({
      where,
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
    })

    if (params.sessionId) {
      existingAttendance = await prisma.studentAttendance.findMany({
        where: {
          date: new Date(params.date),
          academicSessionId: params.sessionId,
          classId: params.classId,
          ...(params.sectionId ? { sectionId: params.sectionId } : {}),
        },
      })
    }
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
