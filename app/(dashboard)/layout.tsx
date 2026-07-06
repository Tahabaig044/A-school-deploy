import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { MobileSidebar } from "@/components/layout/mobile-sidebar"
import { BranchSelector } from "@/components/layout/branch-selector"
import { NotificationsDropdown } from "@/components/layout/notifications-dropdown"
import { UserDropdown } from "@/components/layout/user-dropdown"
import { getPermissionsForRole } from "@/lib/permissions"
import type { Role } from "@/lib/constants"
import { PORTAL_ROLES } from "@/lib/constants"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
  })

  if (!profile) {
    redirect("/login")
  }

  // Redirect portal roles to their respective portals
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

  const branches = profile.schoolId
    ? await prisma.branch.findMany({
        where: { schoolId: profile.schoolId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : []

  // Get permissions for the user's role
  const permissions = await getPermissionsForRole(profile.role as Role)

  return (
    <div className="flex min-h-full">
      <MobileSidebar permissions={permissions} />
      <Sidebar permissions={permissions} />
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b bg-background">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="md:hidden" />
            <div className="hidden md:block" />
            <div className="flex items-center gap-4">
              <BranchSelector branches={branches} />
              <NotificationsDropdown />
              <UserDropdown
                email={user.email!}
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
