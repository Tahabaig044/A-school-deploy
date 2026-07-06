import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { ExpenseList } from "./expense-list"

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT")
  const params = await searchParams
  const page = parseInt(params.page || "1")
  const pageSize = 10

  const where: any = {}
  if (profile.role !== "SUPER_ADMIN") {
    where.schoolId = profile.schoolId!
    if (profile.branchId) where.branchId = profile.branchId!
  }

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: { recorder: { select: { firstName: true, lastName: true } } },
      orderBy: { expenseDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.expense.count({ where }),
  ])

  return (
    <ExpenseList
      expenses={JSON.parse(JSON.stringify(expenses))}
      total={total}
      page={page}
      pageSize={pageSize}
      profile={JSON.parse(JSON.stringify(profile))}
    />
  )
}
