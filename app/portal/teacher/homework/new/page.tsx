"use client"

import { useActionState, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { createTeacherHomework } from "@/actions/teacher-portal.actions"
import { ArrowLeft } from "lucide-react"

type AssignmentItem = {
  id: string
  class: { id: string; name: string }
  section: { id: string; name: string } | null
  subject: { id: string; name: string; code: string }
}

export default function NewHomeworkPage() {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(createTeacherHomework, null)
  const [assignments, setAssignments] = useState<AssignmentItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/teacher/assignments")
      .then((r) => r.json())
      .then((data) => { setAssignments(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (state?.success) {
    router.push("/portal/teacher/homework")
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">New Homework</h2>
          <p className="text-muted-foreground">Create a new homework assignment</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Homework Details</CardTitle>
          <CardDescription>Fill in the details for the new homework assignment</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="grid gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="classId">Class *</Label>
                <select id="classId" name="classId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                  <option value="">Select class</option>
                  {assignments.map((a, i) => (
                    <option key={`${a.class.id}-${i}`} value={a.class.id}>
                      {a.class.name}{a.section ? ` - ${a.section.name}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="subjectId">Subject *</Label>
                <select id="subjectId" name="subjectId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                  <option value="">Select subject</option>
                  {assignments.map((a, i) => (
                    <option key={`${a.subject.id}-${i}`} value={a.subject.id}>
                      {a.subject.name} ({a.subject.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" name="title" placeholder="e.g. Chapter 5 Exercise" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <textarea id="description" name="description" rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Describe the homework tasks..." />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="dueDate">Due Date *</Label>
                <Input id="dueDate" name="dueDate" type="date" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="totalMarks">Total Marks</Label>
                <Input id="totalMarks" name="totalMarks" type="number" min="0" placeholder="Optional" />
              </div>
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating..." : "Create Homework"}
            </Button>
            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
