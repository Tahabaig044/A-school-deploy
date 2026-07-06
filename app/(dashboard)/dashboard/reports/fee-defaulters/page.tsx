import { requireRole } from "@/lib/auth"
import { getFeeDefaulterReport } from "@/actions/reports.actions"
import { FeeDefaulterReportView } from "./fee-defaulter-report-view"

export default async function FeeDefaulterReportPage() {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT")

  const data = await getFeeDefaulterReport(
    profile.schoolId!,
    profile.branchId || undefined
  )

  return (
    <FeeDefaulterReportView
      data={data}
      profile={JSON.parse(JSON.stringify(profile))}
    />
  )
}
