import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { getStudentAttendance } from "@/actions/student-portal.actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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

const MONTH_NAMES = [
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

const STATUS_CONFIG = {
  PRESENT: {
    label: "Present",
    variant: "success" as const,
    icon: CheckCircle,
    color: "text-emerald-600",
  },
  ABSENT: {
    label: "Absent",
    variant: "destructive" as const,
    icon: XCircle,
    color: "text-red-600",
  },
  LATE: { label: "Late", variant: "warning" as const, icon: Clock, color: "text-amber-600" },
  LEAVE: { label: "Leave", variant: "info" as const, icon: AlertCircle, color: "text-blue-600" },
}

export default async function StudentAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile || profile.role !== "STUDENT") redirect("/dashboard")

  const params = await searchParams
  const now = new Date()
  const currentMonth = params.month ? parseInt(params.month) : now.getMonth()
  const safeMonth =
    isNaN(currentMonth) || currentMonth < 0 || currentMonth > 11 ? now.getMonth() : currentMonth

  const prevMonth = safeMonth === 0 ? 11 : safeMonth - 1
  const nextMonth = safeMonth === 11 ? 0 : safeMonth + 1
  const prevYear = safeMonth === 0 ? now.getFullYear() - 1 : now.getFullYear()
  const nextYear = safeMonth === 11 ? now.getFullYear() + 1 : now.getFullYear()

  const records = await getStudentAttendance(String(safeMonth))

  const totalDays = records.length
  const presentCount = records.filter((r) => r.status === "PRESENT").length
  const absentCount = records.filter((r) => r.status === "ABSENT").length
  const lateCount = records.filter((r) => r.status === "LATE").length
  const leaveCount = records.filter((r) => r.status === "LEAVE").length

  const stats = [
    { label: "Total Days", value: totalDays, icon: ClipboardCheck, color: "text-foreground" },
    { label: "Present", value: presentCount, icon: CheckCircle, color: "text-emerald-600" },
    { label: "Absent", value: absentCount, icon: XCircle, color: "text-red-600" },
    { label: "Late", value: lateCount, icon: Clock, color: "text-amber-600" },
    { label: "Leave", value: leaveCount, icon: AlertCircle, color: "text-blue-600" },
  ]

  const pct = (count: number) => (totalDays > 0 ? Math.round((count / totalDays) * 100) : 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Attendance</h2>
          <p className="text-muted-foreground">
            {MONTH_NAMES[safeMonth]} {now.getFullYear()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <a href={`/portal/student/attendance?month=${prevMonth}`}>
              <ChevronLeft className="h-4 w-4" />
            </a>
          </Button>
          <Button variant="outline" size="icon" asChild>
            <a href={`/portal/student/attendance?month=${nextMonth}`}>
              <ChevronRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.label !== "Total Days" && (
                <p className="text-muted-foreground text-xs">{pct(stat.value)}% of total</p>
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
          {records.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              No attendance records found for {MONTH_NAMES[safeMonth]}.
            </p>
          ) : (
            <div className="space-y-3">
              {records.map((record) => {
                const config = STATUS_CONFIG[record.status]
                const StatusIcon = config.icon
                return (
                  <div
                    key={record.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <StatusIcon className={`h-5 w-5 ${config.color}`} />
                      <div>
                        <p className="font-medium">
                          {new Date(record.date).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {record.class.name}
                          {record.section ? ` - ${record.section.name}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {record.remarks && (
                        <p className="text-muted-foreground hidden text-sm sm:block">
                          {record.remarks}
                        </p>
                      )}
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
