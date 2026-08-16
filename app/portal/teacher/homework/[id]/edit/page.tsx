"use client"

import { useActionState, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { use } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { updateTeacherHomework } from "@/actions/teacher-portal.actions"
import { getHomeworkById } from "@/actions/homework.actions"
import { ArrowLeft, Loader2 } from "lucide-react"

type AssignmentItem = {
  id: string
  class: { id: string; name: string }
  section: { id: string; name: string } | null
  subject: { id: string; name: string; code: string }
}

export default function EditHomeworkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [state, formAction, pending] = useActionState(
    updateTeacherHomework.bind(null, id),
    null
  )
  const [homework, setHomework] = useState<any>(null)
  const [assignments, setAssignments] = useState<AssignmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const [hw, assigns] = await Promise.all([
        getHomeworkById(id),
        fetch("/api/teacher/assignments").then((r) => r.json()),
      ])
      if (!hw) {
        setNotFound(true)
      } else {
        setHomework(hw)
      }
      setAssignments(assigns)
      setLoading(false)
    }
    load()
  }, [id])

  if (state?.success) {
    router.push("/portal/teacher/homework")
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Homework Not Found</h1>
          <p className="text-muted-foreground">The homework assignment you are looking for does not exist.</p>
          <Button asChild>
            <a href="/portal/teacher/homework">Back to Homework</a>
          </Button>
        </div>
      </div>
    )
  }

  const dueDateStr = homework.dueDate
    ? new Date(homework.dueDate).toISOString().split("T")[0]
    : ""

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Edit Homework</h2>
          <p className="text-muted-foreground">Update homework assignment details</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Homework Details</CardTitle>
          <CardDescription>Modify the details for this homework assignment</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" name="title" placeholder="e.g. Chapter 5 Exercise" defaultValue={homework.title} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <textarea id="description" name="description" rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Describe the homework tasks..."
                defaultValue={homework.description || ""} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="dueDate">Due Date *</Label>
                <Input id="dueDate" name="dueDate" type="date" defaultValue={dueDateStr} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="totalMarks">Total Marks</Label>
                <Input id="totalMarks" name="totalMarks" type="number" min="0" placeholder="Optional"
                  defaultValue={homework.totalMarks ?? ""} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="outline" type="button" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
