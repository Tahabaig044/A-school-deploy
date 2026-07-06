import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { VehicleList } from "./vehicle-list"

export default async function VehiclesPage() {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const where: any = {}
  if (profile.role !== "SUPER_ADMIN") {
    where.schoolId = profile.schoolId!
    if (profile.branchId) where.branchId = profile.branchId!
  }

  const vehicles = await prisma.vehicle.findMany({
    where,
    include: {
      _count: { select: { routes: true, assignments: true } },
    },
    orderBy: { plateNumber: "asc" },
  })

  return (
    <VehicleList
      vehicles={JSON.parse(JSON.stringify(vehicles))}
      profile={JSON.parse(JSON.stringify(profile))}
    />
  )
}
