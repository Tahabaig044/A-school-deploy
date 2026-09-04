import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { AttendanceHistory } from "./attendance-history"

export default async function AttendanceHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const { profile } = await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "PRINCIPAL",
    "TEACHER",
  )
  const params = await searchParams

  const classes =
    profile.role === "SUPER_ADMIN"
      ? await prisma.class.findMany({ orderBy: { order: "asc" } })
      : await prisma.class.findMany({
          where: { schoolId: profile.schoolId!, branchId: profile.branchId! },
          orderBy: { order: "asc" },
        })

  const where: any = {}
  if (params.classId) where.classId = params.classId
  if (params.sectionId) where.sectionId = params.sectionId
  if (params.sessionId) where.academicSessionId = params.sessionId
  if (params.startDate) where.date = { gte: new Date(params.startDate) }
  if (params.endDate) where.date = { ...where.date, lte: new Date(params.endDate) }
  if (params.studentId) where.studentId = params.studentId
  if (profile.role !== "SUPER_ADMIN") {
    const studentIds = await prisma.student.findMany({
      where: { schoolId: profile.schoolId!, branchId: profile.branchId! },
      select: { id: true },
    })
    where.studentId = { in: studentIds.map((s) => s.id) }
  }

  const records = await prisma.studentAttendance.findMany({
    where,
    include: { student: { select: { firstName: true, lastName: true, admissionNo: true } } },
    orderBy: [{ date: "desc" }, { student: { firstName: "asc" } }],
    take: 100,
  })

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Attendance History</h2>
        <p className="text-muted-foreground">View attendance records</p>
      </div>
      <AttendanceHistory
        records={JSON.parse(JSON.stringify(records))}
        classes={JSON.parse(JSON.stringify(classes))}
      />
    </div>
  )
}
