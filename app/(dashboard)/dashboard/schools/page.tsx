import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { SchoolForm } from "./school-form"
import { SchoolList } from "./school-list"

const PAGE_SIZE = 20

export default async function SchoolsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  await requireRole("SUPER_ADMIN")
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const [schools, total] = await Promise.all([
    prisma.school.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        phone: true,
        email: true,
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.school.count(),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Schools</h2>
        <p className="text-muted-foreground">Manage all schools in the system</p>
      </div>
      <SchoolForm />
      <SchoolList schools={schools} total={total} page={page} totalPages={totalPages} />
    </div>
  )
}
