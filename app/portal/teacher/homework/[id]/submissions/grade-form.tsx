"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { gradeTeacherHomeworkSubmission } from "@/actions/teacher-portal.actions"

export function GradeForm({
  submissionId,
  currentMarks,
  currentFeedback,
  totalMarks,
}: {
  submissionId: string
  currentMarks: number | null
  currentFeedback: string | null
  totalMarks: number | null
}) {
  const [state, formAction, pending] = useActionState(gradeTeacherHomeworkSubmission, null)

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-3">
      <input type="hidden" name="submissionId" value={submissionId} />
      <div>
        <Label htmlFor={`marks-${submissionId}`} className="text-xs">Marks {totalMarks ? `/ ${totalMarks}` : ""}</Label>
        <Input
          id={`marks-${submissionId}`}
          name="marksObtained"
          type="number"
          min="0"
          max={totalMarks || undefined}
          defaultValue={currentMarks ?? ""}
          placeholder="Marks"
        />
      </div>
      <div>
        <Label htmlFor={`feedback-${submissionId}`} className="text-xs">Feedback</Label>
        <Input
          id={`feedback-${submissionId}`}
          name="feedback"
          defaultValue={currentFeedback ?? ""}
          placeholder="Optional feedback"
        />
      </div>
      <div className="flex items-end">
        <Button type="submit" size="sm" disabled={pending} className="w-full">
          {pending ? "Saving..." : currentMarks !== null ? "Update" : "Grade"}
        </Button>
      </div>
      {state?.error && <p className="text-xs text-destructive col-span-full">{state.error}</p>}
    </form>
  )
}
