import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { ExamList } from "./exam-list"

export default async function ExamsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")
  const params = await searchParams
  const page = parseInt(params.page || "1")
  const pageSize = 10

  const where: any = {}
  if (profile.role !== "SUPER_ADMIN") {
    where.schoolId = profile.schoolId!
    if (profile.branchId) where.branchId = profile.branchId!
  }

  const [exams, total] = await Promise.all([
    prisma.exam.findMany({
      where,
      include: {
        examType: true,
        class: true,
        subject: true,
        academicSession: true,
        _count: { select: { results: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.exam.count({ where }),
  ])

  return (
    <ExamList
      exams={JSON.parse(JSON.stringify(exams))}
      total={total}
      page={page}
      pageSize={pageSize}
      profile={JSON.parse(JSON.stringify(profile))}
    />
  )
}
