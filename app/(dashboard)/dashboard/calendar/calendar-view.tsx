"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createCalendarEvent, deleteCalendarEvent } from "@/actions/calendar.actions"
import { useToast } from "@/hooks/use-toast"
import { Calendar, ChevronLeft, ChevronRight, Plus, Trash2, Clock, MapPin } from "lucide-react"

const EVENT_TYPE_COLORS: Record<string, string> = {
  HOLIDAY: "bg-red-100 text-red-800",
  EXAM: "bg-orange-100 text-orange-800",
  EVENT: "bg-blue-100 text-blue-800",
  MEETING: "bg-green-100 text-green-800",
  ACADEMIC_SESSION: "bg-purple-100 text-purple-800",
  OTHER: "bg-gray-100 text-gray-800",
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function CalendarView({
  events,
  holidays,
  exams,
  currentMonth,
  currentYear,
  view,
}: {
  events: any[]
  holidays: any[]
  exams: any[]
  currentMonth: number
  currentYear: number
  view: string
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  async function handleCreateEvent(formData: FormData) {
    const res = await createCalendarEvent(null, formData)
    if (res?.error) {
      toast({ title: "Error", description: res.error, variant: "destructive" })
    } else {
      setOpen(false)
      toast({ title: "Event created" })
      router.refresh()
    }
  }

  async function handleDeleteEvent(eventId: string) {
    await deleteCalendarEvent(eventId)
    toast({ title: "Event deleted" })
    router.refresh()
  }

  function navigateMonth(direction: number) {
    let newMonth = currentMonth + direction
    let newYear = currentYear
    if (newMonth < 0) {
      newMonth = 11
      newYear--
    } else if (newMonth > 11) {
      newMonth = 0
      newYear++
    }
    router.push(`/dashboard/calendar?month=${newMonth}&year=${newYear}&view=${view}`)
  }

  function getDaysInMonth() {
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()

    const days = []
    for (let i = 0; i < startingDay; i++) {
      days.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    return days
  }

  function getEventsForDay(day: number) {
    const date = new Date(currentYear, currentMonth, day)
    return events.filter((event) => {
      const start = new Date(event.startDate)
      const end = new Date(event.endDate)
      return date >= start && date <= end
    })
  }

  function openCreateEvent(day: number) {
    setSelectedDate(new Date(currentYear, currentMonth, day))
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Academic Calendar" description="View and manage academic calendar">
        <Button onClick={() => openCreateEvent(new Date().getDate())}>
          <Plus className="mr-2 h-4 w-4" />
          Add Event
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle>
                  {MONTHS[currentMonth]} {currentYear}
                </CardTitle>
                <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {DAYS.map((day) => (
                  <div
                    key={day}
                    className="text-muted-foreground py-2 text-center text-sm font-medium"
                  >
                    {day}
                  </div>
                ))}
                {getDaysInMonth().map((day, index) => (
                  <div
                    key={index}
                    className={`min-h-[80px] rounded border p-1 ${
                      day ? "hover:bg-muted/50 cursor-pointer" : ""
                    }`}
                    onClick={() => day && openCreateEvent(day)}
                  >
                    {day && (
                      <>
                        <div className="text-sm font-medium">{day}</div>
                        <div className="space-y-1">
                          {getEventsForDay(day)
                            .slice(0, 2)
                            .map((event) => (
                              <div
                                key={event.id}
                                className={`rounded p-1 text-xs ${EVENT_TYPE_COLORS[event.eventType] || ""}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {event.title}
                              </div>
                            ))}
                          {getEventsForDay(day).length > 2 && (
                            <div className="text-muted-foreground text-xs">
                              +{getEventsForDay(day).length - 2} more
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming Holidays</CardTitle>
            </CardHeader>
            <CardContent>
              {holidays.length === 0 ? (
                <p className="text-muted-foreground text-sm">No upcoming holidays</p>
              ) : (
                <div className="space-y-3">
                  {holidays.slice(0, 5).map((holiday) => (
                    <div key={holiday.id} className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                      <div>
                        <p className="text-sm font-medium">{holiday.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {new Date(holiday.startDate).toLocaleDateString()} -{" "}
                          {new Date(holiday.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming Exams</CardTitle>
            </CardHeader>
            <CardContent>
              {exams.length === 0 ? (
                <p className="text-muted-foreground text-sm">No upcoming exams</p>
              ) : (
                <div className="space-y-3">
                  {exams.slice(0, 5).map((exam) => (
                    <div key={exam.id} className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-orange-500" />
                      <div>
                        <p className="text-sm font-medium">{exam.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {new Date(exam.startDate).toLocaleDateString()} -{" "}
                          {new Date(exam.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Create Calendar Event
              {selectedDate && ` - ${selectedDate.toLocaleDateString()}`}
            </DialogTitle>
          </DialogHeader>
          <form action={handleCreateEvent} className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="eventType">Type</Label>
                <select id="eventType" name="eventType" className="w-full rounded border p-2">
                  <option value="HOLIDAY">Holiday</option>
                  <option value="EXAM">Exam</option>
                  <option value="EVENT">Event</option>
                  <option value="MEETING">Meeting</option>
                  <option value="ACADEMIC_SESSION">Academic Session</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <Label htmlFor="color">Color</Label>
                <Input id="color" name="color" type="color" className="h-10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  required
                  defaultValue={selectedDate?.toISOString().split("T")[0]}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  required
                  defaultValue={selectedDate?.toISOString().split("T")[0]}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="checkbox"
                id="isAllDay"
                name="isAllDay"
                defaultChecked
                className="h-4 w-4"
              />
              <Label htmlFor="isAllDay">All Day Event</Label>
            </div>
            <Button type="submit" className="w-full">
              Create Event
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
