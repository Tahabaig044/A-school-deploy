import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/shared/loading-skeleton"
import { DashboardStats } from "./dashboard-stats"

export default async function DashboardPage() {
  const { profile } = await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "TEACHER",
    "PARENT",
    "PRINCIPAL",
    "ACCOUNTANT",
    "ADMISSION_OFFICER",
    "LIBRARIAN",
    "TRANSPORT_MANAGER",
  )

  const cookieStore = await cookies()
  const selectedBranch = cookieStore.get("selected_branch")?.value

  let branch: { id: string; name: string } | null = null
  if (selectedBranch) {
    branch = await prisma.branch.findFirst({
      where: {
        id: selectedBranch,
        ...(profile.schoolId ? { schoolId: profile.schoolId } : {}),
        isActive: true,
      },
      select: { id: true, name: true },
    })
  }

  const effectiveBranchId = branch?.id || profile.branchId || undefined

  return (
    <div className="space-y-6">
      <Suspense fallback={<PageSkeleton />}>
        <DashboardStats
          profile={profile}
          schoolId={profile.schoolId || undefined}
          branchId={effectiveBranchId}
          branchName={branch?.name}
        />
      </Suspense>
    </div>
  )
}
