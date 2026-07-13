"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { assignClassTeacher, removeClassTeacher } from "@/actions/class-teacher.actions"
import { UserCheck, UserX } from "lucide-react"

type TeacherItem = { id: string; firstName: string; lastName: string; employeeCode: string; department: string | null }

export function ClassTeacherForm({
  classId,
  currentTeacher,
  teachers,
}: {
  classId: string
  currentTeacher: { id: string; firstName: string; lastName: string; employeeCode: string } | null
  teachers: TeacherItem[]
}) {
  const [state, formAction, pending] = useActionState(assignClassTeacher, null)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          Class Teacher
        </CardTitle>
        <CardDescription>
          {currentTeacher
            ? `Current Class Teacher: ${currentTeacher.firstName} ${currentTeacher.lastName} (${currentTeacher.employeeCode})`
            : "No class teacher assigned yet."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 max-w-md">
          <input type="hidden" name="classId" value={classId} />
          <div className="grid gap-2">
            <Label htmlFor="teacherId">Assign Teacher</Label>
            <div className="flex gap-2">
              <select id="teacherId" name="teacherId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm flex-1">
                <option value="">Select teacher</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName} ({t.employeeCode}){t.department ? ` - ${t.department}` : ""}
                  </option>
                ))}
              </select>
              <Button type="submit" disabled={pending}>
                {pending ? "Assigning..." : "Assign"}
              </Button>
            </div>
          </div>
          {currentTeacher && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (confirm("Remove class teacher?")) {
                    await removeClassTeacher(classId)
                    window.location.reload()
                  }
                }}
              >
                <UserX className="h-4 w-4 mr-1" />
                Remove
              </Button>
            </div>
          )}
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state?.success && <p className="text-sm text-green-600">Class teacher assigned successfully!</p>}
        </form>
      </CardContent>
    </Card>
  )
}
