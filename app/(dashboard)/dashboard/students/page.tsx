import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { StudentList } from "./student-list"

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const { profile } = await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "PRINCIPAL",
    "ADMISSION_OFFICER"
  )

  const params = await searchParams
  const search = params.search || ""
  const status = params.status || ""
  const classId = params.classId || ""
  const page = parseInt(params.page || "1")
  const pageSize = 10

  const where: any = {}

  if (profile.role !== "SUPER_ADMIN") {
    where.schoolId = profile.schoolId!
    if (profile.branchId) where.branchId = profile.branchId!
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { admissionNo: { contains: search, mode: "insensitive" } },
    ]
  }

  if (status) where.status = status

  if (classId) {
    where.enrollments = { some: { classId } }
  }

  const [students, total, classes] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        enrollments: {
          include: { class: true, section: true, academicSession: true },
          where: { status: "ACTIVE" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.student.count({ where }),
    prisma.class.findMany({
      where: profile.role === "SUPER_ADMIN"
        ? undefined
        : { schoolId: profile.schoolId!, branchId: profile.branchId! },
      orderBy: { order: "asc" },
    }),
  ])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Students</h2>
        <p className="text-muted-foreground">Manage all students</p>
      </div>
      <StudentList
        students={JSON.parse(JSON.stringify(students))}
        classes={JSON.parse(JSON.stringify(classes))}
        currentPage={page}
        totalPages={totalPages}
        total={total}
        search={search}
        status={status}
        classId={classId}
      />
    </div>
  )
}
