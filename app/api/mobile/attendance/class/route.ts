import { getMobileUserFromRequest, jsonError } from "@/lib/supabase/mobile-auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const mobileUser = await getMobileUserFromRequest(req)
  if (!mobileUser) return jsonError("Unauthorized", 401)

  const profile = await prisma.profile.findUnique({ where: { id: mobileUser.id } })
  if (!profile || profile.role !== "TEACHER") return jsonError("Forbidden", 403)
  if (!profile.schoolId) return jsonError("School not found", 404)

  const teacher = await prisma.teacher.findFirst({
    where: { schoolId: profile.schoolId, profileId: profile.id },
  })
  if (!teacher) return jsonError("Teacher not found", 404)

  let body: {
    classId?: string
    sectionId?: string
    date?: string
    attendance?: Array<{ studentId: string; status: string; remarks?: string }>
  }
  try {
    body = await req.json()
  } catch {
    return jsonError("Invalid request body", 400)
  }

  if (!body.classId) return jsonError("classId is required", 400)
  if (!body.attendance || !Array.isArray(body.attendance) || body.attendance.length === 0) {
    return jsonError("attendance array is required", 400)
  }

  const currentSession = await prisma.academicSession.findFirst({
    where: { schoolId: profile.schoolId, isCurrent: true },
  })
  if (!currentSession) return jsonError("No active academic session", 404)

  const attendanceDate = body.date ? new Date(body.date) : new Date()

  // Validate that the class belongs to this teacher's school
  const classRecord = await prisma.class.findFirst({
    where: { id: body.classId, schoolId: profile.schoolId },
  })
  if (!classRecord) return jsonError("Class not found in your school", 404)

  // Validate all studentIds belong to enrollments in this class (and school)
  const studentIds = body.attendance.map((e: { studentId: string }) => e.studentId)
  const validEnrollments = await prisma.studentEnrollment.findMany({
    where: {
      studentId: { in: studentIds },
      classId: body.classId,
      academicSession: { schoolId: profile.schoolId },
      status: "ACTIVE",
    },
    select: { studentId: true },
  })
  const validStudentIds = new Set(validEnrollments.map((e) => e.studentId))
  const invalidIds = studentIds.filter((id) => !validStudentIds.has(id))
  if (invalidIds.length > 0) {
    return jsonError(`Students not enrolled in this class: ${invalidIds.join(", ")}`, 400)
  }

  const results = await prisma.$transaction(
    body.attendance.map((entry) =>
      prisma.studentAttendance.upsert({
        where: {
          studentId_date_academicSessionId: {
            studentId: entry.studentId,
            date: attendanceDate,
            academicSessionId: currentSession.id,
          },
        },
        create: {
          studentId: entry.studentId,
          classId: body.classId!,
          sectionId: body.sectionId,
          academicSessionId: currentSession.id,
          date: attendanceDate,
          status: entry.status as "PRESENT" | "ABSENT" | "LATE" | "LEAVE",
          markedById: profile.id,
          remarks: entry.remarks,
        },
        update: {
          status: entry.status as "PRESENT" | "ABSENT" | "LATE" | "LEAVE",
          remarks: entry.remarks,
          markedById: profile.id,
        },
      }),
    ),
  )

  return Response.json({ attendance: results, count: results.length })
}
