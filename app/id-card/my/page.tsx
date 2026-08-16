import { redirect } from "next/navigation"
import { IdCardDisplay } from "@/components/id-card/id-card-display"
import { getMyIdCardAction } from "@/actions/id-card.actions"

export default async function MyIdCardPage() {
  const data = await getMyIdCardAction()
  if (!data) redirect("/dashboard")

  return (
    <IdCardDisplay
      data={data}
      pdfHref={`/api/id-card/pdf?self=1`}
      title="My ID Card"
      description="Your official role-based ID card"
    />
  )
}
