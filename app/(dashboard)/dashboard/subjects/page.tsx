import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { SubjectForm } from "./subject-form"
import { SubjectList } from "./subject-list"

export default async function SubjectsPage() {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL")

  const subjects =
    profile.role === "SUPER_ADMIN"
      ? await prisma.subject.findMany({
          include: { school: true, classSubjects: { include: { class: true } } },
          orderBy: { name: "asc" },
        })
      : await prisma.subject.findMany({
          where: { schoolId: profile.schoolId!, branchId: profile.branchId! },
          include: { school: true, classSubjects: { include: { class: true } } },
          orderBy: { name: "asc" },
        })

  const classes =
    profile.role === "SUPER_ADMIN"
      ? await prisma.class.findMany({ orderBy: { order: "asc" } })
      : await prisma.class.findMany({
          where: { schoolId: profile.schoolId!, branchId: profile.branchId! },
          orderBy: { order: "asc" },
        })

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Subjects</h2>
        <p className="text-muted-foreground">Manage subjects and class assignments</p>
      </div>
      <SubjectForm />
      <SubjectList subjects={JSON.parse(JSON.stringify(subjects))} />
    </div>
  )
}
