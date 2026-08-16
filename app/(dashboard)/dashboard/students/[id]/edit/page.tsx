import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { EditStudentForm } from "./edit-student-form"

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { profile } = await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "ADMISSION_OFFICER"
  )

  const { id } = await params

  // Check if this is an ID card edit request
  if (id === "id-card") {
    redirect("/dashboard/students/id-cards")
  }

  const student = await prisma.student.findFirst({
    where: {
      id,
      ...(profile.role !== "SUPER_ADMIN" && {
        schoolId: profile.schoolId || undefined,
      }),
    },
    include: {
      enrollments: {
        include: { class: true, section: true, academicSession: true },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!student) notFound()

  const classes = profile.role === "SUPER_ADMIN"
    ? await prisma.class.findMany({
        include: { sections: true },
        orderBy: { order: "asc" },
      })
    : await prisma.class.findMany({
        where: { schoolId: profile.schoolId!, branchId: profile.branchId! },
        include: { sections: true },
        orderBy: { order: "asc" },
      })

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Edit Student</h2>
        <p className="text-muted-foreground">
          {student.firstName} {student.lastName}
        </p>
      </div>
      <EditStudentForm
        student={JSON.parse(JSON.stringify(student))}
        classes={JSON.parse(JSON.stringify(classes))}
      />
    </div>
  )
}
