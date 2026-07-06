import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { SchoolForm } from "./school-form"
import { SchoolList } from "./school-list"

export default async function SchoolsPage() {
  await requireRole("SUPER_ADMIN")

  const schools = await prisma.school.findMany({
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Schools</h2>
        <p className="text-muted-foreground">Manage all schools in the system</p>
      </div>
      <SchoolForm />
      <SchoolList schools={schools} />
    </div>
  )
}
