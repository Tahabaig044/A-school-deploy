"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { gradeHomework } from "@/actions/homework.actions"
import { useToast } from "@/hooks/use-toast"

export function CheckList({
  homework,
  submissions,
  profile,
}: {
  homework: any
  submissions: any[]
  profile: any
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [marks, setMarks] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<Record<string, string>>({})

  async function handleGrade(submissionId: string) {
    const formData = new FormData()
    formData.set("marksObtained", marks[submissionId] || "0")
    formData.set("feedback", feedback[submissionId] || "")

    const res = await gradeHomework(submissionId, null, formData)
    if (res?.error) {
      toast({ title: res.error, variant: "destructive" })
    } else {
      toast({ title: "Homework graded" })
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Check Homework" description="Review and grade student submissions" />

      {homework && (
        <Card>
          <CardHeader>
            <CardTitle>{homework.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="font-medium">Class:</span> {homework.class?.name}</div>
              <div><span className="font-medium">Subject:</span> {homework.subject?.name}</div>
              <div><span className="font-medium">Due Date:</span> {new Date(homework.dueDate).toLocaleDateString()}</div>
              <div><span className="font-medium">Total Marks:</span> {homework.totalMarks || "-"}</div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="border rounded-lg">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left">Admission No</th>
              <th className="p-3 text-left">Student Name</th>
              <th className="p-3 text-left">Content</th>
              <th className="p-3 text-left">Submitted At</th>
              <th className="p-3 text-left">Marks</th>
              <th className="p-3 text-left">Feedback</th>
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((sub) => (
              <tr key={sub.id} className="border-b">
                <td className="p-3">{sub.student?.admissionNo}</td>
                <td className="p-3">{sub.student?.firstName} {sub.student?.lastName}</td>
                <td className="p-3 max-w-xs truncate">{sub.content || "-"}</td>
                <td className="p-3">{new Date(sub.submittedAt).toLocaleDateString()}</td>
                <td className="p-3">
                  {sub.status === "GRADED" ? (
                    <Badge>{sub.marksObtained}</Badge>
                  ) : (
                    <Input
                      type="number"
                      min="0"
                      max={homework?.totalMarks || 100}
                      defaultValue={marks[sub.id] || ""}
                      onChange={(e) => setMarks((prev) => ({ ...prev, [sub.id]: e.target.value }))}
                      className="w-20"
                    />
                  )}
                </td>
                <td className="p-3">
                  {sub.status === "GRADED" ? (
                    <span className="text-sm">{sub.feedback || "-"}</span>
                  ) : (
                    <Input
                      defaultValue={feedback[sub.id] || ""}
                      onChange={(e) => setFeedback((prev) => ({ ...prev, [sub.id]: e.target.value }))}
                      className="w-48"
                    />
                  )}
                </td>
                <td className="p-3">
                  {sub.status === "GRADED" ? (
                    <Badge>Graded</Badge>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => handleGrade(sub.id)}>
                      Grade
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
