import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { setRequestContext, clearRequestContext } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/shared/loading-skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GraduationCap, ClipboardCheck, CalendarClock, Users, MessageSquare, Award, ClipboardList, BookOpen, Megaphone, UserCheck } from "lucide-react"
import Link from "next/link"

async function TeacherPortalContent() {
  const headerStore = await headers()
  const userId = headerStore.get("X-User-Id")
  const userRole = headerStore.get("X-User-Role")
  const userEmail = headerStore.get("X-User-Email")

  if (!userId || !userRole || !userEmail) redirect("/login")
  if (userRole !== "TEACHER") {
    if (userRole === "STUDENT") redirect("/portal/student")
    if (userRole === "PARENT") redirect("/portal/parent")
    redirect("/dashboard")
  }

  setRequestContext({
    user: { id: userId, email: userEmail },
    profile: { id: userId, role: "TEACHER" as any, schoolId: null, branchId: null, firstName: null, lastName: null, email: userEmail, phone: null },
  })

  try {
    // Validate teacher portal access
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { firstName: true, status: true, isActive: true },
    })

    if (!profile || profile.status !== "ACTIVE" || !profile.isActive) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-destructive">Account Not Active</h1>
            <p className="text-muted-foreground">Your account is not active. Please contact administration.</p>
            <a href="/login" className="text-primary underline">Return to Login</a>
          </div>
        </div>
      )
    }

    // Find teacher record linked to this profile
    let teacher
    try {
      teacher = await prisma.teacher.findFirst({
        where: { profileId: userId },
      })
    } catch {
      teacher = null
    }

    if (!teacher) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-destructive">Teacher Record Not Found</h1>
            <p className="text-muted-foreground">Your teacher profile could not be found. Please contact administration.</p>
            <a href="/login" className="text-primary underline">Return to Login</a>
          </div>
        </div>
      )
    }

    const [classCount, studentCount, homeworkCount, messageCount, leaveCount, examCount] = await Promise.all([
      prisma.class.count({
        where: {
          sections: {
            some: {
              timetableSlots: {
                some: { teacherId: teacher.id },
              },
            },
          },
        },
      }).catch(() => 0),
      prisma.student.count({
        where: {
          enrollments: {
            some: {
              class: {
                sections: {
                  some: {
                    timetableSlots: {
                      some: { teacherId: teacher.id },
                    },
                  },
                },
              },
              status: "ACTIVE",
            },
          },
        },
      }).catch(() => 0),
      prisma.homework.count({
        where: { teacherId: teacher.id, isActive: true },
      }).catch(() => 0),
      prisma.message.count({
        where: { receiverId: userId },
      }).catch(() => 0),
      prisma.leaveRequest.count({
        where: { profileId: userId, status: "PENDING" },
      }).catch(() => 0),
      prisma.exam.count({
        where: {
          class: {
            sections: {
              some: {
                timetableSlots: { some: { teacherId: teacher.id } },
              },
            },
          },
        },
      }).catch(() => 0),
    ])

    const cards = [
      { title: "My Classes", value: classCount, icon: GraduationCap, href: "/portal/teacher/classes", description: "Assigned classes" },
      { title: "My Students", value: studentCount, icon: Users, href: "/portal/teacher/students", description: "Total students" },
      { title: "Assignments", value: homeworkCount, icon: CalendarClock, href: "/portal/teacher/assignments", description: "Active assignments" },
      { title: "Exams", value: examCount, icon: ClipboardList, href: "/portal/teacher/exams", description: "Scheduled exams" },
      { title: "Messages", value: messageCount, icon: MessageSquare, href: "/portal/teacher/messages", description: "Unread messages" },
      { title: "Leave Requests", value: leaveCount, icon: UserCheck, href: "/portal/teacher/leave-requests", description: "Pending requests" },
    ]

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Welcome, {profile.firstName}!</h2>
          <p className="text-muted-foreground">Teacher Portal</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Link key={card.title} href={card.href}>
              <Card className="transition-colors hover:bg-accent">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                  <card.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value}</div>
                  <p className="text-xs text-muted-foreground">{card.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    )
  } finally {
    clearRequestContext()
  }
}

export default function TeacherPortalPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TeacherPortalContent />
    </Suspense>
  )
}
