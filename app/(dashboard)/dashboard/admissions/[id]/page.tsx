import { notFound } from "next/navigation"
import { getAdmissionById } from "@/actions/admission.actions"
import { AdmissionDetail } from "./admission-detail"

export default async function AdmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admission = await getAdmissionById(id)

  if (!admission) {
    notFound()
  }

  return <AdmissionDetail admission={JSON.parse(JSON.stringify(admission))} />
}
