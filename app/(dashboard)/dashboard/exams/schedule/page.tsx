import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { ScheduleList } from "./schedule-list"

export default async function ExamSchedulePage() {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")

  const where: any = {}
  if (profile.role !== "SUPER_ADMIN") {
    where.exam = { schoolId: profile.schoolId || undefined, branchId: profile.branchId || undefined }
  }

  const schedules = await prisma.examSchedule.findMany({
    where,
    include: {
      exam: {
        include: {
          examType: true,
          class: true,
          subject: true,
        },
      },
    },
    orderBy: { date: "asc" },
  })

  return (
    <ScheduleList
      schedules={JSON.parse(JSON.stringify(schedules))}
      profile={JSON.parse(JSON.stringify(profile))}
    />
  )
}
