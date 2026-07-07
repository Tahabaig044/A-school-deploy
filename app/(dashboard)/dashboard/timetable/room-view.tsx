"use client"

import { useEffect, useState } from "react"
import { getRoomUtilization } from "@/actions/timetable.actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin } from "lucide-react"

const DAY_LABELS: Record<string, string> = {
  MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed",
  THURSDAY: "Thu", FRIDAY: "Fri", SATURDAY: "Sat",
}

export function RoomView({ academicSessionId }: { academicSessionId: string }) {
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRoomUtilization(academicSessionId).then((data) => {
      setRooms(data)
      setLoading(false)
    })
  }, [academicSessionId])

  if (loading) return <p className="text-muted-foreground">Loading room data...</p>

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <MapPin className="h-5 w-5" />
        Room Utilization
      </h3>
      {rooms.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No rooms with scheduled classes.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <Card key={room.room}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{room.room}</span>
                  <Badge variant="secondary">{room.totalSlots} slots</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  {room.bookings.map((b: any) => (
                    <div key={b.id} className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {DAY_LABELS[b.dayOfWeek]} {b.startTime}-{b.endTime}
                      </span>
                      <span className="font-medium">{b.subject.name}</span>
                      <span className="text-muted-foreground">{b.class.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
