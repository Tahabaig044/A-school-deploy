import { getStudentResults } from "@/actions/student-portal.actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GraduationCap, CheckCircle, XCircle, Award, BookOpen } from "lucide-react"

const GRADE_MAP: Record<string, string> = {
  A_PLUS: "A+",
  A: "A",
  B_PLUS: "B+",
  B: "B",
  C_PLUS: "C+",
  C: "C",
  D_PLUS: "D+",
  D: "D",
  F: "F",
}

export default async function StudentResultsPage() {
  const results = await getStudentResults()

  const totalExams = results.length
  const passed = results.filter((r) => {
    const percentage = (Number(r.marksObtained) / Number(r.exam.totalMarks)) * 100
    return percentage >= (Number(r.exam.passingMarks) / Number(r.exam.totalMarks)) * 100
  })
  const passedCount = passed.length
  const passRate = totalExams > 0 ? Math.round((passedCount / totalExams) * 100) : 0
  const averagePercentage =
    totalExams > 0
      ? Math.round(
          results.reduce(
            (sum, r) => sum + (Number(r.marksObtained) / Number(r.exam.totalMarks)) * 100,
            0,
          ) / totalExams,
        )
      : 0

  const grouped: Record<string, typeof results> = {}
  for (const result of results) {
    const typeName = result.exam.examType.name
    if (!grouped[typeName]) grouped[typeName] = []
    grouped[typeName].push(result)
  }

  const stats = [
    {
      label: "Total Exams",
      value: totalExams,
      icon: BookOpen,
      color: "text-blue-500",
    },
    {
      label: "Passed",
      value: passedCount,
      icon: CheckCircle,
      color: "text-emerald-500",
    },
    {
      label: "Pass Rate",
      value: `${passRate}%`,
      icon: Award,
      color: "text-amber-500",
    },
    {
      label: "Average",
      value: `${averagePercentage}%`,
      icon: GraduationCap,
      color: "text-primary",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <GraduationCap className="text-primary h-6 w-6" />
        <h1 className="text-2xl font-bold tracking-tight">Exam Results</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {results.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <p className="text-muted-foreground text-center">No exam results found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([examType, examResults]) => (
            <Card key={examType}>
              <CardHeader>
                <CardTitle className="text-lg">{examType}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {examResults.map((result) => {
                    const total = Number(result.exam.totalMarks)
                    const obtained = Number(result.marksObtained)
                    const passing = Number(result.exam.passingMarks)
                    const percentage = total > 0 ? Math.round((obtained / total) * 100) : 0
                    const isPassed = percentage >= (passing / total) * 100

                    return (
                      <div
                        key={result.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">{result.exam.name}</p>
                            <Badge variant={isPassed ? "success" : "destructive"}>
                              {isPassed ? "Passed" : "Failed"}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-sm">
                            {result.exam.subject.name}
                          </p>
                          {result.exam.examDate && (
                            <p className="text-muted-foreground text-xs">
                              {new Date(result.exam.examDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1 text-right">
                          <p className="text-lg font-bold">
                            {obtained}/{total}
                          </p>
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-muted-foreground text-sm">{percentage}%</span>
                            <Badge variant="secondary">
                              {result.grade ? GRADE_MAP[result.grade] || result.grade : "N/A"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
