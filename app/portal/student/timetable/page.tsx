import { getStudentTimetable } from "@/actions/student-portal.actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin, User } from "lucide-react"

const DAY_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const

const DAY_LABELS: Record<string, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
}

export default async function StudentTimetablePage() {
  const timetable = await getStudentTimetable()

  const grouped: Record<string, typeof timetable> = {}
  for (const day of DAY_ORDER) {
    grouped[day] = timetable
      .filter((entry) => entry.dayOfWeek === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Calendar className="text-primary h-6 w-6" />
        <h1 className="text-2xl font-bold tracking-tight">Weekly Timetable</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {DAY_ORDER.map((day) => {
          const slots = grouped[day]

          return (
            <Card key={day}>
              <CardHeader>
                <CardTitle className="text-lg">{DAY_LABELS[day]}</CardTitle>
              </CardHeader>
              <CardContent>
                {slots.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No classes scheduled</p>
                ) : (
                  <div className="space-y-4">
                    {slots.map((slot, index) => (
                      <div
                        key={index}
                        className={`space-y-2 rounded-lg border p-3 ${slot.isFree ? "bg-muted/30 border-dashed" : ""}`}
                      >
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Clock className="text-muted-foreground h-4 w-4" />
                          <span>
                            {slot.startTime} – {slot.endTime}
                          </span>
                        </div>
                        {slot.isFree ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-muted-foreground text-xs">
                              Free Period
                            </Badge>
                            {slot.freePeriodReason && (
                              <span className="text-muted-foreground text-xs">
                                {slot.freePeriodReason}
                              </span>
                            )}
                          </div>
                        ) : (
                          <>
                            <p className="text-sm font-semibold">{slot.subject?.name}</p>
                            <div className="text-muted-foreground flex items-center gap-2 text-sm">
                              <User className="h-4 w-4" />
                              <span>
                                {slot.teacher?.firstName} {slot.teacher?.lastName}
                              </span>
                            </div>
                          </>
                        )}
                        <div className="text-muted-foreground flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4" />
                          <span>{slot.room}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
