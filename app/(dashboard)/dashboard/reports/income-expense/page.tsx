import { requireRole } from "@/lib/auth"
import { getIncomeVsExpenseReport } from "@/actions/reports.actions"
import { IncomeExpenseReportView } from "./income-expense-report-view"

export default async function IncomeExpenseReportPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT")
  const params = await searchParams

  const data = await getIncomeVsExpenseReport(
    profile.schoolId!,
    profile.branchId || undefined,
    params.fromDate || undefined,
    params.toDate || undefined
  )

  return (
    <IncomeExpenseReportView
      data={data}
      profile={JSON.parse(JSON.stringify(profile))}
    />
  )
}
