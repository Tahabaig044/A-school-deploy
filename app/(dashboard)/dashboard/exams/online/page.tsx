import { requireRole } from "@/lib/auth"
import { PageHeader } from "@/components/shared/page-header"
import { OnlineExamList } from "./online-exam-list"
import { getOnlineExams } from "@/actions/online-exam.actions"

export default async function OnlineExamsPage() {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "STUDENT")

  const exams = await getOnlineExams()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Online Exams"
        description="Create and manage online examinations"
      />
      <OnlineExamList exams={exams} />
    </div>
  )
}
