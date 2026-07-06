import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { PaymentView } from "./payment-view"

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT")
  const params = await searchParams
  const invoiceId = params.invoiceId || ""

  const where: any = {}
  if (invoiceId) where.id = invoiceId
  if (profile.role !== "SUPER_ADMIN") {
    where.student = {
      schoolId: profile.schoolId!,
      ...(profile.branchId ? { branchId: profile.branchId! } : {}),
    }
  }

  const invoices = await prisma.feeInvoice.findMany({
    where,
    include: {
      student: { select: { firstName: true, lastName: true, admissionNo: true } },
      academicSession: { select: { name: true } },
      items: {
        include: { feeStructure: { select: { name: true } } },
      },
      payments: {
        include: { recorder: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <PaymentView
      invoices={JSON.parse(JSON.stringify(invoices))}
      profile={JSON.parse(JSON.stringify(profile))}
    />
  )
}
