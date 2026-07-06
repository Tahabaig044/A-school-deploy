import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { HomeworkList } from "./homework-list"

export default async function HomeworkPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "STUDENT")
  const params = await searchParams
  const page = parseInt(params.page || "1")
  const pageSize = 10

  const where: any = {}
  if (profile.role !== "SUPER_ADMIN") {
    where.schoolId = profile.schoolId!
    if (profile.branchId) where.branchId = profile.branchId!
  }

  const [homework, total] = await Promise.all([
    prisma.homework.findMany({
      where,
      include: {
        class: true,
        section: true,
        subject: true,
        teacher: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: { dueDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.homework.count({ where }),
  ])

  return (
    <HomeworkList
      homework={JSON.parse(JSON.stringify(homework))}
      total={total}
      page={page}
      pageSize={pageSize}
      profile={JSON.parse(JSON.stringify(profile))}
    />
  )
}
