import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { ResultList } from "./result-list"

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")
  const params = await searchParams

  const where: any = {}
  if (profile.role !== "SUPER_ADMIN") {
    where.exam = { branchId: profile.branchId! }
  }

  const results = await prisma.examResult.findMany({
    where,
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNo: true,
        },
      },
      exam: {
        include: {
          examType: true,
          subject: true,
          class: true,
        },
      },
    },
    orderBy: { exam: { examDate: "desc" } },
  })

  return (
    <ResultList
      results={JSON.parse(JSON.stringify(results))}
      profile={JSON.parse(JSON.stringify(profile))}
    />
  )
}
