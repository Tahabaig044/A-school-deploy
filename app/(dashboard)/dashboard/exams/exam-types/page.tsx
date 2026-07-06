import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { ExamTypeList } from "./exam-type-list"

export default async function ExamTypesPage() {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const where: any = {}
  if (profile.role !== "SUPER_ADMIN") {
    where.schoolId = profile.schoolId!
    if (profile.branchId) where.branchId = profile.branchId!
  }

  const examTypes = await prisma.examType.findMany({
    where,
    orderBy: { name: "asc" },
  })

  return (
    <ExamTypeList
      examTypes={JSON.parse(JSON.stringify(examTypes))}
      profile={JSON.parse(JSON.stringify(profile))}
    />
  )
}
