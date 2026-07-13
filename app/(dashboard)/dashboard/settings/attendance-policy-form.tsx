"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { updateAttendancePolicy } from "@/actions/attendance-settings.actions"

const POLICIES = [
  { value: "first_period_teacher", label: "First Period Teacher", desc: "The teacher of the first period marks attendance" },
  { value: "class_teacher", label: "Class Teacher", desc: "The assigned class teacher marks attendance" },
  { value: "subject_teacher", label: "Subject Teacher", desc: "Each subject teacher marks attendance for their period" },
  { value: "admin_only", label: "Admin Only", desc: "Only school administrators can mark attendance" },
] as const

export function AttendancePolicyForm({ currentPolicy }: { currentPolicy: string }) {
  const [state, formAction, pending] = useActionState(updateAttendancePolicy, null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Policy</CardTitle>
        <CardDescription>Choose who is responsible for marking student attendance</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 max-w-lg">
          <div className="grid gap-3">
            {POLICIES.map((policy) => (
              <label key={policy.value} className="flex items-start gap-3 p-3 rounded-md border cursor-pointer hover:bg-muted/50 has-[:checked]:border-primary">
                <input
                  type="radio"
                  name="policy"
                  value={policy.value}
                  defaultChecked={currentPolicy === policy.value}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-medium text-sm">{policy.label}</div>
                  <div className="text-xs text-muted-foreground">{policy.desc}</div>
                </div>
              </label>
            ))}
          </div>
          <Button type="submit" disabled={pending} className="w-fit">
            {pending ? "Saving..." : "Save Policy"}
          </Button>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state?.success && <p className="text-sm text-green-600">Attendance policy updated!</p>}
        </form>
      </CardContent>
    </Card>
  )
}
