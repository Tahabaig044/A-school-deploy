import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { ClassForm } from "./class-form"
import { ClassList } from "./class-list"

const PAGE_SIZE = 20

export default async function ClassesPage({
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

  const [classes, total] = await Promise.all([
    prisma.class.findMany({
      where,
      include: { sections: true, school: true },
      orderBy: { order: "asc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.class.count({ where }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Classes</h2>
        <p className="text-muted-foreground">Manage classes and sections</p>
      </div>
      <ClassForm />
      <ClassList classes={classes} total={total} page={page} totalPages={totalPages} />
    </div>
  )
}
