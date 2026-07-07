"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { UserCheck, Plus, X, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getParentLeaveRequests,
  createParentLeaveRequest,
} from "@/actions/parent-portal.actions";

type LeaveType = "SICK" | "CASUAL" | "ANNUAL" | "OTHER";
type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

interface LeaveRequest {
  id: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  reason: string;
  status: LeaveStatus;
  createdAt: Date;
}

const leaveTypeLabels: Record<LeaveType, string> = {
  SICK: "Sick Leave",
  CASUAL: "Casual Leave",
  ANNUAL: "Annual Leave",
  OTHER: "Other",
};

const statusStyles: Record<LeaveStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  APPROVED: "bg-green-100 text-green-800 border-green-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
};

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const initialState = {
  success: false,
  error: undefined as string | undefined,
};

export default function ParentLeaveRequestsPage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [state, formAction] = useActionState(createParentLeaveRequest, initialState);

  useEffect(() => {
    loadLeaveRequests();
  }, []);

  useEffect(() => {
    if (state.success) {
      loadLeaveRequests();
      setShowForm(false);
    }
  }, [state.success]);

  async function loadLeaveRequests() {
    setLoading(true);
    try {
      const data = await getParentLeaveRequests();
      setLeaveRequests(data as LeaveRequest[]);
    } catch {
      setLeaveRequests([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserCheck className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Leave Requests</h1>
              <p className="text-sm text-gray-500">Manage your child&apos;s leave requests</p>
            </div>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Cancel" : "New Leave Request"}
          </Button>
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Create Leave Request</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={formAction} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="leaveType" className="text-sm font-medium text-gray-700">
                      Leave Type
                    </label>
                    <select
                      id="leaveType"
                      name="leaveType"
                      required
                      className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select leave type</option>
                      <option value="SICK">Sick Leave</option>
                      <option value="CASUAL">Casual Leave</option>
                      <option value="ANNUAL">Annual Leave</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="startDate" className="text-sm font-medium text-gray-700">
                      Start Date
                    </label>
                    <Input
                      type="date"
                      id="startDate"
                      name="startDate"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="endDate" className="text-sm font-medium text-gray-700">
                      End Date
                    </label>
                    <Input
                      type="date"
                      id="endDate"
                      name="endDate"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="reason" className="text-sm font-medium text-gray-700">
                    Reason
                  </label>
                  <Textarea
                    id="reason"
                    name="reason"
                    placeholder="Enter the reason for leave"
                    rows={3}
                    required
                  />
                </div>
                {state.error && (
                  <p className="text-sm text-red-600">{state.error}</p>
                )}
                <div className="flex justify-end">
                  <Button type="submit">Submit Request</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Leave Request History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : leaveRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No leave requests found.
              </div>
            ) : (
              <div className="space-y-4">
                {leaveRequests.map((request) => (
                  <div
                    key={request.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-medium text-gray-900">
                            {leaveTypeLabels[request.leaveType]}
                          </h3>
                          <Badge className={statusStyles[request.status]}>
                            {request.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {formatDate(request.startDate)} - {formatDate(request.endDate)}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">{request.reason}</p>
                      </div>
                      <span className="text-xs text-gray-400">
                        {formatDate(request.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
