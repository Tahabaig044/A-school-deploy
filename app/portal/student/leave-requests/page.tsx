"use client"

import { useEffect, useState } from "react"
import { useActionState } from "react"
import {
  getStudentLeaveRequests,
  createStudentLeaveRequest,
} from "@/actions/student-portal.actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { UserCheck, Plus, X, Calendar } from "lucide-react"

interface LeaveRequest {
  id: string
  leaveType: string
  startDate: Date
  endDate: Date
  reason: string
  status: string
  createdAt: Date
}

const statusVariant: Record<string, "warning" | "success" | "destructive"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
}

const leaveTypeLabels: Record<string, string> = {
  SICK: "Sick Leave",
  CASUAL: "Casual Leave",
  ANNUAL: "Annual Leave",
  OTHER: "Other",
}

export default function LeaveRequestsPage() {
  const [showForm, setShowForm] = useState(false)
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)

  const [state, formAction] = useActionState(createStudentLeaveRequest, null)

  useEffect(() => {
    getStudentLeaveRequests().then((data) => {
      setRequests(data as LeaveRequest[])
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (state?.success) {
      setShowForm(false)
      getStudentLeaveRequests().then((data) => {
        setRequests(data as LeaveRequest[])
      })
    }
  }, [state])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Leave Requests</h2>
          <p className="text-muted-foreground">View and submit leave requests</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="size-4" /> : <Plus className="size-4" />}
          {showForm ? "Cancel" : "New Request"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Submit Leave Request</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Leave Type</label>
                  <select
                    name="leaveType"
                    required
                    className="border-input focus-visible:border-ring focus-visible:ring-ring/50 flex h-8 w-full rounded-lg border bg-transparent px-2.5 py-1 text-base focus-visible:ring-3 md:text-sm"
                  >
                    <option value="">Select type</option>
                    <option value="SICK">Sick Leave</option>
                    <option value="CASUAL">Casual Leave</option>
                    <option value="ANNUAL">Annual Leave</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Input type="date" name="startDate" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Input type="date" name="endDate" required />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason</label>
                <Textarea name="reason" required placeholder="Enter reason for leave" />
              </div>
              {state?.error && <p className="text-destructive text-sm">{state.error}</p>}
              <Button type="submit">Submit Request</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="size-4" />
            My Leave Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : requests.length === 0 ? (
            <p className="text-muted-foreground text-sm">No leave requests found.</p>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {leaveTypeLabels[req.leaveType] || req.leaveType}
                      </span>
                      <Badge variant={statusVariant[req.status] || "secondary"}>{req.status}</Badge>
                    </div>
                    <div className="text-muted-foreground flex items-center gap-1 text-sm">
                      <Calendar className="size-3" />
                      {new Date(req.startDate).toLocaleDateString()} -{" "}
                      {new Date(req.endDate).toLocaleDateString()}
                    </div>
                    <p className="text-muted-foreground text-sm">{req.reason}</p>
                  </div>
                  <UserCheck className="text-muted-foreground size-4" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
