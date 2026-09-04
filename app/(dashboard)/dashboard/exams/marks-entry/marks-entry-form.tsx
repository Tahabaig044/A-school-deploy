"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { submitExamResult, submitBulkExamResults } from "@/actions/exam.actions"
import { useToast } from "@/hooks/use-toast"

export function MarksEntryForm({
  exams,
  selectedExam,
  students,
  existingResults,
  profile,
}: {
  exams: any[]
  selectedExam: any
  students: any[]
  existingResults: any[]
  profile: any
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [marks, setMarks] = useState<Record<string, string>>({})
  const [remarks, setRemarks] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const existingResultsMap = existingResults.reduce((acc: any, r: any) => {
    acc[r.student.id] = r
    return acc
  }, {})

  function handleExamChange(examId: string | null) {
    if (examId) router.push(`/dashboard/exams/marks-entry?examId=${examId}`)
  }

  function handleMarkChange(studentId: string, value: string) {
    setMarks((prev) => ({ ...prev, [studentId]: value }))
  }

  function handleRemarkChange(studentId: string, value: string) {
    setRemarks((prev) => ({ ...prev, [studentId]: value }))
  }

  async function handleSaveAll() {
    if (!selectedExam) return

    setSaving(true)
    const results = students
      .map((student) => ({
        studentId: student.id,
        marksObtained:
          marks[student.id] !== undefined
            ? Number(marks[student.id])
            : existingResultsMap[student.id]?.marksObtained
              ? Number(existingResultsMap[student.id].marksObtained)
              : null,
        remarks: remarks[student.id] || existingResultsMap[student.id]?.remarks || undefined,
      }))
      .filter((r) => r.marksObtained !== null)

    const res = await submitBulkExamResults(selectedExam.id, results)
    setSaving(false)

    if (res?.error) {
      toast({ title: res.error, variant: "destructive" })
    } else {
      toast({ title: "Marks saved successfully" })
      router.refresh()
    }
  }

  async function handleSaveIndividual(studentId: string) {
    if (!selectedExam) return

    const formData = new FormData()
    formData.set("examId", selectedExam.id)
    formData.set("studentId", studentId)
    formData.set("marksObtained", marks[studentId] || "")
    formData.set("remarks", remarks[studentId] || "")

    const res = await submitExamResult(null, formData)
    if (res?.error) {
      toast({ title: res.error, variant: "destructive" })
    } else {
      toast({ title: "Marks saved" })
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Marks Entry" description="Enter exam marks for students" />

      <div className="flex gap-4">
        <div className="w-64">
          <Label>Select Exam</Label>
          <Select defaultValue={selectedExam?.id || ""} onValueChange={handleExamChange}>
            <SelectTrigger>
              <SelectValue placeholder="Choose exam" />
            </SelectTrigger>
            <SelectContent>
              {exams.map((exam) => (
                <SelectItem key={exam.id} value={exam.id}>
                  {exam.name} - {exam.class?.name} ({exam.subject?.name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedExam && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                {selectedExam.name} - {selectedExam.class?.name} ({selectedExam.subject?.name})
              </span>
              <span className="text-sm font-normal">
                Total: {selectedExam.totalMarks} | Passing: {selectedExam.passingMarks}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={handleSaveAll} disabled={saving}>
                  {saving ? "Saving..." : "Save All Marks"}
                </Button>
              </div>

              <div className="rounded-lg border">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="p-3 text-left">Admission No</th>
                      <th className="p-3 text-left">Student Name</th>
                      <th className="p-3 text-left">Marks Obtained</th>
                      <th className="p-3 text-left">Remarks</th>
                      <th className="p-3 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => {
                      const existing = existingResultsMap[student.id]
                      return (
                        <tr key={student.id} className="border-b">
                          <td className="p-3">{student.admissionNo}</td>
                          <td className="p-3">
                            {student.firstName} {student.lastName}
                          </td>
                          <td className="p-3">
                            <Input
                              type="number"
                              min="0"
                              max={selectedExam.totalMarks}
                              defaultValue={existing?.marksObtained || ""}
                              onChange={(e) => handleMarkChange(student.id, e.target.value)}
                              className="w-24"
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              defaultValue={existing?.remarks || ""}
                              onChange={(e) => handleRemarkChange(student.id, e.target.value)}
                              className="w-48"
                            />
                          </td>
                          <td className="p-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSaveIndividual(student.id)}
                            >
                              Save
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
