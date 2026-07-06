import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClipboardCheck, FileText, DollarSign, CalendarClock, MessageSquare } from "lucide-react"
import Link from "next/link"

export default async function StudentPortalPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile || profile.role !== "STUDENT") {
    if (profile?.role === "PARENT") redirect("/portal/parent")
    if (profile?.role === "TEACHER") redirect("/portal/teacher")
    redirect("/dashboard")
  }

  let student
  try {
    student = await prisma.student.findFirst({
      where: { email: user.email },
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

  // Get counts
  const [attendanceCount, examCount, feeInvoiceCount, homeworkCount, messageCount] = await Promise.all([
    student?.id
      ? prisma.studentAttendance.count({
          where: { studentId: student.id, status: "PRESENT" },
        }).catch(() => 0)
      : 0,
    student?.id
      ? prisma.examResult.count({
          where: { studentId: student.id },
        }).catch(() => 0)
      : 0,
    student?.id
      ? prisma.feeInvoice.count({
          where: { studentId: student.id, status: { in: ["PENDING", "PARTIAL"] } },
        }).catch(() => 0)
      : 0,
    student?.enrollments[0]?.classId
      ? prisma.homework.count({
          where: {
            classId: student.enrollments[0].classId,
            isActive: true,
          },
        }).catch(() => 0)
      : 0,
    prisma.message.count({
      where: { receiverId: user.id },
    }).catch(() => 0),
  ])

  const enrollment = student?.enrollments[0]

  const cards = [
    {
      title: "Attendance",
      value: attendanceCount,
      icon: ClipboardCheck,
      href: "/portal/student/attendance",
      description: "Days present",
    },
    {
      title: "Exams",
      value: examCount,
      icon: FileText,
      href: "/portal/student/exams",
      description: "Exam results",
    },
    {
      title: "Pending Fees",
      value: feeInvoiceCount,
      icon: DollarSign,
      href: "/portal/student/fees",
      description: "Unpaid invoices",
    },
    {
      title: "Homework",
      value: homeworkCount,
      icon: CalendarClock,
      href: "/portal/student/homework",
      description: "Pending assignments",
    },
    {
      title: "Messages",
      value: messageCount,
      icon: MessageSquare,
      href: "/portal/student/messages",
      description: "Unread messages",
    },
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
}
