import { redirect } from "next/navigation"
import { getCurrentUser, getCurrentProfile } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from "next/link"
import { Users } from "lucide-react"

async function TeacherStudentsContent() {
  const user = await getCurrentUser()
  const profile = await getCurrentProfile()

  if (!user || !profile) redirect("/login")
  if (profile.role !== "TEACHER") redirect("/dashboard")

  const userId = user.id

  const teacher = await prisma.teacher.findFirst({ where: { profileId: userId } })
  if (!teacher)
    return <div className="text-muted-foreground py-8 text-center">Teacher record not found.</div>

  const activeSession = await prisma.academicSession.findFirst({
    where: { schoolId: teacher.schoolId, isCurrent: true },
    select: { id: true },
  })
  if (!activeSession) {
    return (
      <div className="text-muted-foreground py-8 text-center">
        No active academic session found.
      </div>
    )
  }

  // Get classIds from TeacherAssignment for the current session
  const assignments = await prisma.teacherAssignment.findMany({
    where: { teacherId: teacher.id, academicSessionId: activeSession.id },
    select: { classId: true, sectionId: true },
  })
  const classIds = [...new Set(assignments.map((a) => a.classId))]

  if (classIds.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">My Students</h2>
          <p className="text-muted-foreground">Students in your classes</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="text-muted-foreground mb-4 h-12 w-12" />
            <p className="text-lg font-medium">No students found</p>
            <p className="text-muted-foreground text-sm">
              You have no class assignments for the current session.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      classId: { in: classIds },
      academicSessionId: activeSession.id,
      status: "ACTIVE",
    },
    include: {
      student: true,
      class: true,
      section: true,
    },
    orderBy: [
      { class: { name: "asc" } },
      { section: { name: "asc" } },
      { student: { firstName: "asc" } },
    ],
  })

  // Deduplicate students (same student might appear for multiple subjects)
  const seen = new Set<string>()
  const uniqueEnrollments = enrollments.filter((e) => {
    const key = e.studentId
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          My Students ({uniqueEnrollments.length})
        </h2>
        <p className="text-muted-foreground">Students in your assigned classes</p>
      </div>
      {uniqueEnrollments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="text-muted-foreground mb-4 h-12 w-12" />
            <p className="text-lg font-medium">No students found</p>
            <p className="text-muted-foreground text-sm">No students enrolled in your classes.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Roll No</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uniqueEnrollments.map((e) => (
                    <TableRow key={e.studentId}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/portal/teacher/students/${e.studentId}`}
                          className="hover:underline"
                        >
                          {e.student.firstName} {e.student.lastName}
                        </Link>
                      </TableCell>
                      <TableCell>{e.class.name}</TableCell>
                      <TableCell>{e.section?.name || "-"}</TableCell>
                      <TableCell>{e.rollNumber || "-"}</TableCell>
                      <TableCell>{e.student.email || "-"}</TableCell>
                      <TableCell>{e.student.phone || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function TeacherStudentsPage() {
  return <TeacherStudentsContent />
}
