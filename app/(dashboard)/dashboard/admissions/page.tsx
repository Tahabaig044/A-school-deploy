import { getAdmissions } from "@/actions/admission.actions"
import { AdmissionList } from "./admission-list"

export default async function AdmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const status = params.status || "ALL"
  const search = params.search || ""
  const classId = params.classId || ""

  const { admissions, total } = await getAdmissions({
    status,
    classId,
    search,
    page,
    pageSize: 20,
  })

  return (
    <AdmissionList
      admissions={admissions}
      total={total}
      page={page}
      status={status}
      search={search}
      classId={classId}
    />
  )
}
