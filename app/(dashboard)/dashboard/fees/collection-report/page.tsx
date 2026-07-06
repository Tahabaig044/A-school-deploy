import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { CollectionReport } from "./collection-report-view"

export default async function CollectionReportPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT")
  const params = await searchParams
  const fromDate = params.fromDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  const toDate = params.toDate || new Date().toISOString().slice(0, 10)

  const branchId = profile.branchId || ""

  const paymentWhere: any = {
    paymentDate: { gte: new Date(fromDate), lte: new Date(toDate) },
  }

  if (profile.role !== "SUPER_ADMIN") {
    paymentWhere.invoice = { ...paymentWhere.invoice, schoolId: profile.schoolId }
  }
  if (branchId) {
    paymentWhere.invoice = { ...paymentWhere.invoice, student: { branchId } }
  }

  const payments = await prisma.payment.findMany({
    where: paymentWhere,
    include: {
      invoice: {
        include: { student: { select: { firstName: true, lastName: true, admissionNo: true } } },
      },
      recorder: { select: { firstName: true, lastName: true } },
    },
    orderBy: { paymentDate: "desc" },
  })

  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const byMode = payments.reduce<Record<string, number>>((acc, p) => {
    acc[p.paymentMode] = (acc[p.paymentMode] || 0) + Number(p.amount)
    return acc
  }, {})

  return (
    <CollectionReport
      payments={JSON.parse(JSON.stringify(payments))}
      totalCollected={totalCollected}
      byMode={byMode}
      fromDate={fromDate}
      toDate={toDate}
    />
  )
}
