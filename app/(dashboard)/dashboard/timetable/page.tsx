import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { TimetableForm } from "./timetable-form"
import { TimetableGrid } from "./timetable-grid"
import { ConflictPanel } from "./conflict-panel"
import { RoomView } from "./room-view"

export default async function TimetablePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL")
  const params = await searchParams

  const where = profile.role === "SUPER_ADMIN" ? undefined : { schoolId: profile.schoolId! }

  const activeSession = await prisma.academicSession.findFirst({
    where:
      profile.role === "SUPER_ADMIN" ? undefined : { schoolId: profile.schoolId!, isCurrent: true },
    select: { id: true },
  })

  const [classes, teachers, subjects, sessions, slots] = await Promise.all([
    prisma.class.findMany({
      where,
      include: { sections: true },
      orderBy: { order: "asc" },
    }),
    prisma.teacher.findMany({
      where:
        profile.role === "SUPER_ADMIN"
          ? undefined
          : { schoolId: profile.schoolId!, branchId: profile.branchId! },
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.subject.findMany({
      where,
      select: { id: true, name: true, code: true },
    }),
    prisma.academicSession.findMany({
      where: profile.role === "SUPER_ADMIN" ? undefined : { schoolId: profile.schoolId! },
      select: { id: true, name: true, isCurrent: true },
      orderBy: { startDate: "desc" },
    }),
    prisma.timetable.findMany({
      where: {
        ...(params.classId ? { classId: params.classId } : {}),
        ...(profile.role !== "SUPER_ADMIN" ? { schoolId: profile.schoolId! } : {}),
      },
      include: { class: true, section: true, subject: true, teacher: true, academicSession: true },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
  ])

  const view = params.view || "grid"

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Timetable</h2>
          <p className="text-muted-foreground">Manage class timetables</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/dashboard/timetable?view=grid"
            className={`rounded-md px-3 py-1.5 text-sm ${view === "grid" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            Grid
          </a>
          <a
            href="/dashboard/timetable?view=conflicts"
            className={`rounded-md px-3 py-1.5 text-sm ${view === "conflicts" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            Conflicts
          </a>
          <a
            href="/dashboard/timetable?view=rooms"
            className={`rounded-md px-3 py-1.5 text-sm ${view === "rooms" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            Rooms
          </a>
        </div>
      </div>

      {view === "grid" && (
        <>
          <TimetableForm
            classes={JSON.parse(JSON.stringify(classes))}
            teachers={JSON.parse(JSON.stringify(teachers))}
            subjects={JSON.parse(JSON.stringify(subjects))}
            sessions={JSON.parse(JSON.stringify(sessions))}
          />
          <TimetableGrid
            slots={JSON.parse(JSON.stringify(slots))}
            currentClassId={params.classId || ""}
          />
        </>
      )}

      {view === "conflicts" && activeSession && (
        <ConflictPanel academicSessionId={activeSession.id} />
      )}

      {view === "rooms" && activeSession && <RoomView academicSessionId={activeSession.id} />}
    </div>
  )
}
