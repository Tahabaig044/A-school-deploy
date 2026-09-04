import { getParentChildren, getChildHomework } from "@/actions/parent-portal.actions"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CalendarClock, CheckCircle, Clock, AlertCircle, BookOpen } from "lucide-react"

export default async function ParentHomeworkPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>
}) {
  const params = await searchParams
  const children = await getParentChildren()

  if (children.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Homework</h2>
          <p className="text-muted-foreground">View your children&apos;s homework assignments</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="text-muted-foreground mb-4 h-12 w-12" />
            <p className="text-muted-foreground">No children found in your account.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const studentId = params.student

  if (!studentId) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Homework</h2>
          <p className="text-muted-foreground">Select a child to view their homework</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {children.map((child) => (
            <Link key={child.id} href={`/portal/parent/homework?student=${child.id}`}>
              <Card className="hover:bg-accent cursor-pointer transition-colors">
                <CardHeader>
                  <CardTitle className="text-base">
                    {child.firstName} {child.lastName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {child.enrollments[0] ? (
                    <p className="text-muted-foreground text-sm">
                      {child.enrollments[0].class.name}
                      {child.enrollments[0].section
                        ? ` - ${child.enrollments[0].section.name}`
                        : ""}
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-sm">No active enrollment</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  const selectedChild = children.find((c) => c.id === studentId)
  if (!selectedChild) redirect("/portal/parent/homework")

  const homework = await getChildHomework(studentId)
  const now = new Date()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Homework</h2>
          <p className="text-muted-foreground">
            {selectedChild.firstName} {selectedChild.lastName}&apos;s assignments
          </p>
        </div>
        <Link href="/portal/parent/homework">
          <Button variant="outline">Change Child</Button>
        </Link>
      </div>

      {homework.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="text-muted-foreground mb-4 h-12 w-12" />
            <p className="text-muted-foreground">No homework assignments found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {homework.map((hw) => {
            const submission = hw.submissions[0]
            const isOverdue = new Date(hw.dueDate) < now && !submission
            const isGraded = submission?.status === "GRADED"
            const isSubmitted = submission?.status === "SUBMITTED" || isGraded

            return (
              <Card
                key={hw.id}
                className={
                  isOverdue
                    ? "border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"
                    : ""
                }
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{hw.title}</CardTitle>
                      <p className="text-muted-foreground text-sm">
                        {hw.subject?.name ?? "General"} &middot;{" "}
                        {hw.teacher?.firstName ?? "Unknown"} {hw.teacher?.lastName ?? ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {isOverdue && (
                        <Badge variant="destructive">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          Overdue
                        </Badge>
                      )}
                      {isGraded && (
                        <Badge variant="success">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Graded
                        </Badge>
                      )}
                      {isSubmitted && !isGraded && (
                        <Badge variant="info">
                          <Clock className="mr-1 h-3 w-3" />
                          Submitted
                        </Badge>
                      )}
                      {!isSubmitted && !isOverdue && (
                        <Badge variant="secondary">
                          <CalendarClock className="mr-1 h-3 w-3" />
                          Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <CalendarClock className="h-4 w-4" />
                      Due: {new Date(hw.dueDate).toLocaleDateString()}
                    </div>
                    {hw.totalMarks && (
                      <div className="flex items-center gap-1.5">Total Marks: {hw.totalMarks}</div>
                    )}
                    {isGraded && submission.marksObtained != null && (
                      <div className="text-foreground font-medium">
                        Marks: {submission.marksObtained}/{hw.totalMarks}
                      </div>
                    )}
                  </div>
                  {hw.description && (
                    <p className="text-muted-foreground mt-2 text-sm">{hw.description}</p>
                  )}
                  {submission?.feedback && (
                    <div className="bg-muted mt-3 rounded-md p-3 text-sm">
                      <span className="font-medium">Feedback: </span>
                      {submission.feedback}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
