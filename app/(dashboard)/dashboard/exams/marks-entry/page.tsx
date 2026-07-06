import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { MarksEntryForm } from "./marks-entry-form"

export default async function MarksEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")
  const params = await searchParams
  const examId = params.examId

  const where: any = {}
  if (profile.role !== "SUPER_ADMIN") {
    where.schoolId = profile.schoolId!
    if (profile.branchId) where.branchId = profile.branchId!
  }

  const exams = await prisma.exam.findMany({
    where,
    include: {
      examType: true,
      class: true,
      subject: true,
    },
    orderBy: { createdAt: "desc" },
  })

  let selectedExam = null
  let students: any[] = []
  let existingResults: any[] = []

  if (examId) {
    selectedExam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        examType: true,
        class: true,
        subject: true,
        academicSession: true,
      },
    })

    if (selectedExam) {
      students = await prisma.studentEnrollment.findMany({
        where: {
          classId: selectedExam.classId,
          academicSessionId: selectedExam.academicSessionId,
          status: "ACTIVE",
        },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              admissionNo: true,
            },
          },
        },
        orderBy: { student: { firstName: "asc" } },
      })

      existingResults = await prisma.examResult.findMany({
        where: { examId },
        include: {
          student: {
            select: { id: true },
          },
        },
      })
    }
  }

  return (
    <MarksEntryForm
      exams={JSON.parse(JSON.stringify(exams))}
      selectedExam={selectedExam ? JSON.parse(JSON.stringify(selectedExam)) : null}
      students={JSON.parse(JSON.stringify(students.map((e) => e.student)))}
      existingResults={JSON.parse(JSON.stringify(existingResults))}
      profile={JSON.parse(JSON.stringify(profile))}
    />
  )
}
