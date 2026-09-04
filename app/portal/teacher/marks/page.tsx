import { getTeacherExamResults } from "@/actions/teacher-portal.actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Award, CheckCircle, XCircle, GraduationCap } from "lucide-react"

const GRADE_DISPLAY: Record<string, string> = {
  A_PLUS: "A+",
  A: "A",
  B_PLUS: "B+",
  B: "B",
  C_PLUS: "C+",
  C: "C",
  D: "D",
  F: "F",
}

export default async function TeacherMarksPage() {
  const results = await getTeacherExamResults()

  const totalResults = results.length
  const passedCount = results.filter((r) => {
    if (!r.marksObtained || !r.exam.passingMarks) return false
    return Number(r.marksObtained) >= r.exam.passingMarks
  }).length
  const passRate = totalResults > 0 ? Math.round((passedCount / totalResults) * 100) : 0

  const groupedByExam = results.reduce(
    (acc, result) => {
      const examId = result.exam.id
      if (!acc[examId]) {
        acc[examId] = {
          exam: result.exam,
          results: [],
        }
      }
      acc[examId].results.push(result)
      return acc
    },
    {} as Record<string, { exam: (typeof results)[number]["exam"]; results: typeof results }>,
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Exam Results</h2>
        <p className="text-muted-foreground">View student marks and grades</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Results</CardTitle>
            <GraduationCap className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalResults}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Passed</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{passedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
            <Award className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{passRate}%</div>
          </CardContent>
        </Card>
      </div>

      {totalResults === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Award className="text-muted-foreground mb-4 h-12 w-12" />
            <p className="text-muted-foreground">No exam results found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.values(groupedByExam).map(({ exam, results: examResults }) => (
            <Card key={exam.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{exam.name}</CardTitle>
                  <Badge variant="secondary">{exam.examType.name}</Badge>
                </div>
                <div className="text-muted-foreground flex gap-4 text-sm">
                  <span>Subject: {exam.subject.name}</span>
                  <span>Total: {exam.totalMarks}</span>
                  <span>Passing: {exam.passingMarks}</span>
                  {exam.examDate && (
                    <span>
                      Date:{" "}
                      {new Date(exam.examDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Admission No</TableHead>
                        <TableHead className="text-right">Marks</TableHead>
                        <TableHead className="text-center">Grade</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {examResults.map((result) => {
                        const isPassed =
                          result.marksObtained != null &&
                          exam.passingMarks != null &&
                          Number(result.marksObtained) >= exam.passingMarks
                        return (
                          <TableRow key={result.student.admissionNo}>
                            <TableCell className="font-medium">
                              {result.student.firstName} {result.student.lastName}
                            </TableCell>
                            <TableCell>{result.student.admissionNo}</TableCell>
                            <TableCell className="text-right">
                              {result.marksObtained != null
                                ? `${Number(result.marksObtained)} / ${exam.totalMarks}`
                                : "—"}
                            </TableCell>
                            <TableCell className="text-center">
                              {result.grade ? (
                                <Badge variant="outline">
                                  {GRADE_DISPLAY[result.grade] ?? result.grade}
                                </Badge>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {result.marksObtained != null ? (
                                isPassed ? (
                                  <Badge variant="success" className="gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    Pass
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="gap-1">
                                    <XCircle className="h-3 w-3" />
                                    Fail
                                  </Badge>
                                )
                              ) : (
                                "—"
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
