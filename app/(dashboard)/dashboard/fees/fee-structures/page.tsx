import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { FeeStructureList } from "./fee-structure-list"

export default async function FeeStructuresPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT")
  const params = await searchParams
  const page = parseInt(params.page || "1")
  const pageSize = 10

  const where: any = {}
  if (profile.role !== "SUPER_ADMIN") {
    where.schoolId = profile.schoolId!
    if (profile.branchId) where.branchId = profile.branchId!
  }

  const [feeStructures, total] = await Promise.all([
    prisma.feeStructure.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.feeStructure.count({ where }),
  ])

  return (
    <FeeStructureList
      feeStructures={JSON.parse(JSON.stringify(feeStructures))}
      total={total}
      page={page}
      pageSize={pageSize}
      profile={JSON.parse(JSON.stringify(profile))}
    />
  )
}
