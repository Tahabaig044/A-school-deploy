import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { MobileSidebar } from "@/components/layout/mobile-sidebar"
import { BranchSelector } from "@/components/layout/branch-selector"
import { NotificationsDropdown } from "@/components/layout/notifications-dropdown"
import { UserDropdown } from "@/components/layout/user-dropdown"
import { getPermissionsForRole } from "@/lib/permissions"
import { PORTAL_ROLES, type Role } from "@/lib/constants"
import { getCurrentUser } from "@/lib/auth"
import { validateDashboardAccess } from "@/lib/dashboard-validation"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const layoutStart = performance.now()
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  // Validate dashboard access
  const validation = await validateDashboardAccess()
  if (!validation.valid) {
    // Show professional error page instead of blank page
    return (
      <div className="flex min-h-full items-center justify-center">
        <div className="space-y-4 text-center">
          <h1 className="text-destructive text-2xl font-bold">Access Error</h1>
          <p className="text-muted-foreground">{validation.error}</p>
          <a href="/login" className="text-primary underline">
            Return to Login
          </a>
        </div>
      </div>
    )
  }

  const profile = validation.profile!

  // Portal roles should not access admin dashboard
  if ((PORTAL_ROLES as readonly string[]).includes(profile.role)) {
    switch (profile.role) {
      case "STUDENT":
        redirect("/portal/student")
      case "PARENT":
        redirect("/portal/parent")
      case "TEACHER":
        redirect("/portal/teacher")
    }
  }

  const [branches, permissions, unreadNotificationCount] = await Promise.all([
    profile.schoolId
      ? prisma.branch.findMany({
          where: { schoolId: profile.schoolId, isActive: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    getPermissionsForRole(profile.role as Role),
    prisma.notification.count({
      where: { userId: profile.id, isRead: false },
    }),
  ])

  if (process.env.NODE_ENV !== "production") {
    console.log(`[PERF] dashboard layout total: ${(performance.now() - layoutStart).toFixed(0)}ms`)
  }

  return (
    <div className="flex min-h-full">
      <Sidebar permissions={permissions} />
      <div className="flex flex-1 flex-col">
        <header className="bg-background sticky top-0 z-10 border-b">
          <div className="flex h-16 items-center justify-between px-3">
            <MobileSidebar permissions={permissions} />
            <div className="flex items-center gap-4">
              <BranchSelector branches={branches} />
              <NotificationsDropdown initialCount={unreadNotificationCount} />
              <UserDropdown
                email={profile.email || user.email || ""}
                name={
                  profile.firstName && profile.lastName
                    ? `${profile.firstName} ${profile.lastName}`
                    : null
                }
                role={profile.role}
              />
            </div>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
