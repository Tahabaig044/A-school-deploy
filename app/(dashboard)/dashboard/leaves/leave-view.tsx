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
import { createLeaveRequest, approveLeave, rejectLeave } from "@/actions/leave.actions"

type LeaveItem = {
  id: string
  leaveType: string
  startDate: string
  endDate: string
  reason: string
  status: string
  profile: { firstName: string | null; lastName: string | null; role: string }
}

export function LeaveView({ leaves, isAdmin }: { leaves: LeaveItem[]; isAdmin: boolean }) {
  const [state, formAction, pending] = useActionState(createLeaveRequest, null)

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
            <div className="grid grid-cols-2 gap-4">
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
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
                    <TableCell>
                      {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="max-w-40 truncate">{leave.reason}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        leave.status === "APPROVED" ? "bg-green-100 text-green-800" :
                        leave.status === "REJECTED" ? "bg-red-100 text-red-800" :
                        "bg-yellow-100 text-yellow-800"
                      }`}>
                        {leave.status.charAt(0) + leave.status.slice(1).toLowerCase()}
                      </span>
                    </TableCell>
                    {isAdmin && leave.status === "PENDING" && (
                      <TableCell>
                        <div className="flex gap-2">
                          <form action={approveLeave.bind(null, leave.id)}>
                            <Button size="sm" variant="default">Approve</Button>
                          </form>
                          <form action={rejectLeave.bind(null, leave.id)}>
                            <Button size="sm" variant="destructive">Reject</Button>
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
