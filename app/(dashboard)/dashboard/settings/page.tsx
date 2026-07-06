import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { PageHeader } from "@/components/shared/page-header"
import { SettingsForm } from "./settings-form"

export default async function SettingsPage() {
  const { profile } = await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN"
  )

  const school = profile.schoolId
    ? await prisma.school.findUnique({
        where: { id: profile.schoolId },
        select: {
          id: true,
          name: true,
          code: true,
          address: true,
          phone: true,
          email: true,
        },
      })
    : null

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Settings"
        description="Manage school profile and application settings"
      />
      <SettingsForm school={school} profileRole={profile.role} />
    </div>
  )
}
