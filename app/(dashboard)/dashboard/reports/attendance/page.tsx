import { requireRole } from "@/lib/auth"
import { getAttendanceReport } from "@/actions/reports.actions"
import { AttendanceReportView } from "./attendance-report-view"

export default async function AttendanceReportPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")
  const params = await searchParams

  const data = await getAttendanceReport(
    profile.schoolId!,
    profile.branchId || undefined,
    params.fromDate || undefined,
    params.toDate || undefined
  )

  return (
    <AttendanceReportView
      data={data}
      profile={JSON.parse(JSON.stringify(profile))}
    />
  )
}
