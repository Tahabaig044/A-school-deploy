import { requireRole } from "@/lib/auth"
import { PageHeader } from "@/components/shared/page-header"
import { QuestionBankList } from "./question-bank-list"
import { QuestionForm } from "./question-form"
import { getQuestionBank } from "@/actions/question-bank.actions"

export default async function QuestionBankPage() {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")

  const questions = await getQuestionBank({})

  return (
    <div className="space-y-6">
      <PageHeader
        title="Question Bank"
        description="Manage questions for online examinations"
      >
        <QuestionForm />
      </PageHeader>
      <QuestionBankList questions={questions} />
    </div>
  )
}
