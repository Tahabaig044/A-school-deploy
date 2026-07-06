import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { DefaulterList } from "./defaulter-list"

export default async function DefaultersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT")
  const params = await searchParams
  const sessionId = params.sessionId || ""
  const branchId = profile.branchId || params.branchId || ""

  const academicSessions = await prisma.academicSession.findMany({
    where: {
      schoolId: profile.schoolId!,
      ...(profile.branchId ? { branchId: profile.branchId! } : {}),
    },
    select: { id: true, name: true },
    orderBy: { startDate: "desc" },
  })

  const overdueInvoices = sessionId
    ? await prisma.feeInvoice.findMany({
        where: {
          dueDate: { lt: new Date() },
          status: { in: ["PENDING", "PARTIAL"] },
          ...(profile.role !== "SUPER_ADMIN" && { schoolId: profile.schoolId || undefined }),
          ...(branchId ? { student: { branchId } } : {}),
          academicSessionId: sessionId,
        },
        include: {
          student: { select: { id: true, firstName: true, lastName: true, admissionNo: true, phone: true } },
          academicSession: { select: { name: true } },
        },
        orderBy: { dueDate: "asc" },
      })
    : []

  return (
    <DefaulterList
      defaulters={JSON.parse(JSON.stringify(overdueInvoices))}
      academicSessions={JSON.parse(JSON.stringify(academicSessions))}
      selectedSession={sessionId}
    />
  )
}
