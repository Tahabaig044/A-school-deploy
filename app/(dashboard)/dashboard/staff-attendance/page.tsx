import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { StaffAttendanceView } from "./staff-attendance-view"

export default async function StaffAttendancePage() {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")

  const staff =
    profile.role === "SUPER_ADMIN"
      ? await prisma.staff.findMany({ orderBy: { firstName: "asc" } })
      : await prisma.staff.findMany({
          where: { schoolId: profile.schoolId!, branchId: profile.branchId! },
          orderBy: { firstName: "asc" },
        })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayRecords = await prisma.staffAttendance.findMany({
    where: { date: today, staffId: { in: staff.map((s) => s.id) } },
  })

  const recordMap = new Map(todayRecords.map((r) => [r.staffId, r]))

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Staff Attendance</h2>
        <p className="text-muted-foreground">Record daily staff check-in/out</p>
      </div>
      <StaffAttendanceView
        staff={JSON.parse(JSON.stringify(staff))}
        recordMap={JSON.parse(JSON.stringify(Array.from(recordMap.entries())))}
        todayStr={today.toISOString().split("T")[0]}
      />
    </div>
  )
}
