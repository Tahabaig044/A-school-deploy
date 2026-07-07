import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { Sidebar } from "@/components/layout/sidebar"
import { MobileSidebar } from "@/components/layout/mobile-sidebar"
import { BranchSelector } from "@/components/layout/branch-selector"
import { NotificationsDropdown } from "@/components/layout/notifications-dropdown"
import { UserDropdown } from "@/components/layout/user-dropdown"
import { getPermissionsForRole } from "@/lib/permissions"
import type { Role } from "@/lib/constants"
import { PORTAL_ROLES } from "@/lib/constants"
import { setRequestContext, clearRequestContext } from "@/lib/auth"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headerStore = await headers()
  const userId = headerStore.get("X-User-Id")
  const userRole = headerStore.get("X-User-Role") as Role | null
  const userSchoolId = headerStore.get("X-User-SchoolId") || null
  const userBranchId = headerStore.get("X-User-BranchId") || null
  const userEmail = headerStore.get("X-User-Email") || null

  if (!userId || !userRole || !userEmail) {
    redirect("/login")
  }

  const profile = {
    id: userId,
    role: userRole,
    schoolId: userSchoolId || null,
    branchId: userBranchId || null,
    firstName: null as string | null,
    lastName: null as string | null,
    email: userEmail,
    phone: null as string | null,
  }

  const fullProfile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true, phone: true },
  })

  if (fullProfile) {
    profile.firstName = fullProfile.firstName
    profile.lastName = fullProfile.lastName
    profile.phone = fullProfile.phone
  }

  if ((PORTAL_ROLES as readonly string[]).includes(userRole)) {
    switch (userRole) {
      case "STUDENT":
        redirect("/portal/student")
      case "PARENT":
        redirect("/portal/parent")
      case "TEACHER":
        redirect("/portal/teacher")
    }
  }

  setRequestContext({
    user: { id: userId, email: userEmail },
    profile,
  })

  try {
    const [branches, permissions] = await Promise.all([
      userSchoolId
        ? prisma.branch.findMany({
            where: { schoolId: userSchoolId, isActive: true },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          })
        : Promise.resolve([]),
      getPermissionsForRole(userRole),
    ])

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
                  email={userEmail}
                  name={
                    profile.firstName && profile.lastName
                      ? `${profile.firstName} ${profile.lastName}`
                      : null
                  }
                  role={userRole}
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
