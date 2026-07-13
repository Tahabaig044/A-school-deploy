import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Users, GraduationCap, CalendarCheck, DollarSign, AlertCircle, UserPlus, Clock, FileText,
  Building2, UserCheck, CalendarClock, Bell, AlertTriangle, Layers, HeartHandshake,
} from "lucide-react"
import Link from "next/link"

type DashboardStats = {
  totalStudents: number
  totalTeachers: number
  totalParents: number
  totalClasses: number
  totalSections: number
  todayAttendance: number
  attendanceRate: number
  totalStudentsCount: number
  monthlyFeeCollection: number
  pendingFeeAmount: number
  newAdmissions: number
  pendingLeaveRequests: number
  upcomingExams: number
  teachersOnLeave: number
  upcomingMeetings: number
  unreadNotifications: number
  timetableConflicts: number
}

type DashboardProfile = {
  firstName: string | null
  lastName: string | null
  role: string
}

export function DashboardCards({
  stats,
  profile,
  branchName,
}: {
  stats: DashboardStats
  profile: DashboardProfile
  branchName?: string
}) {
  const isAdmin = ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL"].includes(profile.role)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {profile?.firstName || profile?.lastName || "User"}
          {branchName ? ` — ${branchName}` : ""}
        </p>
      </div>

      {isAdmin && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalStudents}</div>
                <p className="text-xs text-muted-foreground">Active students</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTeachers}</div>
                <p className="text-xs text-muted-foreground">Active teachers</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Parents</CardTitle>
                <HeartHandshake className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalParents}</div>
                <p className="text-xs text-muted-foreground">Registered parents</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Classes / Sections</CardTitle>
                <Layers className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalClasses} / {stats.totalSections}</div>
                <p className="text-xs text-muted-foreground">Classes and sections</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today&apos;s Attendance</CardTitle>
                <CalendarCheck className={`h-4 w-4 ${stats.attendanceRate >= 75 ? "text-green-500" : stats.attendanceRate >= 50 ? "text-yellow-500" : "text-red-500"}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.todayAttendance}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.attendanceRate}% of {stats.totalStudentsCount} total students
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Fee Amount</CardTitle>
                <AlertCircle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">${stats.pendingFeeAmount.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Outstanding fees</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Fee Collection</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${stats.monthlyFeeCollection.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Collected this month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Exams</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.upcomingExams}</div>
                <p className="text-xs text-muted-foreground">Scheduled exams</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className={stats.timetableConflicts > 0 ? "border-destructive/50" : ""}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Timetable Conflicts</CardTitle>
                <AlertTriangle className={`h-4 w-4 ${stats.timetableConflicts > 0 ? "text-destructive" : "text-muted-foreground"}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stats.timetableConflicts > 0 ? "text-destructive" : ""}`}>
                  {stats.timetableConflicts}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.timetableConflicts > 0 ? "Conflicts detected!" : "No conflicts"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Teachers on Leave</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.teachersOnLeave}</div>
                <p className="text-xs text-muted-foreground">Currently on leave</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Meetings</CardTitle>
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.upcomingMeetings}</div>
                <p className="text-xs text-muted-foreground">Scheduled meetings</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Admissions</CardTitle>
                <UserPlus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.newAdmissions}</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  Pending Leave Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingLeaveRequests}</div>
                <p className="text-xs text-muted-foreground mb-3">Awaiting approval</p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/leaves">View Leaves</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Bell className="h-4 w-4" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.unreadNotifications}</div>
                <p className="text-xs text-muted-foreground mb-3">Unread notifications</p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/notifications">View Notifications</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button variant="default" size="sm" asChild>
                  <Link href="/dashboard/students/new">Add Student</Link>
                </Button>
                <Button variant="default" size="sm" asChild>
                  <Link href="/dashboard/teachers">Add Teacher</Link>
                </Button>
                <Button variant="default" size="sm" asChild>
                  <Link href="/dashboard/attendance">Mark Attendance</Link>
                </Button>
                <Button variant="default" size="sm" asChild>
                  <Link href="/dashboard/timetable">Timetable</Link>
                </Button>
                <Button variant="default" size="sm" asChild>
                  <Link href="/dashboard/exams">Exams</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {!isAdmin && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStudents}</div>
              <p className="text-xs text-muted-foreground">Active students</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today&apos;s Attendance</CardTitle>
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayAttendance}</div>
              <p className="text-xs text-muted-foreground">Students present today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Fee Amount</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">${stats.pendingFeeAmount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Outstanding fees</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Exams</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcomingExams}</div>
              <p className="text-xs text-muted-foreground">Scheduled exams</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
