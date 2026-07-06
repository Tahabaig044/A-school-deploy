import { requireRole } from "@/lib/auth"
import { getFeeCollectionReport } from "@/actions/reports.actions"
import { FeeCollectionReportView } from "./fee-collection-report-view"

export default async function FeeCollectionReportPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT")
  const params = await searchParams

  const data = await getFeeCollectionReport(
    profile.schoolId!,
    profile.branchId || undefined,
    params.fromDate || undefined,
    params.toDate || undefined
  )

  return (
    <FeeCollectionReportView
      data={data}
      profile={JSON.parse(JSON.stringify(profile))}
    />
  )
}
