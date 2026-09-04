import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { StaffForm } from "./staff-form"
import { StaffList } from "./staff-list"

const PAGE_SIZE = 20

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const where =
    profile.role === "SUPER_ADMIN"
      ? {}
      : { schoolId: profile.schoolId!, branchId: profile.branchId! }

  const [staff, total] = await Promise.all([
    prisma.staff.findMany({
      where,
      include: { school: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.staff.count({ where }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Staff</h2>
        <p className="text-muted-foreground">Manage non-teaching staff</p>
      </div>
      <StaffForm />
      <StaffList
        staff={JSON.parse(JSON.stringify(staff))}
        total={total}
        page={page}
        totalPages={totalPages}
      />
    </div>
  )
}
