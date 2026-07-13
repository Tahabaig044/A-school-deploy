"use client"

import { useActionState, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createTimetableSlot } from "@/actions/timetable.actions"

type ClassItem = { id: string; name: string; sections: { id: string; name: string }[] }
type TeacherItem = { id: string; firstName: string; lastName: string }
type SubjectItem = { id: string; name: string; code: string }
type SessionItem = { id: string; name: string; isCurrent: boolean }

export function TimetableForm({
  classes, teachers, subjects, sessions,
}: {
  classes: ClassItem[]
  teachers: TeacherItem[]
  subjects: SubjectItem[]
  sessions: SessionItem[]
}) {
  const [state, formAction, pending] = useActionState(createTimetableSlot, null)
  const [selectedClassId, setSelectedClassId] = useState("")
  const [sections, setSections] = useState<{ id: string; name: string }[]>([])
  const [isFree, setIsFree] = useState("false")

  useEffect(() => {
    const cls = classes.find((c) => c.id === selectedClassId)
    setSections(cls?.sections || [])
  }, [selectedClassId, classes])

  const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Timetable Slot</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 max-w-md">
          <fieldset className="flex gap-4">
            <legend className="text-sm font-medium mb-1">Period Type</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="isFree" value="false" checked={isFree === "false"} onChange={(e) => setIsFree(e.target.value)} className="h-4 w-4" />
              Teaching Period
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="isFree" value="true" checked={isFree === "true"} onChange={(e) => setIsFree(e.target.value)} className="h-4 w-4" />
              Free Period
            </label>
          </fieldset>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <option value="">All</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {isFree === "false" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="subjectId">Subject *</Label>
                <select id="subjectId" name="subjectId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                  <option value="">Select subject</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="teacherId">Teacher *</Label>
                <select id="teacherId" name="teacherId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                  <option value="">Select teacher</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {isFree === "true" && (
            <div className="grid gap-2">
              <Label htmlFor="freePeriodReason">Free Period Reason (optional)</Label>
              <Input id="freePeriodReason" name="freePeriodReason" placeholder="e.g. Sports, Library, Study Hall" />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="dayOfWeek">Day *</Label>
            <select id="dayOfWeek" name="dayOfWeek" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
              <option value="">Select day</option>
              {days.map((d) => (
                <option key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startTime">Start Time *</Label>
              <Input id="startTime" name="startTime" placeholder="09:00" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endTime">End Time *</Label>
              <Input id="endTime" name="endTime" placeholder="10:00" required />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="room">Room</Label>
            <Input id="room" name="room" placeholder="e.g. Room 101" />
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
          {isFree === "false" && (
            <div className="flex items-center gap-2">
              <input type="checkbox" id="overrideWorkload" name="overrideWorkload" value="true" className="h-4 w-4 rounded border-gray-300" />
              <Label htmlFor="overrideWorkload" className="text-sm text-muted-foreground">Override workload limits</Label>
            </div>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Adding..." : "Add Slot"}
          </Button>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        </form>
      </CardContent>
    </Card>
  )
}
