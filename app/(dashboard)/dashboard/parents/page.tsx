import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { ParentForm } from "./parent-form"
import { ParentList } from "./parent-list"

const PAGE_SIZE = 20

export default async function ParentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>
}) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const skip = (page - 1) * PAGE_SIZE
  const search = params.search || ""

  const where =
    profile.role === "SUPER_ADMIN"
      ? search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" as const } },
              { lastName: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}
      : {
          schoolId: profile.schoolId!,
          ...(search
            ? {
                OR: [
                  { firstName: { contains: search, mode: "insensitive" as const } },
                  { lastName: { contains: search, mode: "insensitive" as const } },
                ],
              }
            : {}),
        }

  const [parents, total] = await Promise.all([
    prisma.parent.findMany({
      where,
      include: {
        students: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true, admissionNo: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.parent.count({ where }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Parents</h2>
        <p className="text-muted-foreground">Manage parents and their linked students</p>
      </div>
      <ParentForm />
      <ParentList
        parents={JSON.parse(JSON.stringify(parents))}
        total={total}
        page={page}
        totalPages={totalPages}
        search={search}
      />
    </div>
  )
}
