import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, Users, Calendar, DollarSign, FileText, TrendingUp } from "lucide-react"

export default async function ReportsPage() {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "ACCOUNTANT")

  const reports = [
    {
      title: "Student Enrollment",
      description: "Class-wise student enrollment statistics",
      href: "/dashboard/reports/enrollment",
      icon: Users,
    },
    {
      title: "Attendance Report",
      description: "Daily and monthly attendance overview",
      href: "/dashboard/reports/attendance",
      icon: Calendar,
    },
    {
      title: "Fee Collection",
      description: "Fee collection and payment statistics",
      href: "/dashboard/reports/fee-collection",
      icon: DollarSign,
    },
    {
      title: "Fee Defaulters",
      description: "Students with pending fee payments",
      href: "/dashboard/reports/fee-defaulters",
      icon: FileText,
    },
    {
      title: "Exam Performance",
      description: "Exam results and pass rates",
      href: "/dashboard/reports/exam-performance",
      icon: BarChart3,
    },
    {
      title: "Expense Report",
      description: "Expense breakdown by category",
      href: "/dashboard/reports/expenses",
      icon: TrendingUp,
    },
    {
      title: "Income vs Expense",
      description: "Monthly income and expense comparison",
      href: "/dashboard/reports/income-expense",
      icon: DollarSign,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground">View and generate school reports</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <Link key={report.href} href={report.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center gap-4">
                <report.icon className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle className="text-lg">{report.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{report.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
