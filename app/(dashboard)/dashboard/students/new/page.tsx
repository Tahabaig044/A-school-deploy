import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { StudentForm } from "../student-form"

export default async function NewStudentPage() {
  const { profile } = await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "ADMISSION_OFFICER"
  )

  const classWhere = profile.role === "SUPER_ADMIN"
    ? {}
    : { schoolId: profile.schoolId!, branchId: profile.branchId! }

  const sessionWhere = profile.role === "SUPER_ADMIN"
    ? { isCurrent: true as const }
    : { schoolId: profile.schoolId!, isCurrent: true as const }

  const [classes, sessions] = await Promise.all([
    prisma.class.findMany({
      where: classWhere,
      orderBy: { order: "asc" },
      include: { sections: { select: { id: true, name: true }, orderBy: { name: "asc" } } },
    }),
    prisma.academicSession.findMany({ where: sessionWhere }),
  ])

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Add Student</h2>
        <p className="text-muted-foreground">Create a new student record</p>
      </div>
      <StudentForm
        classes={JSON.parse(JSON.stringify(classes))}
        sessions={JSON.parse(JSON.stringify(sessions))}
      />
    </div>
  )
}
