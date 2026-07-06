import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { PortalSidebar } from "@/components/layout/portal-sidebar"
import { PortalMobileSidebar } from "@/components/layout/portal-mobile-sidebar"
import { UserDropdown } from "@/components/layout/user-dropdown"
import { NotificationsDropdown } from "@/components/layout/notifications-dropdown"
import { PORTAL_ROLES } from "@/lib/constants"

export default async function PortalLayout({
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

  const role = profile.role

  // Only portal roles allowed here; everything else goes to dashboard
  if (!(PORTAL_ROLES as readonly string[]).includes(role)) {
    redirect("/dashboard")
  }

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
