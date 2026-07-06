"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export function AttendanceReportView({
  data,
  profile,
}: {
  data: any[]
  profile: any
}) {
  const router = useRouter()
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  function handleFilter() {
    const params = new URLSearchParams()
    if (fromDate) params.set("fromDate", fromDate)
    if (toDate) params.set("toDate", toDate)
    router.push(`/dashboard/reports/attendance?${params.toString()}`)
  }

  const totalPresent = data.reduce((sum, d) => sum + d.PRESENT, 0)
  const totalAbsent = data.reduce((sum, d) => sum + d.ABSENT, 0)
  const totalLate = data.reduce((sum, d) => sum + d.LATE, 0)
  const totalLeave = data.reduce((sum, d) => sum + d.LEAVE, 0)
  const totalRecords = totalPresent + totalAbsent + totalLate + totalLeave

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance Report" description="Daily and monthly attendance overview" />

      <Card>
        <CardHeader>
          <CardTitle>Filter by Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div>
              <Label htmlFor="fromDate">From Date</Label>
              <Input
                id="fromDate"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="toDate">To Date</Label>
              <Input
                id="toDate"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <Button onClick={handleFilter}>Apply Filter</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Present</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalPresent}</div>
            <p className="text-xs text-muted-foreground">
              {totalRecords > 0 ? ((totalPresent / totalRecords) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Absent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalAbsent}</div>
            <p className="text-xs text-muted-foreground">
              {totalRecords > 0 ? ((totalAbsent / totalRecords) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Late</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{totalLate}</div>
            <p className="text-xs text-muted-foreground">
              {totalRecords > 0 ? ((totalLate / totalRecords) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Leave</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalLeave}</div>
            <p className="text-xs text-muted-foreground">
              {totalRecords > 0 ? ((totalLeave / totalRecords) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-right">Present</th>
                  <th className="p-3 text-right">Absent</th>
                  <th className="p-3 text-right">Late</th>
                  <th className="p-3 text-right">Leave</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-3">{item.date}</td>
                    <td className="p-3 text-right text-green-600">{item.PRESENT}</td>
                    <td className="p-3 text-right text-red-600">{item.ABSENT}</td>
                    <td className="p-3 text-right text-yellow-600">{item.LATE}</td>
                    <td className="p-3 text-right text-blue-600">{item.LEAVE}</td>
                    <td className="p-3 text-right">{item.PRESENT + item.ABSENT + item.LATE + item.LEAVE}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
