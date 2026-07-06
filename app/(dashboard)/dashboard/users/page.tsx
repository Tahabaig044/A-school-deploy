import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { InviteUserForm } from "./invite-user-form"
import { UsersList } from "./users-list"

export default async function UsersPage() {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN")

  const users = await prisma.profile.findMany({
    where: {
      schoolId: profile.schoolId,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Users</h2>
        <p className="text-muted-foreground">Manage users in your school</p>
      </div>

      <InviteUserForm />

      <UsersList users={JSON.parse(JSON.stringify(users))} />
    </div>
  )
}
