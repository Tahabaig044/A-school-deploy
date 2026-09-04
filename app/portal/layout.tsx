import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { PortalSidebar } from "@/components/layout/portal-sidebar"
import { PortalMobileSidebar } from "@/components/layout/portal-mobile-sidebar"
import { UserDropdown } from "@/components/layout/user-dropdown"
import { NotificationsDropdown } from "@/components/layout/notifications-dropdown"
import { PORTAL_ROLES, type Role } from "@/lib/constants"
import { getCurrentProfile, getCurrentUser } from "@/lib/auth"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, MapPin, BookOpen } from "lucide-react"

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  const profile = await getCurrentProfile()

  if (!user || !profile) {
    redirect("/login")
  }

  if (!(PORTAL_ROLES as readonly string[]).includes(profile.role)) {
    redirect("/dashboard")
  }

  const role = profile.role as Role

  const unreadNotificationCount = await prisma.notification.count({
    where: { userId: profile.id, isRead: false },
  })

  let todaySlots: any[] = []
  if (role === "TEACHER" && profile.schoolId) {
    try {
      const teacher = await prisma.teacher.findFirst({ where: { profileId: user.id } })
      const activeSession = await prisma.academicSession.findFirst({
        where: { schoolId: profile.schoolId, isCurrent: true },
        select: { id: true },
      })
      if (teacher && activeSession) {
        const dayNames = [
          "SUNDAY",
          "MONDAY",
          "TUESDAY",
          "WEDNESDAY",
          "THURSDAY",
          "FRIDAY",
          "SATURDAY",
        ]
        const todayDayName = dayNames[new Date().getDay()]
        const classIds = (
          await prisma.teacherAssignment.findMany({
            where: { teacherId: teacher.id, academicSessionId: activeSession.id },
            select: { classId: true },
          })
        ).map((a) => a.classId)
        todaySlots = await prisma.timetable.findMany({
          where: {
            academicSessionId: activeSession.id,
            dayOfWeek: todayDayName as any,
            OR: [
              { teacherId: teacher.id },
              ...(classIds.length > 0 ? [{ isFree: true, classId: { in: classIds } }] : []),
            ],
          },
          include: { class: true, subject: true, section: true },
          orderBy: { startTime: "asc" },
        })
      }
    } catch {}
  }

  return (
    <div className="flex min-h-full">
      <PortalSidebar role={role} />
      <div className="flex flex-1 flex-col">
        <header className="bg-background sticky top-0 z-10 border-b">
          <div className="flex h-16 items-center justify-between px-4 md:px-6">
            <PortalMobileSidebar role={role} />
            {role === "TEACHER" && todaySlots.length > 0 && (
              <div className="text-muted-foreground hidden items-center gap-2 text-sm md:flex">
                <Clock className="h-4 w-4" />
                <span>
                  Today: {todaySlots.length} period{todaySlots.length > 1 ? "s" : ""}
                </span>
                <span className="text-xs">
                  {todaySlots[0]?.startTime} - {todaySlots[todaySlots.length - 1]?.endTime}
                </span>
              </div>
            )}
            <div className="ml-auto flex items-center gap-4">
              <NotificationsDropdown initialCount={unreadNotificationCount} />
              <UserDropdown
                email={profile.email || user.email || ""}
                name={
                  profile.firstName && profile.lastName
                    ? `${profile.firstName} ${profile.lastName}`
                    : null
                }
                role={role}
              />
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          {role === "TEACHER" && todaySlots.length > 0 && (
            <div className="mb-6">
              <div className="mb-3 flex items-center gap-2">
                <Clock className="text-primary h-4 w-4 shrink-0" />
                <h3 className="text-sm font-semibold">Today&apos;s Schedule</h3>
              </div>
              <div className="-mx-4 flex snap-x snap-mandatory scrollbar-thin flex-wrap gap-2 overflow-x-auto px-4 pb-2 md:px-0">
                {todaySlots.map((slot) => (
                  <Card
                    key={slot.id}
                    className={`w-[180px] shrink-0 snap-start md:min-w-[200px] ${slot.isFree ? "bg-muted/30 border-dashed" : ""}`}
                  >
                    <CardContent className="space-y-1.5 p-3">
                      <div className="flex items-center justify-between gap-1">
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {slot.startTime}
                        </Badge>
                        <span className="text-muted-foreground text-xs">{slot.endTime}</span>
                      </div>
                      {slot.isFree ? (
                        <div className="flex min-w-0 items-center gap-1">
                          <Badge
                            variant="outline"
                            className="text-muted-foreground shrink-0 text-xs"
                          >
                            Free
                          </Badge>
                          {slot.freePeriodReason && (
                            <span className="text-muted-foreground truncate text-xs">
                              {slot.freePeriodReason}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="truncate text-sm font-medium">{slot.subject?.name}</p>
                      )}
                      <div className="text-muted-foreground flex min-w-0 items-center gap-2 text-xs">
                        <BookOpen className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {slot.class.name}
                          {slot.section ? ` - ${slot.section.name}` : ""}
                        </span>
                      </div>
                      {slot.room && (
                        <div className="text-muted-foreground flex items-center gap-1 text-xs">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{slot.room}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
