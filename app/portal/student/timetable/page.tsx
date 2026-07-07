import { getStudentTimetable } from "@/actions/student-portal.actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar, Clock, MapPin, User } from "lucide-react";

const DAY_ORDER = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

const DAY_LABELS: Record<string, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
};

export default async function StudentTimetablePage() {
  const timetable = await getStudentTimetable();

  const grouped: Record<string, typeof timetable> = {};
  for (const day of DAY_ORDER) {
    grouped[day] = timetable
      .filter((entry) => entry.dayOfWeek === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Calendar className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">
          Weekly Timetable
        </h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {DAY_ORDER.map((day) => {
          const slots = grouped[day];

          return (
            <Card key={day}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {DAY_LABELS[day]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No classes scheduled
                  </p>
                ) : (
                  <div className="space-y-4">
                    {slots.map((slot, index) => (
                      <div
                        key={index}
                        className="rounded-lg border p-3 space-y-2"
                      >
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {slot.startTime} – {slot.endTime}
                          </span>
                        </div>
                        <p className="text-sm font-semibold">
                          {slot.subject.name}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>
                            {slot.teacher.firstName}{" "}
                            {slot.teacher.lastName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{slot.room}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
