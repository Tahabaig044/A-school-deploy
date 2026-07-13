import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { PageHeader } from "@/components/shared/page-header"
import { SettingsForm } from "./settings-form"
import { AttendancePolicyForm } from "./attendance-policy-form"
import { getAttendancePolicy } from "@/actions/attendance-settings.actions"

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

  const attendancePolicy = profile.schoolId
    ? await getAttendancePolicy(profile.schoolId)
    : "first_period_teacher"

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Settings"
        description="Manage school profile and application settings"
      />
      <SettingsForm school={school} profileRole={profile.role} />
      <AttendancePolicyForm currentPolicy={attendancePolicy} />
    </div>
  )
}
