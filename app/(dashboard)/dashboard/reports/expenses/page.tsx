import { requireRole } from "@/lib/auth"
import { getExpenseReport } from "@/actions/reports.actions"
import { ExpenseReportView } from "./expense-report-view"

export default async function ExpenseReportPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT")
  const params = await searchParams

  const data = await getExpenseReport(
    profile.schoolId!,
    profile.branchId || undefined,
    params.fromDate || undefined,
    params.toDate || undefined
  )

  return (
    <ExpenseReportView
      data={data}
      profile={JSON.parse(JSON.stringify(profile))}
    />
  )
}
