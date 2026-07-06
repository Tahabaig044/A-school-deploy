import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { LeaveView } from "./leave-view"

export default async function LeavesPage() {
  const { profile } = await requireRole(
    "SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL",
    "TEACHER", "ACCOUNTANT", "ADMISSION_OFFICER", "LIBRARIAN", "TRANSPORT_MANAGER"
  )

  const leaves = ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL"].includes(profile.role)
    ? await prisma.leaveRequest.findMany({
        include: { profile: { select: { firstName: true, lastName: true, role: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    : await prisma.leaveRequest.findMany({
        where: { profileId: profile.id },
        include: { profile: { select: { firstName: true, lastName: true, role: true } } },
        orderBy: { createdAt: "desc" },
      })

  const isAdmin = ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL"].includes(profile.role)

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Leave Requests</h2>
        <p className="text-muted-foreground">Apply for and manage leave</p>
      </div>
      <LeaveView
        leaves={JSON.parse(JSON.stringify(leaves))}
        isAdmin={isAdmin}
      />
    </div>
  )
}
