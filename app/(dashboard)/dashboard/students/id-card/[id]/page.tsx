import { redirect } from "next/navigation"
import { IdCardDisplay } from "@/components/id-card/id-card-display"
import { getStudentIdCardDataAction } from "@/actions/id-card.actions"

export default async function SingleIdCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const data = await getStudentIdCardDataAction(id)
  if (!data) {
    redirect("/dashboard/students/id-cards")
  }

  return (
    <IdCardDisplay
      data={data}
      pdfHref={`/api/id-card/pdf?studentId=${encodeURIComponent(id)}`}
      title="Student ID Card"
      description={`${data.name}'s official ID card`}
    />
  )
}
