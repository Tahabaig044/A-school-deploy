import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { TeacherForm } from "./teacher-form"
import { TeacherList } from "./teacher-list"

export default async function TeachersPage() {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL")

  const teachers = profile.role === "SUPER_ADMIN"
    ? await prisma.teacher.findMany({
        include: { school: true, assignments: { include: { class: true, subject: true } } },
        orderBy: { createdAt: "desc" },
      })
    : await prisma.teacher.findMany({
        where: { schoolId: profile.schoolId!, branchId: profile.branchId! },
        include: { school: true, assignments: { include: { class: true, subject: true } } },
        orderBy: { createdAt: "desc" },
      })

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Teachers</h2>
        <p className="text-muted-foreground">Manage teachers and their assignments</p>
      </div>
      <TeacherForm />
      <TeacherList teachers={JSON.parse(JSON.stringify(teachers))} />
    </div>
  )
}
