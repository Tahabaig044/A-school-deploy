import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { SectionForm } from "./section-form"
import { SectionList } from "./section-list"

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")
  const { id } = await params

  const classData = await prisma.class.findUnique({
    where: { id },
    include: {
      sections: { orderBy: { name: "asc" } },
      school: true,
    },
  })

  if (!classData) notFound()

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{classData.name}</h2>
        <p className="text-muted-foreground">{classData.school.name} — Code: {classData.code}</p>
      </div>
      <SectionForm classId={id} />
      <SectionList sections={classData.sections} classId={id} />
    </div>
  )
}
