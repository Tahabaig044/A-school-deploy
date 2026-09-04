"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, Users, FileText, Play } from "lucide-react"
import Link from "next/link"

interface Exam {
  id: string
  title: string
  description: string | null
  durationMinutes: number
  totalMarks: number
  passingMarks: number
  startTime: Date
  endTime: Date
  subject: { name: string }
  class: { name: string }
  _count: { questions: number; attempts: number }
}

export function OnlineExamList({ exams }: { exams: Exam[] }) {
  function getStatus(exam: Exam) {
    const now = new Date()
    if (now < new Date(exam.startTime)) return "UPCOMING"
    if (now > new Date(exam.endTime)) return "ENDED"
    return "ACTIVE"
  }

  function getStatusVariant(status: string) {
    switch (status) {
      case "ACTIVE":
        return "default" as const
      case "UPCOMING":
        return "secondary" as const
      case "ENDED":
        return "outline" as const
      default:
        return "secondary" as const
    }
  }

  if (exams.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center">
          No online exams found. Create your first exam to get started.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {exams.map((exam) => {
        const status = getStatus(exam)
        return (
          <Card key={exam.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{exam.title}</CardTitle>
                <Badge variant={getStatusVariant(status)}>{status}</Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                {exam.subject.name} • {exam.class.name}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {exam.description && (
                <p className="text-muted-foreground text-sm line-clamp-2">{exam.description}</p>
              )}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{exam.durationMinutes} min</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{exam._count.questions} questions</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{exam._count.attempts} attempts</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Marks: </span>
                  <span>{exam.totalMarks} (pass: {exam.passingMarks})</span>
                </div>
              </div>
              <div className="text-muted-foreground text-xs">
                {new Date(exam.startTime).toLocaleString()} - {new Date(exam.endTime).toLocaleString()}
              </div>
              <Button asChild size="sm" className="w-full">
                <Link href={`/dashboard/exams/online/${exam.id}`}>
                  {status === "ACTIVE" ? (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      View Exam
                    </>
                  ) : (
                    "View Details"
                  )}
                </Link>
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
