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

  const classes = profile.role === "SUPER_ADMIN"
    ? await prisma.class.findMany({ orderBy: { order: "asc" } })
    : await prisma.class.findMany({
        where: { schoolId: profile.schoolId!, branchId: profile.branchId! },
        orderBy: { order: "asc" },
      })

  const sessions = profile.role === "SUPER_ADMIN"
    ? await prisma.academicSession.findMany({ where: { isCurrent: true } })
    : await prisma.academicSession.findMany({
        where: { schoolId: profile.schoolId!, isCurrent: true },
      })

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
