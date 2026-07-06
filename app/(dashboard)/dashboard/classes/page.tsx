import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { ClassForm } from "./class-form"
import { ClassList } from "./class-list"

export default async function ClassesPage() {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const classes = profile.role === "SUPER_ADMIN"
    ? await prisma.class.findMany({
        include: { sections: true, school: true },
        orderBy: { order: "asc" },
      })
    : await prisma.class.findMany({
        where: { schoolId: profile.schoolId!, branchId: profile.branchId! },
        include: { sections: true, school: true },
        orderBy: { order: "asc" },
      })

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Classes</h2>
        <p className="text-muted-foreground">Manage classes and sections</p>
      </div>
      <ClassForm />
      <ClassList classes={classes} />
    </div>
  )
}
