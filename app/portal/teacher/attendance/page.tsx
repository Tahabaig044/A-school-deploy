import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { getTeacherClasses, getTeacherStudents } from "@/actions/teacher-portal.actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { AttendanceForm } from "./attendance-form"

export default async function TeacherAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; date?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile || profile.role !== "TEACHER") redirect("/dashboard")

  const params = await searchParams
  const classId = params.class
  const date = params.date || new Date().toISOString().split("T")[0]

  const assignments = await getTeacherClasses()

  if (!classId) {
    const uniqueClasses = assignments.reduce(
      (acc, assignment) => {
        if (!acc.find((a) => a.class.id === assignment.class.id)) {
          acc.push(assignment)
        }
        return acc
      },
      [] as typeof assignments
    )

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Mark Attendance</h2>
          <p className="text-muted-foreground">Select a class to mark attendance</p>
        </div>

        {uniqueClasses.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No classes assigned to you.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {uniqueClasses.map((assignment) => (
              <Link
                key={assignment.class.id}
                href={`/portal/teacher/attendance?class=${assignment.class.id}&date=${date}`}
              >
                <Card className="transition-colors hover:bg-accent cursor-pointer">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {assignment.class.name}
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      {assignment.section?.name ? `${assignment.section.name} - ` : ""}
                      {assignment.subject.name}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  const assignmentForClass = assignments.find((a) => a.class.id === classId)
  if (!assignmentForClass) redirect("/portal/teacher/attendance")

  const students = await getTeacherStudents(classId, assignmentForClass.section?.id)
  const className = assignmentForClass.class.name
  const sectionName = assignmentForClass.section?.name

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/portal/teacher/attendance">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Mark Attendance</h2>
          <p className="text-muted-foreground">
            {className}
            {sectionName ? ` - ${sectionName}` : ""} | {date}
          </p>
        </div>
      </div>

      <AttendanceForm
        students={JSON.parse(JSON.stringify(students))}
        classId={classId}
        sectionId={assignmentForClass.section?.id || ""}
        academicSessionId={assignmentForClass.academicSessionId}
        date={date}
      />
    </div>
  )
}
