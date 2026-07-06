import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { StudentProfile } from "./student-profile"

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "PRINCIPAL",
    "ADMISSION_OFFICER",
    "TEACHER"
  )

  const { id } = await params

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      enrollments: {
        include: {
          class: true,
          section: true,
          academicSession: true,
        },
        orderBy: { createdAt: "desc" },
      },
      parents: {
        include: {
          parent: true,
        },
      },
      documents: {
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!student) notFound()

  return (
    <StudentProfile student={JSON.parse(JSON.stringify(student))} />
  )
}
