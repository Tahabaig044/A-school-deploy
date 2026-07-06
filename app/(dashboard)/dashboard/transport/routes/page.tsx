import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { RouteList } from "./route-list"

export default async function TransportRoutesPage() {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const where: any = {}
  if (profile.role !== "SUPER_ADMIN") {
    where.schoolId = profile.schoolId!
    if (profile.branchId) where.branchId = profile.branchId!
  }

  const routes = await prisma.transportRoute.findMany({
    where,
    include: {
      vehicle: { select: { id: true, plateNumber: true, vehicleType: true } },
      _count: { select: { assignments: true } },
    },
    orderBy: { name: "asc" },
  })

  return (
    <RouteList
      routes={JSON.parse(JSON.stringify(routes))}
      profile={JSON.parse(JSON.stringify(profile))}
    />
  )
}
