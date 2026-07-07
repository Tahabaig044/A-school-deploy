import { getTeacherTimetable } from "@/actions/teacher-portal.actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin } from "lucide-react"

const DAYS_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const

const DAY_LABELS: Record<string, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
}

type TimetableEntry = Awaited<ReturnType<typeof getTeacherTimetable>>[number]

function groupByDay(entries: TimetableEntry[]) {
  const grouped: Record<string, TimetableEntry[]> = {}
  for (const day of DAYS_ORDER) {
    grouped[day] = []
  }
  for (const entry of entries) {
    if (grouped[entry.dayOfWeek]) {
      grouped[entry.dayOfWeek].push(entry)
    }
  }
  return grouped
}

export default async function TeacherTimetablePage() {
  const timetable = await getTeacherTimetable()
  const grouped = groupByDay(timetable)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Timetable</h2>
        <p className="text-muted-foreground">Your weekly class schedule</p>
      </div>

      {timetable.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No timetable found</p>
            <p className="text-sm text-muted-foreground">
              Your timetable has not been set up yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {DAYS_ORDER.map((day) => {
            const slots = grouped[day]
            if (slots.length === 0) return null

            return (
              <Card key={day}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {DAY_LABELS[day]}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {slots.map((slot) => (
                    <div
                      key={slot.id}
                      className="rounded-lg border p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{slot.subject.name}</p>
                        <Badge variant="secondary">
                          {slot.class.name}
                          {slot.section ? ` - ${slot.section.name}` : ""}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {slot.startTime} - {slot.endTime}
                        </span>
                        {slot.room && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {slot.room}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
