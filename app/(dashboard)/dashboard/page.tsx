import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { getDashboardStats } from "@/actions/reports.actions"
import { DashboardCards } from "./dashboard-cards"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
  })

  if (!profile) {
    redirect("/login")
  }

  const cookieStore = await cookies()
  const selectedBranch = cookieStore.get("selected_branch")?.value

  const branch = selectedBranch
    ? await prisma.branch.findUnique({ where: { id: selectedBranch } })
    : null

  let stats
  try {
    stats = await getDashboardStats(
      profile.schoolId || undefined,
      selectedBranch || profile.branchId || undefined
    )
  } catch {
    stats = {
      totalStudents: 0,
      totalTeachers: 0,
      todayAttendance: 0,
      monthlyFeeCollection: 0,
      pendingFeeAmount: 0,
      newAdmissions: 0,
      pendingLeaveRequests: 0,
      upcomingExams: 0,
    }
  }

  return (
    <div className="space-y-6">
      <DashboardCards
        stats={stats}
        profile={JSON.parse(JSON.stringify(profile))}
        branchName={branch?.name}
      />
    </div>
  )
}
