"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar, Clock, MapPin, BookOpen, Users, User, Printer, FileDown, ChevronRight, Eye } from "lucide-react"

const DAYS_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const

const DAY_LABELS: Record<string, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
}

type Slot = {
  id: string
  dayOfWeek: string
  startTime: string
  endTime: string
  room: string | null
  isFree: boolean
  freePeriodReason: string | null
  class: { id: string; name: string }
  section: { id: string; name: string } | null
  subject: { id: string; name: string; code: string | null } | null
  teacher: { id: string; profile: { firstName: string; lastName: string } | null } | null
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

function isCurrentSlot(slot: Slot, now: Date, dayName: string) {
  if (slot.dayOfWeek !== dayName) return false
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const startMin = timeToMinutes(slot.startTime)
  const endMin = timeToMinutes(slot.endTime)
  return nowMin >= startMin && nowMin < endMin
}

function isNextSlot(slot: Slot, now: Date, dayName: string, allSlots: Slot[]) {
  if (slot.dayOfWeek !== dayName) return false
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const startMin = timeToMinutes(slot.startTime)
  if (startMin <= nowMin) return false
  const todaySlots = allSlots
    .filter((s) => s.dayOfWeek === dayName)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
  const nextSlot = todaySlots.find((s) => timeToMinutes(s.startTime) > nowMin)
  return nextSlot?.id === slot.id
}

export function TimetableViewer({
  timetable,
}: {
  timetable: Slot[]
}) {
  const [now, setNow] = useState(new Date())
  const [detailSlot, setDetailSlot] = useState<Slot | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const dayNames = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]
  const todayName = dayNames[now.getDay()]

  const todaySlots = timetable
    .filter((s) => s.dayOfWeek === todayName)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))

  const currentSlot = todaySlots.find((s) => isCurrentSlot(s, now, todayName))
  const nextSlot = todaySlots.find((s) => isNextSlot(s, now, todayName, timetable))

  function groupByDay(entries: Slot[]) {
    const grouped: Record<string, Slot[]> = {}
    for (const day of DAYS_ORDER) {
      grouped[day] = entries.filter((e) => e.dayOfWeek === day).sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
    }
    return grouped
  }

  const grouped = groupByDay(timetable)

  function handlePrint() {
    window.print()
  }

  async function handleExportPdf() {
    try {
      const { default: html2pdf } = await import("html2pdf.js")
      const element = printRef.current
      if (!element) return
      html2pdf().set({
        margin: 10,
        filename: "timetable.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
      }).from(element).save()
    } catch {
      window.print()
    }
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Timetable</h2>
          <p className="text-sm text-muted-foreground">Your weekly class schedule</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1.5" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf}>
            <FileDown className="h-4 w-4 mr-1.5" />
            Export PDF
          </Button>
        </div>
      </div>

      {timetable.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No timetable found</p>
            <p className="text-sm text-muted-foreground">Your timetable has not been set up yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div ref={printRef}>
          {/* Today's Schedule */}
          {todaySlots.length > 0 && (
            <div className="mb-8 print:mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Today&apos;s Schedule</h3>
                <Badge variant="outline" className="ml-auto print:hidden">
                  {todaySlots.length} period{todaySlots.length !== 1 ? "s" : ""}
                </Badge>
              </div>
              <div className="space-y-2">
                {todaySlots.map((slot) => {
                  const isCurrent = slot.id === currentSlot?.id
                  const isNext = !isCurrent && slot.id === nextSlot?.id
                  return (
                    <div
                      key={slot.id}
                      className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-2 sm:p-3 rounded-lg border transition-colors ${
                        isCurrent
                          ? "border-primary bg-primary/10 ring-1 ring-primary"
                          : isNext
                            ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20"
                            : slot.isFree
                              ? "bg-muted/30 border-dashed"
                              : "hover:bg-accent/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="text-center min-w-[50px] sm:min-w-[55px] shrink-0">
                          <div className="text-sm font-bold">{slot.startTime}</div>
                          <div className="text-xs text-muted-foreground">{slot.endTime}</div>
                        </div>
                        <div className="min-w-0 flex-1">
                          {slot.isFree ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge variant="outline" className="text-xs text-muted-foreground">Free Period</Badge>
                              {slot.freePeriodReason && <span className="text-xs text-muted-foreground truncate">{slot.freePeriodReason}</span>}
                            </div>
                          ) : (
                            <>
                              <div className="font-medium text-sm truncate flex items-center gap-1.5">
                                {slot.subject?.name}
                                {isCurrent && <Badge className="text-[10px] h-4 px-1.5">Current</Badge>}
                                {isNext && !isCurrent && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Next</Badge>}
                              </div>
                              <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1">
                                <span className="truncate">{slot.class.name}{slot.section ? ` - ${slot.section.name}` : ""}</span>
                                {slot.room && (
                                  <span className="flex items-center gap-0.5">
                                    <MapPin className="h-3 w-3 shrink-0" />{slot.room}
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="shrink-0 self-end sm:self-auto print:hidden" onClick={() => setDetailSlot(slot)}>
                        <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1.5" />
                        <span className="inline sm:hidden">Details</span>
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Weekly Grid */}
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3">
            {DAYS_ORDER.map((day) => {
              const slots = grouped[day]
              if (slots.length === 0) return null

              return (
                <Card key={day} className="print:break-inside-avoid">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {DAY_LABELS[day]}
                      {day === todayName && <Badge variant="secondary" className="text-[10px] h-4 px-1.5 print:hidden">Today</Badge>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {slots.map((slot) => {
                      const isCurrent = slot.dayOfWeek === todayName && slot.id === currentSlot?.id
                      const isNext = slot.dayOfWeek === todayName && !isCurrent && slot.id === nextSlot?.id
                      return (
                        <div
                          key={slot.id}
                          className={`rounded-lg border p-2.5 space-y-1.5 transition-colors ${
                            isCurrent
                              ? "border-primary bg-primary/10 ring-1 ring-primary"
                              : isNext
                                ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20"
                                : slot.isFree
                                  ? "bg-muted/30 border-dashed"
                                  : ""
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3 shrink-0" />
                              <span className="font-medium text-foreground">{slot.startTime}</span>
                              <span>– {slot.endTime}</span>
                            </div>
                            {slot.isFree ? (
                              <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-muted-foreground">Free</Badge>
                            ) : (
                              <Button variant="ghost" size="icon" className="h-5 w-5 print:hidden" onClick={() => setDetailSlot(slot)}>
                                <Eye className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          {slot.isFree ? (
                            slot.freePeriodReason && <p className="text-xs text-muted-foreground">{slot.freePeriodReason}</p>
                          ) : (
                            <>
                              <p className="text-sm font-medium truncate">{slot.subject?.name}</p>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3 shrink-0" />
                                  {slot.class.name}{slot.section ? ` - ${slot.section.name}` : ""}
                                </span>
                                {slot.room && (
                                  <span className="flex items-center gap-0.5">
                                    <MapPin className="h-3 w-3 shrink-0" />{slot.room}
                                  </span>
                                )}
                                {slot.teacher?.profile && (
                                  <span className="flex items-center gap-0.5">
                                    <User className="h-3 w-3 shrink-0" />{slot.teacher.profile.firstName} {slot.teacher.profile.lastName}
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailSlot} onOpenChange={(open) => !open && setDetailSlot(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {detailSlot?.subject?.name || "Free Period"}
            </DialogTitle>
          </DialogHeader>
          {detailSlot && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Day</p>
                  <p className="text-sm font-medium">{DAY_LABELS[detailSlot.dayOfWeek]}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="text-sm font-medium">{detailSlot.startTime} – {detailSlot.endTime}</p>
                </div>
              </div>
              {detailSlot.isFree ? (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Type</p>
                  <Badge variant="outline" className="text-muted-foreground">Free Period</Badge>
                  {detailSlot.freePeriodReason && (
                    <>
                      <p className="text-xs text-muted-foreground mt-2">Reason</p>
                      <p className="text-sm">{detailSlot.freePeriodReason}</p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Class</p>
                      <p className="text-sm font-medium">{detailSlot.class.name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Section</p>
                      <p className="text-sm font-medium">{detailSlot.section?.name || "N/A"}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Subject</p>
                      <p className="text-sm font-medium">{detailSlot.subject?.name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Room</p>
                      <p className="text-sm font-medium">{detailSlot.room || "N/A"}</p>
                    </div>
                  </div>
                  {detailSlot.teacher?.profile && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Teacher</p>
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        {detailSlot.teacher.profile.firstName} {detailSlot.teacher.profile.lastName}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
