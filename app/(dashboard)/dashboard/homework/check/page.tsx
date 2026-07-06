import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { CheckList } from "./check-list"

export default async function HomeworkCheckPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")
  const params = await searchParams
  const homeworkId = params.homeworkId

  let submissions: any[] = []
  let homework = null

  if (homeworkId) {
    homework = await prisma.homework.findUnique({
      where: { id: homeworkId },
      include: {
        class: true,
        subject: true,
      },
    })

    submissions = await prisma.homeworkSubmission.findMany({
      where: { homeworkId },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, admissionNo: true },
        },
      },
      orderBy: { submittedAt: "desc" },
    })
  }

  return (
    <CheckList
      homework={homework ? JSON.parse(JSON.stringify(homework)) : null}
      submissions={JSON.parse(JSON.stringify(submissions))}
      profile={JSON.parse(JSON.stringify(profile))}
    />
  )
}
