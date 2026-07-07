import { getStudentHomework } from "@/actions/student-portal.actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarClock, CheckCircle, Clock, AlertCircle, BookOpen } from "lucide-react"

export default async function StudentHomeworkPage() {
  const homework = await getStudentHomework()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Homework</h2>
        <p className="text-muted-foreground">View your assignments and submissions</p>
      </div>

      {homework.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No homework assigned</p>
            <p className="text-sm text-muted-foreground">Check back later for new assignments</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {homework.map((hw) => {
            const submission = hw.submissions[0]
            const isOverdue = new Date(hw.dueDate) < new Date() && !submission
            const isGraded = submission?.status === "GRADED"
            const isSubmitted = submission?.status === "SUBMITTED" || isGraded

            return (
              <Card
                key={hw.id}
                className={isOverdue ? "border-red-300 bg-red-50/50" : ""}
              >
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{hw.title}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>{hw.subject.name}</span>
                      <span className="text-muted-foreground/50">•</span>
                      <span>
                        {hw.teacher.firstName} {hw.teacher.lastName}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isGraded && submission.marksObtained != null && (
                      <Badge variant="success">
                        {submission.marksObtained}/{hw.totalMarks}
                      </Badge>
                    )}
                    {isGraded ? (
                      <Badge variant="success">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Graded
                      </Badge>
                    ) : isSubmitted ? (
                      <Badge variant="info">
                        <Clock className="mr-1 h-3 w-3" />
                        Submitted
                      </Badge>
                    ) : isOverdue ? (
                      <Badge variant="destructive">
                        <AlertCircle className="mr-1 h-3 w-3" />
                        Overdue
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <CalendarClock className="mr-1 h-3 w-3" />
                        Pending
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {hw.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {hw.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <CalendarClock className="h-3.5 w-3.5" />
                      <span>
                        Due:{" "}
                        {new Date(hw.dueDate).toLocaleDateString("en-US", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <span className="text-muted-foreground">
                      Total Marks: {hw.totalMarks}
                    </span>
                  </div>
                  {isGraded && submission.feedback && (
                    <div className="mt-3 rounded-md bg-emerald-50 p-3 text-sm">
                      <span className="font-medium text-emerald-700">Feedback: </span>
                      <span className="text-emerald-600">{submission.feedback}</span>
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
