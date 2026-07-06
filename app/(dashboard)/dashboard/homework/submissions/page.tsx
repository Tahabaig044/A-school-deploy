import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { SubmissionList } from "./submission-list"

export default async function HomeworkSubmissionsPage() {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "STUDENT")

  const where: any = {}
  if (profile.role === "SUPER_ADMIN") {
    // no filter
  } else if (profile.role === "STUDENT") {
    where.studentId = profile.id
  } else {
    where.homework = { schoolId: profile.schoolId }
  }

  const submissions = await prisma.homeworkSubmission.findMany({
    where,
    include: {
      homework: {
        include: {
          class: true,
          subject: true,
          teacher: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { submittedAt: "desc" },
  })

  return (
    <SubmissionList
      submissions={JSON.parse(JSON.stringify(submissions))}
      profile={JSON.parse(JSON.stringify(profile))}
    />
  )
}
