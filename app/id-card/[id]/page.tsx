import { redirect } from "next/navigation"
import { IdCardDisplay } from "@/components/id-card/id-card-display"
import { getIdCardDataForUserAction } from "@/actions/id-card.actions"

export default async function UserIdCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getIdCardDataForUserAction(id)
  if (!data) redirect("/dashboard")

  return (
    <IdCardDisplay
      data={data}
      pdfHref={`/api/id-card/pdf?profileId=${encodeURIComponent(id)}`}
      title="ID Card"
      description={`${data.name}'s official ID card`}
    />
  )
}
