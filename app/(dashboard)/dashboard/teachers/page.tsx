import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { TeacherForm } from "./teacher-form"
import { TeacherList } from "./teacher-list"

const PAGE_SIZE = 20

export default async function TeachersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>
}) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL")
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
          branchId: profile.branchId!,
          ...(search
            ? {
                OR: [
                  { firstName: { contains: search, mode: "insensitive" as const } },
                  { lastName: { contains: search, mode: "insensitive" as const } },
                ],
              }
            : {}),
        }

  const [teachers, total] = await Promise.all([
    prisma.teacher.findMany({
      where,
      include: { school: true, assignments: { include: { class: true, subject: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.teacher.count({ where }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Teachers</h2>
        <p className="text-muted-foreground">Manage teachers and their assignments</p>
      </div>
      <TeacherForm />
      <TeacherList
        teachers={JSON.parse(JSON.stringify(teachers))}
        total={total}
        page={page}
        totalPages={totalPages}
      />
    </div>
  )
}
