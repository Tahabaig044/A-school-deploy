"use client"

import { useActionState } from "react"
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
import { createLeaveRequest, approveLeaveWithSubstitute, rejectLeave } from "@/actions/leave.actions"

type LeaveItem = {
  id: string
  leaveType: string
  startDate: string
  endDate: string
  reason: string
  status: string
  substituteTeacherId: string | null
  substituteTeacher?: { id: string; firstName: string; lastName: string } | null
  profile: { firstName: string | null; lastName: string | null; role: string }
}

type TeacherItem = { id: string; firstName: string; lastName: string; employeeCode: string }

export function LeaveView({
  leaves,
  isAdmin,
  teachers,
}: {
  leaves: LeaveItem[]
  isAdmin: boolean
  teachers?: TeacherItem[]
}) {
  const [state, formAction, pending] = useActionState(createLeaveRequest, null)
  const [approveState, approveAction, approvePending] = useActionState(approveLeaveWithSubstitute, null)

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Apply for Leave</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="grid gap-4 max-w-md">
            <div className="grid gap-2">
              <Label htmlFor="leaveType">Leave Type *</Label>
              <select id="leaveType" name="leaveType" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                <option value="SICK">Sick Leave</option>
                <option value="CASUAL">Casual Leave</option>
                <option value="ANNUAL">Annual Leave</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input id="startDate" name="startDate" type="date" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">End Date *</Label>
                <Input id="endDate" name="endDate" type="date" required />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason *</Label>
              <textarea id="reason" name="reason" required
                className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? "Submitting..." : "Submit Request"}
            </Button>
            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leave History ({leaves.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {leaves.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leave requests.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden md:table-cell">Dates</TableHead>
                    <TableHead className="hidden lg:table-cell">Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Substitute</TableHead>
                    {isAdmin && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaves.map((leave) => (
                    <TableRow key={leave.id}>
                      <TableCell className="font-medium">
                        {leave.profile.firstName} {leave.profile.lastName}
                        <span className="ml-1 text-xs text-muted-foreground">({leave.profile.role})</span>
                      </TableCell>
                      <TableCell className="capitalize">{leave.leaveType.toLowerCase()}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell max-w-40 truncate">{leave.reason}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          leave.status === "APPROVED" ? "bg-green-100 text-green-800" :
                          leave.status === "REJECTED" ? "bg-red-100 text-red-800" :
                          "bg-yellow-100 text-yellow-800"
                        }`}>
                          {leave.status.charAt(0) + leave.status.slice(1).toLowerCase()}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {leave.substituteTeacher
                          ? `${leave.substituteTeacher.firstName} ${leave.substituteTeacher.lastName}`
                          : leave.substituteTeacherId
                            ? "Assigned"
                            : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      {isAdmin && leave.status === "PENDING" && (
                        <TableCell>
                          <div className="flex gap-2 flex-col sm:flex-row">
                            <form action={approveAction}>
                              <input type="hidden" name="leaveId" value={leave.id} />
                              {teachers && teachers.length > 0 && (
                                <select name="substituteTeacherId" className="flex h-8 w-32 rounded-md border border-input bg-background px-2 py-1 text-xs mb-1">
                                  <option value="">No substitute</option>
                                  {teachers.map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.firstName} {t.lastName}
                                    </option>
                                  ))}
                                </select>
                              )}
                              <div className="flex gap-1">
                                <Button size="sm" variant="default" type="submit" disabled={approvePending}>
                                  {approvePending ? "..." : "Approve"}
                                </Button>
                                <form action={rejectLeave.bind(null, leave.id)}>
                                  <Button size="sm" variant="destructive" type="submit">Reject</Button>
                                </form>
                              </div>
                            </form>
                          </div>
                        </TableCell>
                      )}
                      {isAdmin && leave.status !== "PENDING" && (
                        <TableCell className="text-xs text-muted-foreground">
                          {leave.status === "APPROVED" ? "Approved" : "Rejected"}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {approveState?.error && <p className="text-sm text-destructive mt-2">{approveState.error}</p>}
        </CardContent>
      </Card>
    </div>
  )
}
