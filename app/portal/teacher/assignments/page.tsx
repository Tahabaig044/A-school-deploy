import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { setRequestContext, clearRequestContext } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarClock } from "lucide-react"

async function TeacherAssignmentsContent() {
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

    const homework = await prisma.homework.findMany({
      where: { teacherId: teacher.id },
      include: {
        class: true,
        section: true,
        subject: true,
        _count: { select: { submissions: true } },
      },
      orderBy: { dueDate: "desc" },
    })

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Assignments</h2>
          <p className="text-muted-foreground">Homework and assignments you&apos;ve created</p>
        </div>
        {homework.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CalendarClock className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No assignments created</p>
              <p className="text-sm text-muted-foreground">You haven&apos;t created any assignments yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {homework.map((hw) => (
              <Card key={hw.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{hw.title}</CardTitle>
                    <Badge variant={hw.isActive ? "default" : "secondary"}>
                      {hw.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <CardDescription>
                    {hw.class.name}{hw.section ? ` - ${hw.section.name}` : ""} | {hw.subject.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Due: {new Date(hw.dueDate).toLocaleDateString()}
                  </p>
                  {hw.totalMarks && (
                    <p className="text-sm text-muted-foreground">Total Marks: {hw.totalMarks}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Submissions: {hw._count.submissions}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  } finally {
    clearRequestContext()
  }
}

export default function TeacherAssignmentsPage() {
  return <TeacherAssignmentsContent />
}
