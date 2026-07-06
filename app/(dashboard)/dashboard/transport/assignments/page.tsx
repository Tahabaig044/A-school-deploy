import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { AssignmentList } from "./assignment-list"

export default async function TransportAssignmentsPage() {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const where: any = {}
  if (profile.role !== "SUPER_ADMIN") {
    where.route = { schoolId: profile.schoolId!, branchId: profile.branchId! }
  }

  const assignments = await prisma.studentTransport.findMany({
    where,
    include: {
      student: { select: { id: true, firstName: true, lastName: true, admissionNo: true } },
      route: true,
      vehicle: { select: { id: true, plateNumber: true, vehicleType: true } },
    },
    orderBy: { student: { firstName: "asc" } },
  })

  return (
    <AssignmentList
      assignments={JSON.parse(JSON.stringify(assignments))}
      profile={JSON.parse(JSON.stringify(profile))}
    />
  )
}
