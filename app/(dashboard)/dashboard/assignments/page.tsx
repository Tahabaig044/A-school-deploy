import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { AssignmentForm } from "./assignment-form"
import { AssignmentList } from "./assignment-list"

export default async function AssignmentsPage() {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL")

  const where = profile.role === "SUPER_ADMIN" ? undefined : { schoolId: profile.schoolId! }

  const [assignments, teachers, classes, subjects, sessions] = await Promise.all([
    prisma.teacherAssignment.findMany({
      where:
        profile.role === "SUPER_ADMIN"
          ? undefined
          : {
              class: { schoolId: profile.schoolId! },
            },
      include: {
        teacher: true,
        class: true,
        section: true,
        subject: true,
        academicSession: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.teacher.findMany({
      where:
        profile.role === "SUPER_ADMIN"
          ? undefined
          : {
              schoolId: profile.schoolId!,
              branchId: profile.branchId!,
            },
      select: { id: true, firstName: true, lastName: true, employeeCode: true },
    }),
    prisma.class.findMany({
      where,
      include: { sections: true },
      orderBy: { order: "asc" },
    }),
    prisma.subject.findMany({
      where,
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.academicSession.findMany({
      where: profile.role === "SUPER_ADMIN" ? undefined : { schoolId: profile.schoolId! },
      select: { id: true, name: true, isCurrent: true },
      orderBy: { startDate: "desc" },
    }),
  ])

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Teacher Assignments</h2>
        <p className="text-muted-foreground">Assign teachers to classes and subjects</p>
      </div>
      <AssignmentForm
        teachers={JSON.parse(JSON.stringify(teachers))}
        classes={JSON.parse(JSON.stringify(classes))}
        subjects={JSON.parse(JSON.stringify(subjects))}
        sessions={JSON.parse(JSON.stringify(sessions))}
      />
      <AssignmentList assignments={JSON.parse(JSON.stringify(assignments))} />
    </div>
  )
}
