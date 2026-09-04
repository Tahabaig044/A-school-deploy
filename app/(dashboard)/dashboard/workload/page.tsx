import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import {
  getTeacherWorkload,
  getDepartmentWorkload,
  getClassDistribution,
  getWorkloadDefaults,
} from "@/actions/workload.actions"
import { WorkloadDashboard } from "./workload-dashboard"

export default async function WorkloadPage() {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL")

  const schoolId = profile.schoolId!
  const activeSession = await prisma.academicSession.findFirst({
    where: { schoolId, isCurrent: true },
    select: { id: true, name: true },
  })
  const sessionId = activeSession?.id

  const [teachers, departments, classDistribution, defaults] = await Promise.all([
    getTeacherWorkload(schoolId, sessionId),
    getDepartmentWorkload(schoolId, sessionId),
    getClassDistribution(schoolId, sessionId),
    getWorkloadDefaults(schoolId),
  ])

  const totalPeriods = teachers.reduce((s, t) => s + t.totalPeriods, 0)
  const overloadedCount = teachers.filter((t) => t.isOverloaded).length
  const underloadedCount = teachers.filter((t) => t.isUnderloaded).length

  return (
    <WorkloadDashboard
      teachers={JSON.parse(JSON.stringify(teachers))}
      departments={JSON.parse(JSON.stringify(departments))}
      classDistribution={JSON.parse(JSON.stringify(classDistribution))}
      defaults={defaults}
      schoolId={schoolId}
      sessionName={activeSession?.name || "N/A"}
      totalPeriods={totalPeriods}
      overloadedCount={overloadedCount}
      underloadedCount={underloadedCount}
    />
  )
}
