"use client"

import { useActionState } from "react"
import { bulkMarkAttendance } from "@/actions/attendance.actions"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ClipboardCheck, CheckCircle, Users } from "lucide-react"

type Student = {
  id: string
  firstName: string
  lastName: string
  enrollments: {
    class: { name: string }
    section: { name: string } | null
  }[]
}

type AttendanceState = {
  error?: string
  success?: boolean
}

async function submitAttendance(
  _prevState: AttendanceState | null,
  formData: FormData,
): Promise<AttendanceState> {
  try {
    await bulkMarkAttendance(formData)
    return { success: true, error: undefined }
  } catch {
    return { error: "Failed to mark attendance. Please try again.", success: false }
  }
}

export function AttendanceForm({
  students,
  classId,
  sectionId,
  academicSessionId,
  date,
}: {
  students: Student[]
  classId: string
  sectionId: string
  academicSessionId: string
  date: string
}) {
  const [state, formAction, pending] = useActionState(submitAttendance, null)

  return (
    <form action={formAction}>
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="sectionId" value={sectionId} />
      <input type="hidden" name="academicSessionId" value={academicSessionId} />
      <input type="hidden" name="date" value={date} />

      {state?.success && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center gap-2 py-3 text-sm text-green-700">
            <CheckCircle className="h-4 w-4" />
            Attendance submitted successfully.
          </CardContent>
        </Card>
      )}

      {state?.error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3 text-sm text-red-700">{state.error}</CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4" />
              {students.length} Students
            </div>
          </div>

          {students.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No students found for this class.
            </p>
          ) : (
            <div className="space-y-3">
              {students.map((student, index) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground w-6 text-center text-sm">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">
                        {student.firstName} {student.lastName}
                      </p>
                      {student.enrollments[0] && (
                        <p className="text-muted-foreground text-xs">
                          {student.enrollments[0].class.name}
                          {student.enrollments[0].section
                            ? ` - ${student.enrollments[0].section.name}`
                            : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  <select
                    name={`status_${student.id}`}
                    defaultValue="PRESENT"
                    className="border-input bg-background flex h-9 w-32 rounded-md border px-3 py-1 text-sm"
                  >
                    <option value="PRESENT">Present</option>
                    <option value="ABSENT">Absent</option>
                    <option value="LATE">Late</option>
                    <option value="LEAVE">Leave</option>
                  </select>
                </div>
              ))}
            </div>
          )}

          {students.length > 0 && (
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={pending}>
                <ClipboardCheck className="h-4 w-4" />
                {pending ? "Submitting..." : "Submit All"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </form>
  )
}
