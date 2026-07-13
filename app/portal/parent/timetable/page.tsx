import { getParentChildren, getChildTimetable } from "@/actions/parent-portal.actions"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, MapPin, User, BookOpen } from "lucide-react"

const DAY_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const

const DAY_LABELS: Record<string, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
}

export default async function ParentTimetablePage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>
}) {
  const params = await searchParams
  const children = await getParentChildren()

  if (children.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Timetable</h2>
          <p className="text-muted-foreground">View your children&apos;s class schedule</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No children found in your account.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const studentId = params.student

  if (!studentId) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Timetable</h2>
          <p className="text-muted-foreground">Select a child to view their weekly schedule</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {children.map((child) => (
            <Link key={child.id} href={`/portal/parent/timetable?student=${child.id}`}>
              <Card className="transition-colors hover:bg-accent cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-base">
                    {child.firstName} {child.lastName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {child.enrollments[0] ? (
                    <p className="text-sm text-muted-foreground">
                      {child.enrollments[0].class.name}
                      {child.enrollments[0].section ? ` - ${child.enrollments[0].section.name}` : ""}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No active enrollment</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  const selectedChild = children.find((c) => c.id === studentId)
  if (!selectedChild) redirect("/portal/parent/timetable")

  const timetable = await getChildTimetable(studentId)

  const grouped: Record<string, typeof timetable> = {}
  for (const day of DAY_ORDER) {
    grouped[day] = timetable
      .filter((entry) => entry.dayOfWeek === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Weekly Timetable</h2>
            <p className="text-muted-foreground">
              {selectedChild.firstName} {selectedChild.lastName}
              {selectedChild.enrollments[0]
                ? ` — ${selectedChild.enrollments[0].class.name}${selectedChild.enrollments[0].section ? ` - ${selectedChild.enrollments[0].section.name}` : ""}`
                : ""}
            </p>
          </div>
        </div>
        <Link href="/portal/parent/timetable">
          <Button variant="outline">Change Child</Button>
        </Link>
      </div>

      {timetable.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No timetable entries found for this child.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {DAY_ORDER.map((day) => {
            const slots = grouped[day]
            if (!slots || slots.length === 0) return null

            return (
              <Card key={day}>
                <CardHeader>
                  <CardTitle className="text-lg">{DAY_LABELS[day]}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {slots.map((slot, index) => (
                      <div
                        key={slot.id || index}
                        className={`rounded-lg border p-3 space-y-2 ${
                          slot.isFree ? "bg-muted/30 border-dashed" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {slot.startTime} – {slot.endTime}
                          </span>
                        </div>
                        {slot.isFree ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              Free Period
                            </Badge>
                            {slot.freePeriodReason && (
                              <span className="text-xs text-muted-foreground">
                                {slot.freePeriodReason}
                              </span>
                            )}
                          </div>
                        ) : (
                          <>
                            <p className="text-sm font-semibold">{slot.subject?.name}</p>
                            {slot.teacher && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <User className="h-4 w-4" />
                                <span>
                                  {slot.teacher.firstName} {slot.teacher.lastName}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                        {slot.room && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{slot.room}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
