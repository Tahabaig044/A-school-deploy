import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { setRequestContext, clearRequestContext } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/shared/loading-skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClipboardCheck, FileText, DollarSign, CalendarClock, MessageSquare } from "lucide-react"
import Link from "next/link"

async function StudentPortalContent() {
  const headerStore = await headers()
  const userId = headerStore.get("X-User-Id")
  const userRole = headerStore.get("X-User-Role")
  const userEmail = headerStore.get("X-User-Email")

  if (!userId || !userRole || !userEmail) redirect("/login")
  if (userRole !== "STUDENT") {
    if (userRole === "PARENT") redirect("/portal/parent")
    if (userRole === "TEACHER") redirect("/portal/teacher")
    redirect("/dashboard")
  }

  setRequestContext({
    user: { id: userId, email: userEmail },
    profile: { id: userId, role: "STUDENT" as any, schoolId: null, branchId: null, firstName: null, lastName: null, email: userEmail, phone: null },
  })

  try {
    // Validate student portal access
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { firstName: true, email: true, status: true, isActive: true },
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

    // Find student record linked to this profile by email
    let student
    try {
      student = await prisma.student.findFirst({
        where: { email: profile.email! },
        include: {
          enrollments: {
            where: { status: "ACTIVE" },
            include: { class: true, section: true },
            take: 1,
          },
        },
      })
    } catch {
      student = null
    }

    if (!student) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-destructive">Student Record Not Found</h1>
            <p className="text-muted-foreground">Your student profile could not be found. Please contact administration.</p>
            <a href="/login" className="text-primary underline">Return to Login</a>
          </div>
        </div>
      )
    }

    const [attendanceCount, examCount, feeInvoiceCount, homeworkCount, messageCount] = await Promise.all([
      prisma.studentAttendance.count({
        where: { studentId: student.id, status: "PRESENT" },
      }).catch(() => 0),
      prisma.examResult.count({
        where: { studentId: student.id },
      }).catch(() => 0),
      prisma.feeInvoice.count({
        where: { studentId: student.id, status: { in: ["PENDING", "PARTIAL"] } },
      }).catch(() => 0),
      student.enrollments[0]?.classId
        ? prisma.homework.count({
            where: {
              classId: student.enrollments[0].classId,
              isActive: true,
            },
          }).catch(() => 0)
        : 0,
      prisma.message.count({
        where: { receiverId: userId },
      }).catch(() => 0),
    ])

    const enrollment = student.enrollments[0]

    const cards = [
      { title: "Attendance", value: attendanceCount, icon: ClipboardCheck, href: "/portal/student/attendance", description: "Days present" },
      { title: "Exams", value: examCount, icon: FileText, href: "/portal/student/results", description: "Exam results" },
      { title: "Pending Fees", value: feeInvoiceCount, icon: DollarSign, href: "/portal/student/fees", description: "Unpaid invoices" },
      { title: "Homework", value: homeworkCount, icon: CalendarClock, href: "/portal/student/homework", description: "Pending assignments" },
      { title: "Messages", value: messageCount, icon: MessageSquare, href: "/portal/student/messages", description: "Unread messages" },
    ]

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Welcome, {profile.firstName}!</h2>
          <p className="text-muted-foreground">
            {enrollment
              ? `${enrollment.class.name} - Section ${enrollment.section?.name || "N/A"}`
              : "Student Portal"}
          </p>
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

export default function StudentPortalPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <StudentPortalContent />
    </Suspense>
  )
}
