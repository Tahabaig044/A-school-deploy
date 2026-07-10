import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { setRequestContext, clearRequestContext } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users } from "lucide-react"

async function TeacherStudentsContent() {
  const headerStore = await headers()
  const userId = headerStore.get("X-User-Id")
  const userRole = headerStore.get("X-User-Role")
  const userEmail = headerStore.get("X-User-Email")

  if (!userId || !userRole || !userEmail) redirect("/login")
  if (userRole !== "TEACHER") redirect("/dashboard")

  setRequestContext({
    user: { id: userId, email: userEmail },
    profile: { id: userId, role: "TEACHER" as any, schoolId: null, branchId: null, firstName: null, lastName: null, email: userEmail, phone: null },
  })

  try {
    const teacher = await prisma.teacher.findFirst({ where: { profileId: userId } })
    if (!teacher) return <div className="text-center py-8 text-muted-foreground">Teacher record not found.</div>

    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        class: {
          sections: {
            some: {
              timetableSlots: { some: { teacherId: teacher.id } },
            },
          },
        },
        status: "ACTIVE",
      },
      include: {
        student: true,
        class: true,
        section: true,
      },
      orderBy: { student: { firstName: "asc" } },
    })

    const uniqueStudents = enrollments.reduce((acc, e) => {
      if (!acc.find((s) => s.studentId === e.studentId)) {
        acc.push(e)
      }
      return acc
    }, [] as typeof enrollments)

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">My Students</h2>
          <p className="text-muted-foreground">Students in your classes</p>
        </div>
        {uniqueStudents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No students found</p>
              <p className="text-sm text-muted-foreground">No students enrolled in your classes.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uniqueStudents.map((e) => (
                    <TableRow key={e.studentId}>
                      <TableCell className="font-medium">{e.student.firstName} {e.student.lastName}</TableCell>
                      <TableCell>{e.class.name}</TableCell>
                      <TableCell>{e.section?.name || "-"}</TableCell>
                      <TableCell>{e.student.email || "-"}</TableCell>
                      <TableCell>{e.student.phone || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    )
  } finally {
    clearRequestContext()
  }
}

export default function TeacherStudentsPage() {
  return <TeacherStudentsContent />
}
