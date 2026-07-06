"use client"

import { useActionState, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createAssignment } from "@/actions/assignment.actions"

type TeacherItem = { id: string; firstName: string; lastName: string; employeeCode: string }
type ClassItem = { id: string; name: string; sections: { id: string; name: string }[] }
type SubjectItem = { id: string; name: string; code: string }
type SessionItem = { id: string; name: string; isCurrent: boolean }

export function AssignmentForm({
  teachers, classes, subjects, sessions,
}: {
  teachers: TeacherItem[]
  classes: ClassItem[]
  subjects: SubjectItem[]
  sessions: SessionItem[]
}) {
  const [state, formAction, pending] = useActionState(createAssignment, null)
  const [selectedClassId, setSelectedClassId] = useState("")
  const [sections, setSections] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    const cls = classes.find((c) => c.id === selectedClassId)
    setSections(cls?.sections || [])
  }, [selectedClassId, classes])

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Assignment</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 max-w-md">
          <div className="grid gap-2">
            <Label htmlFor="teacherId">Teacher *</Label>
            <select id="teacherId" name="teacherId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
              <option value="">Select teacher</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.firstName} {t.lastName} ({t.employeeCode})
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="classId">Class *</Label>
            <select id="classId" name="classId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required
              value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}>
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sectionId">Section</Label>
            <select id="sectionId" name="sectionId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">All sections</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="subjectId">Subject *</Label>
            <select id="subjectId" name="subjectId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
              <option value="">Select subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="academicSessionId">Academic Session *</Label>
            <select id="academicSessionId" name="academicSessionId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
              <option value="">Select session</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>{s.name}{s.isCurrent ? " (Current)" : ""}</option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Creating..." : "Create Assignment"}
          </Button>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        </form>
      </CardContent>
    </Card>
  )
}
