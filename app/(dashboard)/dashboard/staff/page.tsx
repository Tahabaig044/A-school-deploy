import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { StaffForm } from "./staff-form"
import { StaffList } from "./staff-list"

export default async function StaffPage() {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const staff = profile.role === "SUPER_ADMIN"
    ? await prisma.staff.findMany({ include: { school: true }, orderBy: { createdAt: "desc" } })
    : await prisma.staff.findMany({
        where: { schoolId: profile.schoolId!, branchId: profile.branchId! },
        include: { school: true },
        orderBy: { createdAt: "desc" },
      })

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Staff</h2>
        <p className="text-muted-foreground">Manage non-teaching staff</p>
      </div>
      <StaffForm />
      <StaffList staff={JSON.parse(JSON.stringify(staff))} />
    </div>
  )
}
