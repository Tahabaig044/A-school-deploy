import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { cookies } from "next/headers"
import { SessionForm } from "./session-form"
import { SessionList } from "./session-list"

export default async function SessionsPage() {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const cookieStore = await cookies()
  const selectedBranch = cookieStore.get("selected_branch")?.value

  const branches = await prisma.branch.findMany({
    where: profile.role === "SUPER_ADMIN" ? undefined : { schoolId: profile.schoolId! },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  const where: { schoolId: string; branchId?: string } | undefined =
    profile.role === "SUPER_ADMIN" ? undefined : { schoolId: profile.schoolId! }

  if (where && selectedBranch) {
    const branch = branches.some((b) => b.id === selectedBranch) ? selectedBranch : undefined
    if (branch) where.branchId = branch
  }

  const sessions = await prisma.academicSession.findMany({
    where,
    include: { school: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Academic Sessions</h2>
        <p className="text-muted-foreground">Manage academic sessions and terms</p>
      </div>
      <SessionForm branches={branches} />
      <SessionList sessions={sessions} />
    </div>
  )
}
