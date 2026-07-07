import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { getDashboardStats } from "@/actions/reports.actions"
import { DashboardCards } from "./dashboard-cards"
import { requireRole } from "@/lib/auth"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/shared/loading-skeleton"

export default async function DashboardPage() {
  const { profile } = await requireRole(
    "SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PARENT",
    "PRINCIPAL", "ACCOUNTANT", "ADMISSION_OFFICER", "LIBRARIAN", "TRANSPORT_MANAGER"
  )

  const cookieStore = await cookies()
  const selectedBranch = cookieStore.get("selected_branch")?.value

  const [branch, statsResult] = await Promise.all([
    selectedBranch
      ? prisma.branch.findUnique({ where: { id: selectedBranch }, select: { name: true } })
      : Promise.resolve(null),
    getDashboardStats(
      profile.schoolId || undefined,
      selectedBranch || profile.branchId || undefined
    ).catch(() => ({
      totalStudents: 0,
      totalTeachers: 0,
      todayAttendance: 0,
      monthlyFeeCollection: 0,
      pendingFeeAmount: 0,
      newAdmissions: 0,
      pendingLeaveRequests: 0,
      upcomingExams: 0,
    })),
  ])

  return (
    <div className="space-y-6">
      <Suspense fallback={<PageSkeleton />}>
        <DashboardCards
          stats={statsResult}
          profile={profile}
          branchName={branch?.name}
        />
      </Suspense>
    </div>
  )
}
