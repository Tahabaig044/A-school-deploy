import { redirect } from "next/navigation"
import { getParentChildren, getChildAttendance } from "@/actions/parent-portal.actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react"
import { ChildSelector } from "./child-selector"

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "success" | "destructive" | "warning" | "info"; icon: React.ReactNode }
> = {
  PRESENT: { label: "Present", variant: "success", icon: <CheckCircle className="h-4 w-4" /> },
  ABSENT: { label: "Absent", variant: "destructive", icon: <XCircle className="h-4 w-4" /> },
  LATE: { label: "Late", variant: "warning", icon: <Clock className="h-4 w-4" /> },
  LEAVE: { label: "Leave", variant: "info", icon: <AlertCircle className="h-4 w-4" /> },
}

export default async function ParentAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const params = await searchParams
  const children = await getParentChildren()

  if (children.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Attendance</h2>
          <p className="text-muted-foreground">Track your children&apos;s attendance</p>
        </div>
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center">
            No children found.
          </CardContent>
        </Card>
      </div>
    )
  }

  const selectedStudentId = params.student || children[0].id
  const now = new Date()
  const currentMonth = now.getMonth()
  const selectedMonth = params.month !== undefined ? parseInt(params.month) : currentMonth
  const monthName = MONTHS[selectedMonth]

  let attendance: any[] = []
  if (selectedStudentId) {
    attendance = await getChildAttendance(selectedStudentId, String(selectedMonth))
    attendance = attendance.map((record) => ({
      ...record,
      date: record.date instanceof Date ? record.date.toISOString() : record.date,
    }))
  }

  const totalDays = attendance.length
  const presentCount = attendance.filter((r) => r.status === "PRESENT").length
  const absentCount = attendance.filter((r) => r.status === "ABSENT").length
  const lateCount = attendance.filter((r) => r.status === "LATE").length
  const leaveCount = attendance.filter((r) => r.status === "LEAVE").length

  const stats = [
    {
      label: "Total Days",
      value: totalDays,
      icon: <ClipboardCheck className="h-5 w-5" />,
      color: "text-foreground",
    },
    {
      label: "Present",
      value: presentCount,
      pct: totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0,
      icon: <CheckCircle className="h-5 w-5 text-emerald-500" />,
      color: "text-emerald-600",
    },
    {
      label: "Absent",
      value: absentCount,
      pct: totalDays > 0 ? Math.round((absentCount / totalDays) * 100) : 0,
      icon: <XCircle className="h-5 w-5 text-red-500" />,
      color: "text-red-600",
    },
    {
      label: "Late",
      value: lateCount,
      pct: totalDays > 0 ? Math.round((lateCount / totalDays) * 100) : 0,
      icon: <Clock className="h-5 w-5 text-amber-500" />,
      color: "text-amber-600",
    },
    {
      label: "Leave",
      value: leaveCount,
      pct: totalDays > 0 ? Math.round((leaveCount / totalDays) * 100) : 0,
      icon: <AlertCircle className="h-5 w-5 text-blue-500" />,
      color: "text-blue-600",
    },
  ]

  const prevMonth = selectedMonth > 0 ? selectedMonth - 1 : 11
  const nextMonth = selectedMonth < 11 ? selectedMonth + 1 : 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Attendance</h2>
        <p className="text-muted-foreground">Track your children&apos;s attendance</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Child</CardTitle>
        </CardHeader>
        <CardContent>
          <ChildSelector
            children={children.map((c) => ({
              id: c.id,
              firstName: c.firstName,
              lastName: c.lastName,
            }))}
            selectedId={selectedStudentId}
            month={selectedMonth}
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          render={<a href={`?student=${selectedStudentId}&month=${prevMonth}`} />}
        >
          <ChevronLeft className="h-4 w-4" />
          {MONTHS[prevMonth]}
        </Button>
        <h3 className="text-lg font-semibold">
          {monthName} {now.getFullYear()}
        </h3>
        <Button
          variant="outline"
          size="sm"
          render={<a href={`?student=${selectedStudentId}&month=${nextMonth}`} />}
        >
          {MONTHS[nextMonth]}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              {stat.pct !== undefined && (
                <p className="text-muted-foreground text-xs">{stat.pct}%</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          {attendance.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              No attendance records for this month.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.map((record) => {
                    const config = STATUS_CONFIG[record.status] || STATUS_CONFIG.PRESENT
                    return (
                      <TableRow key={record.id}>
                        <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={config.variant} className="gap-1">
                            {config.icon}
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {record.class?.name}
                          {record.section?.name ? ` - ${record.section.name}` : ""}
                        </TableCell>
                        <TableCell>{record.remarks || "-"}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
