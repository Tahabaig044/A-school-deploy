import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { IssueList } from "./issue-list"

export default async function LibraryIssuesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")
  const params = await searchParams
  const status = params.status || "ISSUED"

  const where: any = {}
  if (profile.role !== "SUPER_ADMIN") {
    where.book = { schoolId: profile.schoolId!, branchId: profile.branchId! }
  }
  if (status) where.status = status

  const issues = await prisma.bookIssue.findMany({
    where,
    include: {
      book: { select: { id: true, title: true, author: true } },
      student: { select: { id: true, firstName: true, lastName: true, admissionNo: true } },
    },
    orderBy: { issueDate: "desc" },
  })

  return (
    <IssueList
      issues={JSON.parse(JSON.stringify(issues))}
      profile={JSON.parse(JSON.stringify(profile))}
    />
  )
}
