import { requireRole } from "@/lib/auth"
import { getStudentEnrollmentReport } from "@/actions/reports.actions"
import { EnrollmentReportView } from "./enrollment-report-view"

export default async function EnrollmentReportPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")
  const params = await searchParams

  const data = await getStudentEnrollmentReport(
    profile.schoolId!,
    profile.branchId || undefined,
    params.academicSessionId || undefined,
  )

  return <EnrollmentReportView data={data} profile={JSON.parse(JSON.stringify(profile))} />
}
