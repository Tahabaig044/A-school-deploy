import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { setRequestContext, clearRequestContext } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ClipboardList } from "lucide-react"

async function TeacherExamsContent() {
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

    const exams = await prisma.exam.findMany({
      where: {
        class: {
          sections: {
            some: {
              timetableSlots: { some: { teacherId: teacher.id } },
            },
          },
        },
      },
      include: {
        class: true,
        subject: true,
        examType: true,
        _count: { select: { results: true } },
      },
      orderBy: { examDate: "desc" },
    })

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Exams</h2>
          <p className="text-muted-foreground">Exams for your classes</p>
        </div>
        {exams.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No exams found</p>
              <p className="text-sm text-muted-foreground">No exams scheduled for your classes.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {exams.map((exam) => (
              <Card key={exam.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{exam.name}</CardTitle>
                    <Badge variant={exam.isPublished ? "default" : "secondary"}>
                      {exam.isPublished ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <CardDescription>
                    {exam.class.name} | {exam.subject.name} | {exam.examType.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {exam.examDate && (
                    <p className="text-sm text-muted-foreground">
                      Date: {new Date(exam.examDate).toLocaleDateString()}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Total: {exam.totalMarks} | Passing: {exam.passingMarks}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Results: {exam._count.results}
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

export default function TeacherExamsPage() {
  return <TeacherExamsContent />
}
