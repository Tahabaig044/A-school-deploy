"use client"

import { useRouter, useSearchParams } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { deleteTimetableSlot } from "@/actions/timetable.actions"
import { TimetablePrintButton } from "./timetable-print"

type SlotItem = {
  id: string
  dayOfWeek: string
  startTime: string
  endTime: string
  room: string | null
  class: { id: string; name: string }
  section: { name: string } | null
  subject: { name: string; code: string }
  teacher: { firstName: string; lastName: string }
  academicSession: { name: string }
}

export function TimetableGrid({
  slots, currentClassId,
}: {
  slots: SlotItem[]
  currentClassId: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]

  function handleClassFilter(value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set("classId", value)
    else params.delete("classId")
    router.push(`/dashboard/timetable?${params.toString()}`)
  }

  function getSlotsForDay(day: string) {
    return slots.filter((s) => s.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime))
  }

  const uniqueClasses = [...new Map(slots.map((s) => [s.class.id, s.class])).values()]

  if (!currentClassId) {
    return (
      <Card>
        <CardHeader><CardTitle>Timetable</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-4">
            <Select value={currentClassId} onValueChange={handleClassFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {uniqueClasses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground">Select a class to view its timetable.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle>Timetable</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={currentClassId} onValueChange={handleClassFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {uniqueClasses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <TimetablePrintButton
              slots={slots.filter((s) => !currentClassId || s.class.id === currentClassId)}
              title={currentClassId ? `Timetable - ${slots.find((s) => s.class.id === currentClassId)?.class.name || ""}` : "Timetable"}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20 md:w-24">Day</TableHead>
              <TableHead className="hidden md:table-cell">Time</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="hidden lg:table-cell">Teacher</TableHead>
              <TableHead className="hidden lg:table-cell">Room</TableHead>
              <TableHead className="hidden md:table-cell">Section</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {days.map((day) => {
              const daySlots = getSlotsForDay(day)
              return (
                <TableRow key={day}>
                  <TableCell className="font-medium">
                    {day.charAt(0) + day.slice(1).toLowerCase()}
                  </TableCell>
                  {daySlots.length === 0 ? (
                    <TableCell colSpan={6} className="text-muted-foreground text-sm">
                      No classes scheduled
                    </TableCell>
                  ) : (
                    <TableCell colSpan={6} className="p-0">
                      <div className="divide-y">
                        {daySlots.map((slot) => (
                          <div key={slot.id} className="flex flex-wrap items-center gap-2 px-4 py-2 text-sm md:gap-4">
                            <span className="hidden md:inline md:w-24 font-medium">{slot.startTime} - {slot.endTime}</span>
                            <span className="md:w-32">{slot.subject.name}</span>
                            <span className="hidden lg:inline lg:w-36">{slot.teacher.firstName} {slot.teacher.lastName}</span>
                            <span className="hidden lg:inline lg:w-20">{slot.room || "-"}</span>
                            <span className="hidden md:inline md:w-16">{slot.section?.name || "All"}</span>
                            <form action={deleteTimetableSlot.bind(null, slot.id)}>
                              <Button variant="ghost" size="sm" type="submit" className="text-destructive">
                                Remove
                              </Button>
                            </form>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
