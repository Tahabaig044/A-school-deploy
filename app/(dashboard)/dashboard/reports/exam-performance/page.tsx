import { requireRole } from "@/lib/auth"
import { getExamPerformanceReport } from "@/actions/reports.actions"
import { ExamPerformanceReportView } from "./exam-performance-report-view"

export default async function ExamPerformanceReportPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")
  const params = await searchParams

  const data = await getExamPerformanceReport(
    profile.schoolId!,
    profile.branchId || undefined,
    params.examId || undefined,
  )

  return <ExamPerformanceReportView data={data} profile={JSON.parse(JSON.stringify(profile))} />
}
