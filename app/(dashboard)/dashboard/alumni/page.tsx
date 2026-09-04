import { requireRole } from "@/lib/auth"
import { PageHeader } from "@/components/shared/page-header"
import { AlumniList } from "./alumni-list"
import { AlumniForm } from "./alumni-form"
import { getAlumniList } from "@/actions/alumni.actions"

export default async function AlumniPage() {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const alumni = await getAlumniList()

  return (
    <div className="space-y-6">
      <PageHeader title="Alumni" description="Manage school alumni records">
        <AlumniForm />
      </PageHeader>
      <AlumniList alumni={alumni} />
    </div>
  )
}
