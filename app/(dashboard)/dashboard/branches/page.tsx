import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { BranchForm } from "./branch-form"
import { BranchList } from "./branch-list"

export default async function BranchesPage() {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN")

  const branches = profile.role === "SUPER_ADMIN"
    ? await prisma.branch.findMany({
        include: { school: true },
        orderBy: { createdAt: "desc" },
      })
    : await prisma.branch.findMany({
        where: { schoolId: profile.schoolId! },
        include: { school: true },
        orderBy: { createdAt: "desc" },
      })

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Branches</h2>
        <p className="text-muted-foreground">Manage branches across schools</p>
      </div>
      <BranchForm />
      <BranchList branches={branches} />
    </div>
  )
}
