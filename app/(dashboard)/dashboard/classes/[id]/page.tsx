import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { SectionForm } from "./section-form"
import { SectionList } from "./section-list"
import { ClassTeacherForm } from "./class-teacher-form"

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")
  const { id } = await params

  const classData = await prisma.class.findFirst({
    where: {
      id,
      ...(profile.role !== "SUPER_ADMIN" && {
        schoolId: profile.schoolId || undefined,
      }),
    },
    include: {
      sections: { orderBy: { name: "asc" } },
      school: true,
      classTeacher: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
    },
  })

  if (!classData) notFound()

  const teachers = await prisma.teacher.findMany({
    where: {
      schoolId: classData.schoolId,
      branchId: classData.branchId,
      status: "ACTIVE",
    },
    select: { id: true, firstName: true, lastName: true, employeeCode: true, department: true },
    orderBy: { firstName: "asc" },
  })

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{classData.name}</h2>
        <p className="text-muted-foreground">{classData.school.name} — Code: {classData.code}</p>
      </div>
      <ClassTeacherForm
        classId={id}
        currentTeacher={classData.classTeacher}
        teachers={JSON.parse(JSON.stringify(teachers))}
      />
      <SectionForm classId={id} />
      <SectionList sections={classData.sections} classId={id} />
    </div>
  )
}
