"use client"

import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function ExamPerformanceReportView({
  data,
  profile,
}: {
  data: any[]
  profile: any
}) {
  const totalExams = data.length
  const totalStudents = data.reduce((sum, d) => sum + d.totalStudents, 0)
  const totalPassed = data.reduce((sum, d) => sum + d.passed, 0)
  const avgPassRate = totalStudents > 0 ? (totalPassed / totalStudents) * 100 : 0

  return (
    <div className="space-y-6">
      <PageHeader title="Exam Performance Report" description="Exam results and pass rates" />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Exams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExams}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Passed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalPassed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Average Pass Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgPassRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exam Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left">Exam</th>
                  <th className="p-3 text-left">Type</th>
                  <th className="p-3 text-left">Class</th>
                  <th className="p-3 text-left">Subject</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-right">Passing</th>
                  <th className="p-3 text-right">Students</th>
                  <th className="p-3 text-right">Passed</th>
                  <th className="p-3 text-right">Failed</th>
                  <th className="p-3 text-right">Pass Rate</th>
                  <th className="p-3 text-right">Avg Marks</th>
                </tr>
              </thead>
              <tbody>
                {data.map((exam) => (
                  <tr key={exam.id} className="border-b">
                    <td className="p-3">{exam.name}</td>
                    <td className="p-3"><Badge>{exam.examType}</Badge></td>
                    <td className="p-3">{exam.className}</td>
                    <td className="p-3">{exam.subject}</td>
                    <td className="p-3 text-right">{exam.totalMarks}</td>
                    <td className="p-3 text-right">{exam.passingMarks}</td>
                    <td className="p-3 text-right">{exam.totalStudents}</td>
                    <td className="p-3 text-right text-green-600">{exam.passed}</td>
                    <td className="p-3 text-right text-red-600">{exam.failed}</td>
                    <td className="p-3 text-right">
                      <Badge variant={exam.passRate >= 50 ? "default" : "destructive"}>
                        {exam.passRate.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="p-3 text-right">{exam.avgMarks.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
