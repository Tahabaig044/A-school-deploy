"use client"

import { useActionState, startTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { markStaffAttendance } from "@/actions/attendance.actions"

type StaffItem = {
  id: string
  firstName: string
  lastName: string
  department: string
  employeeCode: string
}

type RecordEntry = [string, { id: string; checkIn: string | null; checkOut: string | null; status: string }]

export function StaffAttendanceView({
  staff, recordMap, todayStr,
}: {
  staff: StaffItem[]
  recordMap: RecordEntry[]
  todayStr: string
}) {
  const [state, formAction, pending] = useActionState(markStaffAttendance, null)
  const records = new Map(recordMap)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>, staffId: string) {
    e.preventDefault()
    const form = e.currentTarget
    const row = form.closest("tr")
    if (!row) return
    const formData = new FormData()
    formData.set("staffId", staffId)
    formData.set("date", todayStr)
    const checkIn = row.querySelector<HTMLInputElement>('[name="checkIn"]')
    const checkOut = row.querySelector<HTMLInputElement>('[name="checkOut"]')
    const status = row.querySelector<HTMLSelectElement>('[name="status"]')
    if (checkIn) formData.set("checkIn", checkIn.value)
    if (checkOut) formData.set("checkOut", checkOut.value)
    if (status) formData.set("status", status.value)
    startTransition(() => {
      formAction(formData)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today — {todayStr}</CardTitle>
      </CardHeader>
      <CardContent>
        {staff.length === 0 ? (
          <p className="text-sm text-muted-foreground">No staff found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((s) => {
                const record = records.get(s.id)
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.firstName} {s.lastName}</TableCell>
                    <TableCell>{s.department}</TableCell>
                    <TableCell>{s.employeeCode}</TableCell>
                    <TableCell>
                      <input
                        type="time"
                        name="checkIn"
                        defaultValue={record?.checkIn?.split("T")[1]?.substring(0, 5) || "09:00"}
                        className="flex h-8 w-24 rounded-md border border-input bg-background px-2 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <input
                        type="time"
                        name="checkOut"
                        defaultValue={record?.checkOut?.split("T")[1]?.substring(0, 5) || "17:00"}
                        className="flex h-8 w-24 rounded-md border border-input bg-background px-2 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <select
                        name="status"
                        defaultValue={record?.status || "PRESENT"}
                        className="flex h-8 w-28 rounded-md border border-input bg-background px-2 text-xs"
                      >
                        <option value="PRESENT">Present</option>
                        <option value="ABSENT">Absent</option>
                        <option value="LATE">Late</option>
                        <option value="LEAVE">Leave</option>
                      </select>
                    </TableCell>
                    <TableCell>
                      <form onSubmit={(e) => handleSubmit(e, s.id)}>
                        <Button size="sm" type="submit" disabled={pending}>
                          {record ? "Update" : "Save"}
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
        {state?.error && <p className="text-sm text-destructive mt-2">{state.error}</p>}
      </CardContent>
    </Card>
  )
}
