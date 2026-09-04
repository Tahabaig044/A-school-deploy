import { redirect } from "next/navigation"
import { getCurrentUser, getCurrentProfile } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/shared/loading-skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  GraduationCap,
  ClipboardCheck,
  CalendarClock,
  Users,
  MessageSquare,
  Award,
  ClipboardList,
  BookOpen,
  Megaphone,
  UserCheck,
  Clock,
  MapPin,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Plus,
} from "lucide-react"
import Link from "next/link"
import { getTeacherDashboardStats } from "@/actions/teacher-portal.actions"

async function TeacherPortalContent() {
  const user = await getCurrentUser()
  const profile = await getCurrentProfile()

  if (!user || !profile) redirect("/login")
  if (profile.role !== "TEACHER") {
    if (profile.role === "STUDENT") redirect("/portal/student")
    if (profile.role === "PARENT") redirect("/portal/parent")
    redirect("/dashboard")
  }

  const userId = user.id

  if (!profile || profile.status !== "ACTIVE" || !profile.isActive) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <h1 className="text-destructive text-2xl font-bold">Account Not Active</h1>
          <p className="text-muted-foreground">
            Your account is not active. Please contact administration.
          </p>
          <a href="/login" className="text-primary underline">
            Return to Login
          </a>
        </div>
      </div>
    )
  }

  const teacher = await prisma.teacher.findFirst({
    where: { profileId: userId },
  })

  if (!teacher) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <h1 className="text-destructive text-2xl font-bold">Teacher Record Not Found</h1>
          <p className="text-muted-foreground">
            Your teacher profile could not be found. Please contact administration.
          </p>
          <a href="/login" className="text-primary underline">
            Return to Login
          </a>
        </div>
      </div>
    )
  }

  const data = await getTeacherDashboardStats()
  const stats = data?.stats
  const todaySlots = data?.todaySlots || []
  const announcements = data?.announcements || []
  const meetings = data?.meetings || []
  const assignments = data?.assignments || []

  const dayNames = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]
  const todayName = dayNames[new Date().getDay()]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            Welcome, {profile.firstName}!
          </h2>
          <p className="text-muted-foreground text-sm">
            Teacher Dashboard — {todayName.charAt(0) + todayName.slice(1).toLowerCase()}
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/portal/teacher/attendance">
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Mark Attendance
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/portal/teacher/classes">
          <Card className="hover:bg-accent transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Classes</CardTitle>
              <GraduationCap className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.classCount || 0}</div>
              <p className="text-muted-foreground text-xs">Assigned classes</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/portal/teacher/students">
          <Card className="hover:bg-accent transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Students</CardTitle>
              <Users className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalStudents || 0}</div>
              <p className="text-muted-foreground text-xs">Total students</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/portal/teacher/homework">
          <Card className="hover:bg-accent transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Homework</CardTitle>
              <BookOpen className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingHomework || 0}</div>
              <p className="text-muted-foreground text-xs">
                Active {stats?.overdueHomework ? `(${stats.overdueHomework} overdue)` : ""}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/portal/teacher/exams">
          <Card className="hover:bg-accent transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Exams</CardTitle>
              <ClipboardList className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.upcomingExams || 0}</div>
              <p className="text-muted-foreground text-xs">Scheduled exams</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/portal/teacher/messages">
          <Card className="hover:bg-accent transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages</CardTitle>
              <MessageSquare className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.unreadMessages || 0}</div>
              <p className="text-muted-foreground text-xs">Unread messages</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/portal/teacher/leave-requests">
          <Card className="hover:bg-accent transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Leave</CardTitle>
              <UserCheck className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingLeave || 0}</div>
              <p className="text-muted-foreground text-xs">Pending requests</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/portal/teacher/timetable">
          <Card className="hover:bg-accent transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today&apos;s Periods</CardTitle>
              <Clock className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todaySlots.length}</div>
              <p className="text-muted-foreground text-xs">
                {todaySlots.length > 0
                  ? `${todaySlots[0].startTime} - ${todaySlots[todaySlots.length - 1].endTime}`
                  : "No classes today"}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/portal/teacher/marks">
          <Card className="hover:bg-accent transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Results</CardTitle>
              <Award className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.stats?.classCount || 0}</div>
              <p className="text-muted-foreground text-xs">Classes to grade</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Today&apos;s Timetable
              <Badge variant="outline" className="ml-auto">
                {todaySlots.length} period{todaySlots.length !== 1 ? "s" : ""}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todaySlots.length === 0 ? (
              <div className="text-muted-foreground flex flex-col items-center justify-center py-8">
                <CalendarClock className="mb-2 h-8 w-8" />
                <p className="text-sm">No classes scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todaySlots.map((slot) => (
                  <div
                    key={slot.id}
                    className={`hover:bg-accent/50 flex flex-col gap-2 rounded-lg border p-2 sm:flex-row sm:items-center sm:justify-between sm:p-3 ${slot.isFree ? "bg-muted/30 border-dashed" : ""}`}
                  >
                    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                      <div className="min-w-[50px] shrink-0 text-center sm:min-w-[55px]">
                        <div className="text-sm font-bold">{slot.startTime}</div>
                        <div className="text-muted-foreground text-xs">{slot.endTime}</div>
                      </div>
                      <div className="min-w-0">
                        {slot.isFree ? (
                          <div className="flex flex-wrap items-center gap-1">
                            <Badge variant="outline" className="text-muted-foreground text-xs">
                              Free Period
                            </Badge>
                            {slot.freePeriodReason && (
                              <span className="text-muted-foreground truncate text-xs">
                                {slot.freePeriodReason}
                              </span>
                            )}
                          </div>
                        ) : (
                          <>
                            <div className="truncate text-sm font-medium">{slot.subject?.name}</div>
                            <div className="text-muted-foreground flex flex-wrap items-center gap-1 text-xs">
                              <span className="truncate">
                                {slot.class.name}
                                {slot.section ? ` - ${slot.section.name}` : ""}
                              </span>
                              {slot.room && (
                                <>
                                  <MapPin className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{slot.room}</span>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 self-end sm:gap-2 sm:self-auto">
                      {slot.isFree ? (
                        <Badge variant="secondary" className="text-xs">
                          No Attendance
                        </Badge>
                      ) : (slot as any).attendanceDone ? (
                        <>
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Done
                          </Badge>
                          <Button variant="outline" size="sm" asChild>
                            <Link
                              href={`/portal/teacher/attendance?class=${slot.classId}&date=${new Date().toISOString().split("T")[0]}`}
                            >
                              View
                            </Link>
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" asChild>
                          <Link
                            href={`/portal/teacher/attendance?class=${slot.classId}&date=${new Date().toISOString().split("T")[0]}`}
                          >
                            <ClipboardCheck className="mr-1 h-3 w-3" />
                            Start Class
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-4 w-4" />
                Announcements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {announcements.length === 0 ? (
                <p className="text-muted-foreground text-sm">No recent announcements</p>
              ) : (
                <div className="space-y-3">
                  {announcements.map((a: any) => (
                    <div key={a.id} className="border-b pb-2 text-sm last:border-0">
                      <p className="truncate font-medium">{a.title}</p>
                      <p className="text-muted-foreground text-xs">
                        {a.author.firstName} {a.author.lastName}
                      </p>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" asChild className="w-full">
                    <Link href="/portal/teacher/announcements">View All</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarClock className="h-4 w-4" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="default" size="sm" asChild>
                <Link href="/portal/teacher/homework">
                  <Plus className="mr-1 h-3 w-3" />
                  Add Homework
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/portal/teacher/attendance">Attendance</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/portal/teacher/exams">Exams</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/portal/teacher/messages">Messages</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/portal/teacher/leave-requests">Apply Leave</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function TeacherPortalPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TeacherPortalContent />
    </Suspense>
  )
}
