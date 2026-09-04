import { redirect } from "next/navigation"
import { getCurrentUser, getCurrentProfile } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ClipboardList, PenLine, ChevronLeft, ChevronRight } from "lucide-react"

const ITEMS_PER_PAGE = 12

async function TeacherExamsContent({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await getCurrentUser()
  const profile = await getCurrentProfile()

  if (!user || !profile) redirect("/login")
  if (profile.role !== "TEACHER") redirect("/dashboard")

  const userId = user.id

  const { page: pageStr } = await searchParams
  const currentPage = Math.max(1, parseInt(pageStr || "1"))

  const teacher = await prisma.teacher.findFirst({ where: { profileId: userId } })
  if (!teacher)
    return <div className="text-muted-foreground py-8 text-center">Teacher record not found.</div>

  const where = {
    class: {
      sections: {
        some: {
          timetableSlots: { some: { teacherId: teacher.id } },
        },
      },
    },
  }

  const [exams, total] = await Promise.all([
    prisma.exam.findMany({
      where,
      include: {
        class: true,
        subject: true,
        examType: true,
        _count: { select: { results: true } },
      },
      orderBy: { examDate: "desc" },
      skip: (currentPage - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
    }),
    prisma.exam.count({ where }),
  ])

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Exams</h2>
        <p className="text-muted-foreground">Exams for your classes</p>
      </div>
      {exams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="text-muted-foreground mb-4 h-12 w-12" />
            <p className="text-lg font-medium">No exams found</p>
            <p className="text-muted-foreground text-sm">No exams scheduled for your classes.</p>
          </CardContent>
        </Card>
      ) : (
        <>
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
                    <p className="text-muted-foreground text-sm">
                      Date: {new Date(exam.examDate).toLocaleDateString()}
                    </p>
                  )}
                  <p className="text-muted-foreground text-sm">
                    Total: {exam.totalMarks} | Passing: {exam.passingMarks}
                  </p>
                  <p className="text-muted-foreground text-sm">Results: {exam._count.results}</p>
                  <Button variant="outline" size="sm" asChild className="mt-2 w-full">
                    <Link href={`/portal/teacher/exams/${exam.id}/marks`}>
                      <PenLine className="mr-1 h-3 w-3" />
                      Enter Marks
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              {currentPage > 1 ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/portal/teacher/exams?page=${currentPage - 1}`}>
                    <ChevronLeft className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              <span className="text-muted-foreground text-sm">
                Page {currentPage} of {totalPages}
              </span>
              {currentPage < totalPages ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/portal/teacher/exams?page=${currentPage + 1}`}>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default async function TeacherExamsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  return <TeacherExamsContent searchParams={searchParams} />
}
