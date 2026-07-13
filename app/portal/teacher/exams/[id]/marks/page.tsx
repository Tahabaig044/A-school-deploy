"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Save, CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type ExamData = {
  id: string
  name: string
  totalMarks: number
  passingMarks: number
  class: { name: string }
  subject: { name: string; code: string }
  examType: { name: string }
  isPublished: boolean
  _count: { results: number }
}

type StudentResult = {
  studentId: string
  firstName: string
  lastName: string
  admissionNo: string | null
  marksObtained: number | null
  grade: string | null
  remarks: string | null
}

export default function MarksEntryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [exam, setExam] = useState<ExamData | null>(null)
  const [results, setResults] = useState<StudentResult[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [examId, setExamId] = useState<string>("")

  useEffect(() => {
    params.then((p) => setExamId(p.id))
  }, [params])

  useEffect(() => {
    if (!examId) return
    setLoading(true)
    Promise.all([
      fetch(`/api/teacher/exams/${examId}`).then((r) => r.json()),
      fetch(`/api/teacher/exams/${examId}/results`).then((r) => r.json()),
    ]).then(([examData, resultsData]) => {
      setExam(examData)
      setResults(resultsData)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [examId])

  const updateMarks = (studentId: string, marks: number | null) => {
    setResults((prev) =>
      prev.map((r) =>
        r.studentId === studentId ? { ...r, marksObtained: marks } : r
      )
    )
  }

  const updateRemarks = (studentId: string, remarks: string) => {
    setResults((prev) =>
      prev.map((r) =>
        r.studentId === studentId ? { ...r, remarks } : r
      )
    )
  }

  const saveAll = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/teacher/exams/save-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId, results }),
      })
      if (res.ok) {
        toast({ title: "Marks saved successfully" })
      } else {
        toast({ title: "Failed to save marks", variant: "destructive" })
      }
    } catch {
      toast({ title: "Failed to save marks", variant: "destructive" })
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-4 w-48 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (!exam) {
    return <p className="text-muted-foreground">Exam not found.</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{exam.name}</h2>
            <p className="text-muted-foreground">
              {exam.subject.name} ({exam.subject.code}) — {exam.class.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={exam.isPublished ? "default" : "secondary"}>
            {exam.isPublished ? "Published" : "Draft"}
          </Badge>
          <Button onClick={saveAll} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save All Marks"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Marks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{exam.totalMarks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Passing Marks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{exam.passingMarks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{results.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Entered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {results.filter((r) => r.marksObtained !== null && r.marksObtained !== undefined).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Marks Entry</CardTitle>
          <CardDescription>Enter marks for each student</CardDescription>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students found for this exam.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium">#</th>
                    <th className="text-left py-2 px-2 font-medium">Student</th>
                    <th className="text-left py-2 px-2 font-medium">Admission No</th>
                    <th className="text-center py-2 px-2 font-medium">Marks (/{exam.totalMarks})</th>
                    <th className="text-left py-2 px-2 font-medium">Remarks</th>
                    <th className="text-center py-2 px-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, idx) => (
                    <tr key={result.studentId} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2 text-muted-foreground">{idx + 1}</td>
                      <td className="py-2 px-2 font-medium">
                        {result.firstName} {result.lastName}
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">{result.admissionNo || "-"}</td>
                      <td className="py-2 px-2">
                        <Input
                          type="number"
                          min="0"
                          max={exam.totalMarks}
                          value={result.marksObtained ?? ""}
                          onChange={(e) => updateMarks(result.studentId, e.target.value ? Number(e.target.value) : null)}
                          className="w-24 text-center mx-auto"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <Input
                          value={result.remarks ?? ""}
                          onChange={(e) => updateRemarks(result.studentId, e.target.value)}
                          placeholder="Optional"
                          className="w-40"
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        {result.marksObtained !== null && result.marksObtained !== undefined ? (
                          result.marksObtained >= exam.passingMarks ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">Pass</Badge>
                          ) : (
                            <Badge variant="destructive">Fail</Badge>
                          )
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
