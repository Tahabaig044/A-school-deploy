import { prisma } from "@/lib/prisma"

/**
 * Mobile attendance service. Returns attendance data for the student's own
 * records only. The student is resolved from the authenticated Supabase user
 * — never accepted from the client.
 */

export interface AttendanceRecord {
  id: string
  date: string
  status: string
  remarks: string | null
  className: string
  sectionName: string | null
}

export interface AttendanceSummary {
  totalDays: number
  present: number
  absent: number
  late: number
  leave: number
  percentage: number
}

export interface MonthlyAttendanceResponse {
  records: AttendanceRecord[]
  summary: AttendanceSummary
  month: number
  year: number
}

/**
 * Fetches the student's attendance records for a given month and computes
 * summary statistics. The student is identified by their Supabase user ID
 * (resolved from the JWT) and scoped to the profile's school.
 */
export async function getStudentAttendanceForMobile(
  userId: string,
  month: number,
  year: number,
): Promise<MonthlyAttendanceResponse> {
  const profile = await prisma.profile.findUnique({ where: { id: userId } })
  if (!profile || profile.role !== "STUDENT" || !profile.schoolId) {
    return emptyResponse(month, year)
  }

  // Resolve student by email scoped to the profile's school to avoid
  // cross-school email collisions. This matches the existing pattern
  // used in services/id-card.ts.
  const student = await prisma.student.findFirst({
    where: { email: profile.email, schoolId: profile.schoolId },
    include: {
      enrollments: {
        where: { status: "ACTIVE" },
        include: { class: true, section: true },
        take: 1,
      },
    },
  })

  if (!student) {
    return emptyResponse(month, year)
  }

  // Resolve the active academic session for this student's school
  const activeSession = await prisma.academicSession.findFirst({
    where: { schoolId: profile.schoolId, isCurrent: true },
    select: { id: true },
  })

  const startDate = new Date(year, month, 1)
  const endDate = new Date(year, month + 1, 0)

  const records = await prisma.studentAttendance.findMany({
    where: {
      studentId: student.id,
      date: { gte: startDate, lte: endDate },
      ...(activeSession ? { academicSessionId: activeSession.id } : {}),
    },
    include: { class: true, section: true },
    orderBy: { date: "desc" },
  })

  const attendanceRecords: AttendanceRecord[] = records.map((r) => ({
    id: r.id,
    date: r.date.toISOString().split("T")[0],
    status: r.status,
    remarks: r.remarks,
    className: r.class.name,
    sectionName: r.section?.name ?? null,
  }))

  const summary = computeSummary(attendanceRecords)

  return { records: attendanceRecords, summary, month, year }
}

/**
 * Fetches the student's attendance record for today (if any).
 * Same authorization as the monthly endpoint.
 */
export async function getStudentTodayAttendance(userId: string): Promise<AttendanceRecord | null> {
  const profile = await prisma.profile.findUnique({ where: { id: userId } })
  if (!profile || profile.role !== "STUDENT" || !profile.schoolId) return null

  const student = await prisma.student.findFirst({
    where: { email: profile.email, schoolId: profile.schoolId },
  })
  if (!student) return null

  const activeSession = await prisma.academicSession.findFirst({
    where: { schoolId: profile.schoolId, isCurrent: true },
    select: { id: true },
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const record = await prisma.studentAttendance.findFirst({
    where: {
      studentId: student.id,
      date: { gte: today, lt: tomorrow },
      ...(activeSession ? { academicSessionId: activeSession.id } : {}),
    },
    include: { class: true, section: true },
  })

  if (!record) return null

  return {
    id: record.id,
    date: record.date.toISOString().split("T")[0],
    status: record.status,
    remarks: record.remarks,
    className: record.class.name,
    sectionName: record.section?.name ?? null,
  }
}

function computeSummary(records: AttendanceRecord[]): AttendanceSummary {
  const totalDays = records.length
  const present = records.filter((r) => r.status === "PRESENT").length
  const absent = records.filter((r) => r.status === "ABSENT").length
  const late = records.filter((r) => r.status === "LATE").length
  const leave = records.filter((r) => r.status === "LEAVE").length
  const percentage = totalDays > 0 ? Math.round((present / totalDays) * 100) : 0

  return { totalDays, present, absent, late, leave, percentage }
}

function emptyResponse(month: number, year: number): MonthlyAttendanceResponse {
  return {
    records: [],
    summary: { totalDays: 0, present: 0, absent: 0, late: 0, leave: 0, percentage: 0 },
    month,
    year,
  }
}
