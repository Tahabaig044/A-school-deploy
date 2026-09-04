import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, BookOpen, CalendarDays, FileText, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

const ITEMS_PER_PAGE = 10

export default async function TeacherHomeworkPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { profile } = await requireRole("TEACHER")
  const { page: pageStr } = await searchParams
  const currentPage = Math.max(1, parseInt(pageStr || "1"))

  const teacher = await prisma.teacher.findFirst({
    where: { profileId: profile.id },
    select: { id: true, schoolId: true, branchId: true },
  })
  if (!teacher) return <p>Teacher record not found.</p>

  const activeSession = await prisma.academicSession.findFirst({
    where: { schoolId: teacher.schoolId, isCurrent: true },
    select: { id: true },
  })

  const where = { teacherId: teacher.id }
  const [homework, total] = await Promise.all([
    prisma.homework.findMany({
      where,
      include: {
        class: { select: { name: true } },
        section: { select: { name: true } },
        subject: { select: { name: true, code: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: { dueDate: "desc" },
      skip: (currentPage - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
    }),
    prisma.homework.count({ where }),
  ])

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Homework</h2>
          <p className="text-muted-foreground">Create and manage homework assignments</p>
        </div>
        <Button asChild>
          <Link href="/portal/teacher/homework/new">
            <Plus className="mr-2 h-4 w-4" />
            New Homework
          </Link>
        </Button>
      </div>

      {homework.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="text-muted-foreground mb-4 h-12 w-12" />
            <p className="text-lg font-medium">No homework created yet</p>
            <p className="text-muted-foreground mb-4 text-sm">
              Create your first homework assignment
            </p>
            <Button asChild>
              <Link href="/portal/teacher/homework/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Homework
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4">
            {homework.map((hw) => {
              const isOverdue = new Date(hw.dueDate) < new Date()
              return (
                <Card key={hw.id} className={isOverdue ? "border-orange-200" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{hw.title}</h3>
                          <Badge
                            variant={isOverdue ? "destructive" : "default"}
                            className="text-xs"
                          >
                            {isOverdue ? "Overdue" : "Active"}
                          </Badge>
                        </div>
                        <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-sm">
                          <span>
                            {hw.subject?.name ?? "General"}{" "}
                            {hw.subject?.code ? `(${hw.subject.code})` : ""}
                          </span>
                          <span>
                            {hw.class.name}
                            {hw.section ? ` - ${hw.section.name}` : ""}
                          </span>
                          {hw.totalMarks && <span>Total: {hw.totalMarks}</span>}
                        </div>
                        <div className="text-muted-foreground flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            Due: {new Date(hw.dueDate).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {hw._count.submissions} submission
                            {hw._count.submissions !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/portal/teacher/homework/${hw.id}/submissions`}>
                            View Submissions
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/portal/teacher/homework/${hw.id}/edit`}>Edit</Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              {currentPage > 1 ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/portal/teacher/homework?page=${currentPage - 1}`}>
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
                  <Link href={`/portal/teacher/homework?page=${currentPage + 1}`}>
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
