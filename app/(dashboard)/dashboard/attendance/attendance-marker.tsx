"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState, useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { bulkMarkAttendance } from "@/actions/attendance.actions"

type ClassItem = { id: string; name: string; sections: { id: string; name: string }[] }
type SessionItem = { id: string; name: string }
type StudentItem = {
  id: string
  firstName: string
  lastName: string
  admissionNo: string | null
  enrollments: { class: { name: string }; section: { name: string } | null }[]
}
type AttendanceRecord = { studentId: string; status: string }

export function AttendanceMarker({
  classes,
  sessions,
  students,
  existingAttendance,
  currentClassId,
  currentSectionId,
  currentSessionId,
  currentDate,
}: {
  classes: ClassItem[]
  sessions: SessionItem[]
  students: StudentItem[]
  existingAttendance: AttendanceRecord[]
  currentClassId: string
  currentSectionId: string
  currentSessionId: string
  currentDate: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [classId, setClassId] = useState(currentClassId)
  const [sectionId, setSectionId] = useState(currentSectionId)
  const [sessionId, setSessionId] = useState(currentSessionId)
  const [date, setDate] = useState(currentDate || new Date().toISOString().split("T")[0])

  const existingMap = new Map(existingAttendance.map((a) => [a.studentId, a.status]))

  function loadStudents() {
    const params = new URLSearchParams()
    if (classId) params.set("classId", classId)
    if (sectionId) params.set("sectionId", sectionId)
    if (sessionId) params.set("sessionId", sessionId)
    if (date) params.set("date", date)
    router.push(`/dashboard/attendance?${params.toString()}`)
  }

  const sections = classes.find((c) => c.id === classId)?.sections || []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="grid gap-2">
            <Label htmlFor="classId">Class</Label>
            <select
              id="classId"
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value)
                setSectionId("")
              }}
              className="border-input bg-background flex h-10 w-44 rounded-md border px-3 py-2 text-sm"
            >
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sectionId">Section</Label>
            <select
              id="sectionId"
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              className="border-input bg-background flex h-10 w-32 rounded-md border px-3 py-2 text-sm"
            >
              <option value="">All</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sessionId">Session</Label>
            <select
              id="sessionId"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="border-input bg-background flex h-10 w-48 rounded-md border px-3 py-2 text-sm"
            >
              <option value="">Select session</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-40"
            />
          </div>
          <Button onClick={loadStudents}>Load Students</Button>
        </div>

        {students.length > 0 && (
          <form action={bulkMarkAttendance}>
            <input type="hidden" name="classId" value={classId} />
            <input type="hidden" name="sectionId" value={sectionId} />
            <input type="hidden" name="academicSessionId" value={sessionId} />
            <input type="hidden" name="date" value={date} />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Admission No</TableHead>
                  <TableHead>Class/Section</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student, index) => (
                  <TableRow key={student.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {student.firstName} {student.lastName}
                    </TableCell>
                    <TableCell>{student.admissionNo || "-"}</TableCell>
                    <TableCell>
                      {student.enrollments[0]
                        ? `${student.enrollments[0].class.name}${student.enrollments[0].section ? ` - ${student.enrollments[0].section.name}` : ""}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <select
                        name={`status_${student.id}`}
                        className="border-input bg-background flex h-10 w-32 rounded-md border px-3 py-2 text-sm"
                        defaultValue={existingMap.get(student.id) || "PRESENT"}
                      >
                        <option value="PRESENT">Present</option>
                        <option value="ABSENT">Absent</option>
                        <option value="LATE">Late</option>
                        <option value="LEAVE">Leave</option>
                      </select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4">
              <Button type="submit">Save All Attendance</Button>
            </div>
          </form>
        )}

        {students.length === 0 && (classId || date) && (
          <p className="text-muted-foreground text-sm">
            Select a class, session, and date, then click Load Students.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
