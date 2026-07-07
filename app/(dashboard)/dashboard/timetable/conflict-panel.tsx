"use client"

import { useEffect, useState } from "react"
import { getAllConflicts } from "@/actions/timetable.actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Users, MapPin, BookOpen } from "lucide-react"

const DAY_LABELS: Record<string, string> = {
  MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed",
  THURSDAY: "Thu", FRIDAY: "Fri", SATURDAY: "Sat",
}

const conflictIcons: Record<string, any> = {
  TEACHER: Users,
  ROOM: MapPin,
  CLASS: BookOpen,
}

export function ConflictPanel({ academicSessionId }: { academicSessionId: string }) {
  const [conflicts, setConflicts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllConflicts(academicSessionId).then((data) => {
      setConflicts(data)
      setLoading(false)
    })
  }, [academicSessionId])

  if (loading) return <p className="text-muted-foreground">Loading conflicts...</p>

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Schedule Conflicts ({conflicts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {conflicts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No conflicts found. Schedule is clean.</p>
          ) : (
            <div className="space-y-3">
              {conflicts.map((c, i) => {
                const Icon = conflictIcons[c.type] || AlertTriangle
                return (
                  <div key={i} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <Badge variant={c.type === "TEACHER" ? "destructive" : c.type === "ROOM" ? "warning" : "secondary"}>
                        {c.type}
                      </Badge>
                      <span className="font-medium text-sm">{c.message}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div>
                        <p className="font-medium text-foreground">{c.slotA.subject.name}</p>
                        <p>{DAY_LABELS[c.slotA.dayOfWeek]} {c.slotA.startTime}-{c.slotA.endTime}</p>
                        <p>{c.slotA.class.name}{c.slotA.section ? `-${c.slotA.section.name}` : ""}</p>
                        {c.slotA.room && <p>Room: {c.slotA.room}</p>}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{c.slotB.subject.name}</p>
                        <p>{DAY_LABELS[c.slotB.dayOfWeek]} {c.slotB.startTime}-{c.slotB.endTime}</p>
                        <p>{c.slotB.class.name}{c.slotB.section ? `-${c.slotB.section.name}` : ""}</p>
                        {c.slotB.room && <p>Room: {c.slotB.room}</p>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
