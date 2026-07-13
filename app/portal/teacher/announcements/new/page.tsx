"use client"

import { useActionState, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { createAnnouncement } from "@/actions/announcement.actions"
import { ArrowLeft } from "lucide-react"

type AssignmentItem = {
  id: string
  class: { id: string; name: string }
  section: { id: string; name: string } | null
  subject: { id: string; name: string }
}

export default function NewAnnouncementPage() {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(createAnnouncement, null)
  const [assignments, setAssignments] = useState<AssignmentItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/teacher/assignments")
      .then((r) => r.json())
      .then((data) => { setAssignments(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (state?.success) {
    router.push("/portal/teacher/announcements")
    return null
  }

  const uniqueClasses = assignments.reduce(
    (acc, a) => {
      const key = a.class.id
      if (!acc.find((c) => c.id === key)) acc.push(a.class)
      return acc
    },
    [] as { id: string; name: string }[]
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">New Announcement</h2>
          <p className="text-muted-foreground">Create an announcement for students and parents</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Announcement Details</CardTitle>
          <CardDescription>Fill in the details for the new announcement</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" name="title" placeholder="e.g. Holiday Notice" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content">Content *</Label>
              <textarea
                id="content"
                name="content"
                rows={6}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Write your announcement..."
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="audience">Audience *</Label>
                <select id="audience" name="audience" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                  <option value="ALL">All</option>
                  <option value="TEACHER">Teachers Only</option>
                  <option value="TEACHERS">Teachers (Legacy)</option>
                  <option value="STUDENT">Students Only</option>
                  <option value="STUDENTS">Students (Legacy)</option>
                  <option value="PARENT">Parents Only</option>
                  <option value="PARENTS">Parents (Legacy)</option>
                  <option value="CLASS">Specific Class</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="isPublished">Status</Label>
                <select id="isPublished" name="isPublished" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="true">Published</option>
                  <option value="false">Draft</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="classId">Class (optional)</Label>
                <select id="classId" name="classId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">All classes</option>
                  {uniqueClasses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="scheduledAt">Schedule (optional)</Label>
                <Input id="scheduledAt" name="scheduledAt" type="datetime-local" />
              </div>
            </div>
            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
            <Button type="submit" disabled={pending}>
              {pending ? "Creating..." : "Create Announcement"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
