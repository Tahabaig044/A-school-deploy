import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { PortalSidebar } from "@/components/layout/portal-sidebar"
import { PortalMobileSidebar } from "@/components/layout/portal-mobile-sidebar"
import { UserDropdown } from "@/components/layout/user-dropdown"
import { NotificationsDropdown } from "@/components/layout/notifications-dropdown"
import { PORTAL_ROLES, type Role } from "@/lib/constants"
import { setRequestContext, clearRequestContext } from "@/lib/auth"

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headerStore = await headers()
  const userId = headerStore.get("X-User-Id")
  const userRole = headerStore.get("X-User-Role")
  const userEmail = headerStore.get("X-User-Email")

  if (!userId || !userRole || !userEmail) {
    redirect("/login")
  }

  if (!(PORTAL_ROLES as readonly string[]).includes(userRole)) {
    redirect("/dashboard")
  }

  const role = userRole as Role

  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true },
  })

  setRequestContext({
    user: { id: userId, email: userEmail },
    profile: {
      id: userId,
      role: userRole as any,
      schoolId: null,
      branchId: null,
      firstName: profile?.firstName || null,
      lastName: profile?.lastName || null,
      email: userEmail,
      phone: null,
    },
  })

  try {
    return (
      <div className="flex min-h-full">
        <PortalMobileSidebar role={role} />
        <PortalSidebar role={role} />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b bg-background">
            <div className="flex h-16 items-center justify-between px-6">
              <div className="md:hidden" />
              <div className="hidden md:block" />
              <div className="flex items-center gap-4">
                <NotificationsDropdown />
                <UserDropdown
                  email={userEmail}
                  name={
                    profile?.firstName && profile?.lastName
                      ? `${profile.firstName} ${profile.lastName}`
                      : null
                  }
                  role={role}
                />
              </div>
            </div>
          </header>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    )
  } finally {
    clearRequestContext()
  }
}
