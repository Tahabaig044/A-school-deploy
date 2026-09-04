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
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "TEACHER",
    "PARENT",
    "PRINCIPAL",
    "ACCOUNTANT",
    "ADMISSION_OFFICER",
    "LIBRARIAN",
    "TRANSPORT_MANAGER",
  )

  const cookieStore = await cookies()
  const selectedBranch = cookieStore.get("selected_branch")?.value

  let branch: { id: string; name: string } | null = null
  if (selectedBranch) {
    branch = await prisma.branch.findFirst({
      where: {
        id: selectedBranch,
        ...(profile.schoolId ? { schoolId: profile.schoolId } : {}),
        isActive: true,
      },
      select: { id: true, name: true },
    })
  }

  const effectiveBranchId = branch?.id || profile.branchId || undefined

  const [statsResult] = await Promise.all([
    getDashboardStats(profile.schoolId || undefined, effectiveBranchId).catch(() => ({
      totalStudents: 0,
      totalTeachers: 0,
      totalParents: 0,
      totalClasses: 0,
      totalSections: 0,
      todayAttendance: 0,
      attendanceRate: 0,
      totalStudentsCount: 0,
      monthlyFeeCollection: 0,
      pendingFeeAmount: 0,
      newAdmissions: 0,
      pendingLeaveRequests: 0,
      upcomingExams: 0,
      teachersOnLeave: 0,
      upcomingMeetings: 0,
      unreadNotifications: 0,
      timetableConflicts: 0,
    })),
  ])

  return (
    <div className="space-y-6">
      <Suspense fallback={<PageSkeleton />}>
        <DashboardCards stats={statsResult} profile={profile} branchName={branch?.name} />
      </Suspense>
    </div>
  )
}
