import { getDashboardStats } from "@/actions/reports.actions"
import { DashboardCards } from "./dashboard-cards"

const EMPTY_STATS = {
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
}

/**
 * Fetches the dashboard stats and renders the cards.
 *
 * Kept as a separate server component so the page can suspend it inside a
 * <Suspense> boundary: the shell (header, branch bar) streams immediately, and
 * the stats card grid arrives when the (cached) queries resolve, instead of the
 * whole page blocking on 17 count queries before first paint.
 */
export async function DashboardStats({
  profile,
  schoolId,
  branchId,
  branchName,
}: {
  profile: {
    firstName: string | null
    lastName: string | null
    role: string
  }
  schoolId?: string
  branchId?: string
  branchName?: string
}) {
  const stats = await getDashboardStats(schoolId, branchId).catch(() => EMPTY_STATS)

  return <DashboardCards stats={stats} profile={profile} branchName={branchName} />
}
