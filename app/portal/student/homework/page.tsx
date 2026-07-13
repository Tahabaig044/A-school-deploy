import { getStudentHomework } from "@/actions/student-portal.actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CalendarClock, CheckCircle, Clock, AlertCircle, BookOpen, ArrowRight, RotateCcw } from "lucide-react"
import Link from "next/link"

const statusStyles: Record<string, string> = {
  NOT_SUBMITTED: "bg-gray-100 text-gray-800",
  SUBMITTED: "bg-blue-100 text-blue-800",
  LATE: "bg-orange-100 text-orange-800",
  GRADED: "bg-green-100 text-green-800",
}

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
          {homework.map((hw: any) => {
            const sub = hw.latestSubmission
            const status = hw.submissionStatus

            return (
              <Link key={hw.id} href={`/portal/student/homework/${hw.id}`}>
                <Card
                  className={`transition-colors hover:bg-accent cursor-pointer ${status === "NOT_SUBMITTED" && hw.isOverdue ? "border-red-300 bg-red-50/50" : ""}`}
                >
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{hw.title}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>{hw.subject?.name ?? "General"}</span>
                        <span className="text-muted-foreground/50">•</span>
                        <span>
                          {hw.teacher?.firstName ?? "Unknown"} {hw.teacher?.lastName ?? ""}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {sub?.marksObtained != null && (
                        <Badge variant="success" className="text-sm">
                          {sub.marksObtained}/{hw.totalMarks || "—"}
                        </Badge>
                      )}
                      <Badge className={statusStyles[status] || "bg-gray-100"}>
                        {status === "GRADED" ? <CheckCircle className="mr-1 h-3 w-3" /> :
                          status === "SUBMITTED" ? <Clock className="mr-1 h-3 w-3" /> :
                          status === "LATE" ? <AlertCircle className="mr-1 h-3 w-3" /> :
                          status === "RETURNED" ? <RotateCcw className="mr-1 h-3 w-3" /> : null}
                        {status === "GRADED" ? "Graded" :
                          status === "SUBMITTED" ? "Submitted" :
                          status === "LATE" ? "Late" :
                          status === "RETURNED" ? "Returned" :
                          hw.isOverdue ? "Overdue" : "Pending"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
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
                      <span className="flex items-center gap-1 text-primary">
                        View Details <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                    {sub?.feedback && (
                      <div className="mt-2 rounded-md bg-emerald-50 p-2 text-sm">
                        <span className="font-medium text-emerald-700">Feedback: </span>
                        <span className="text-emerald-600">{sub.feedback}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
