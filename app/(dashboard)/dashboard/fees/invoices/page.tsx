import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { InvoiceList } from "./invoice-list"

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT")
  const params = await searchParams
  const search = params.search || ""
  const status = params.status || ""
  const page = parseInt(params.page || "1")
  const pageSize = 10

  const where: any = {}
  if (profile.role !== "SUPER_ADMIN") {
    where.student = { branchId: profile.branchId!, schoolId: profile.schoolId! }
  }

  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search, mode: "insensitive" } },
      { student: { firstName: { contains: search, mode: "insensitive" } } },
      { student: { lastName: { contains: search, mode: "insensitive" } } },
    ]
  }

  if (status) where.status = status

  const [invoices, total, students, academicSessions] = await Promise.all([
    prisma.feeInvoice.findMany({
      where,
      include: {
        student: { select: { firstName: true, lastName: true, admissionNo: true } },
        academicSession: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.feeInvoice.count({ where }),
    prisma.student.findMany({
      where: {
        schoolId: profile.schoolId!,
        ...(profile.branchId ? { branchId: profile.branchId! } : {}),
      },
      select: { id: true, firstName: true, lastName: true, admissionNo: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.academicSession.findMany({
      where: {
        schoolId: profile.schoolId!,
        ...(profile.branchId ? { branchId: profile.branchId! } : {}),
      },
      select: { id: true, name: true },
      orderBy: { startDate: "desc" },
    }),
  ])

  return (
    <InvoiceList
      invoices={JSON.parse(JSON.stringify(invoices))}
      total={total}
      page={page}
      pageSize={pageSize}
      students={JSON.parse(JSON.stringify(students))}
      academicSessions={JSON.parse(JSON.stringify(academicSessions))}
      profile={JSON.parse(JSON.stringify(profile))}
    />
  )
}
