import { getTeacherHomework } from "@/actions/teacher-portal.actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CalendarClock, BookOpen, Users, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"

export default async function TeacherHomeworkPage() {
  const homework = await getTeacherHomework()

  const now = new Date()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Homework</h2>
        <p className="text-muted-foreground">Manage and view homework assignments</p>
      </div>

      {homework.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarClock className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No homework assigned</p>
            <p className="text-sm text-muted-foreground">You haven&apos;t created any homework yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {homework.map((hw) => {
            const isOverdue = new Date(hw.dueDate) < now

            return (
              <Card key={hw.id} className={isOverdue ? "border-destructive/50" : ""}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{hw.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{hw.description}</p>
                  </div>
                  {isOverdue ? (
                    <Badge variant="destructive" className="shrink-0">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      Overdue
                    </Badge>
                  ) : (
                    <Badge variant="success" className="shrink-0">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Active
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4" />
                      <span>{hw.subject.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      <span>
                        {hw.class.name} - {hw.section?.name || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CalendarClock className="h-4 w-4" />
                      <span>
                        Due: {new Date(hw.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                    <span className="font-medium text-foreground">{hw.totalMarks} marks</span>
                    <span>{hw._count.submissions} submission{hw._count.submissions !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="mt-4">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/portal/teacher/homework/${hw.id}/submissions`}>
                        View Submissions
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
