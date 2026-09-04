import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { ReportCardList } from "./report-card-list"

export default async function ReportCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")
  const params = await searchParams

  const where: any = {}
  if (profile.role !== "SUPER_ADMIN") {
    where.student = {
      schoolId: profile.schoolId || undefined,
      branchId: profile.branchId || undefined,
    }
  }

  const reportCards = await prisma.reportCard.findMany({
    where,
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNo: true,
          branchId: true,
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
    orderBy: { rank: "asc" },
  })

  return (
    <ReportCardList
      reportCards={JSON.parse(JSON.stringify(reportCards))}
      profile={JSON.parse(JSON.stringify(profile))}
    />
  )
}
