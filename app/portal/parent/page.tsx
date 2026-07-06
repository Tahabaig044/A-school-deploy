import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, DollarSign, FileText, MessageSquare } from "lucide-react"
import Link from "next/link"

export default async function ParentPortalPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile || profile.role !== "PARENT") {
    if (profile?.role === "STUDENT") redirect("/portal/student")
    if (profile?.role === "TEACHER") redirect("/portal/teacher")
    redirect("/dashboard")
  }

  // Find parent record linked to this profile by email
  let parent
  try {
    parent = await prisma.parent.findFirst({
      where: { email: user.email },
      include: {
        students: {
          include: {
            student: {
              include: {
                enrollments: {
                  where: { status: "ACTIVE" },
                  include: { class: true, section: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    })
  } catch {
    parent = null
  }

  const children = parent?.students.map((sp) => sp.student) || []

  // Get counts for all children
  const childIds = children.map((s) => s.id)

  const [feeInvoiceCount, messageCount, announcementCount] = await Promise.all([
    childIds.length > 0
      ? prisma.feeInvoice.count({
          where: { studentId: { in: childIds }, status: { in: ["PENDING", "PARTIAL"] } },
        }).catch(() => 0)
      : 0,
    prisma.message.count({
      where: { receiverId: user.id },
    }).catch(() => 0),
    prisma.announcement.count({
      where: { isPublished: true },
    }).catch(() => 0),
  ])

  const cards = [
    {
      title: "My Children",
      value: children.length,
      icon: Users,
      href: "/portal/parent/children",
      description: "Enrolled students",
    },
    {
      title: "Pending Fees",
      value: feeInvoiceCount,
      icon: DollarSign,
      href: "/portal/parent/fees",
      description: "Unpaid invoices",
    },
    {
      title: "Announcements",
      value: announcementCount,
      icon: FileText,
      href: "/portal/parent/announcements",
      description: "Active announcements",
    },
    {
      title: "Messages",
      value: messageCount,
      icon: MessageSquare,
      href: "/portal/parent/messages",
      description: "Unread messages",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Welcome, {profile.firstName}!</h2>
        <p className="text-muted-foreground">Parent Portal</p>
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

      {children.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Your Children</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {children.map((child) => (
              <Card key={child.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {child.firstName} {child.lastName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {child.enrollments[0]
                      ? `${child.enrollments[0].class.name} - ${child.enrollments[0].section?.name || "N/A"}`
                      : "No active enrollment"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Admission No: {child.admissionNo}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
