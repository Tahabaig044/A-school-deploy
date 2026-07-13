"use client"

import { useState, useEffect } from "react"
import { Calendar, Clock, MapPin, Users, Check, X, Download, MessageSquare } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getMeetings, updateAttendeeStatus, addMeetingNote, downloadMeetingIcs } from "@/actions/meeting.actions"
import { useToast } from "@/hooks/use-toast"

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  COMPLETED: "bg-gray-100 text-gray-800",
  CANCELLED: "bg-red-100 text-red-800",
  RESCHEDULED: "bg-purple-100 text-purple-800",
}

const ATTENDEE_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  ACCEPTED: "bg-green-100 text-green-800",
  DECLINED: "bg-red-100 text-red-800",
  TENTATIVE: "bg-blue-100 text-blue-800",
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
}

export default function ParentMeetingsPage() {
  const { toast } = useToast()
  const [meetings, setMeetings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [noteText, setNoteText] = useState("")
  const [noteMeetingId, setNoteMeetingId] = useState<string | null>(null)

  useEffect(() => { loadMeetings() }, [])

  async function loadMeetings() {
    setLoading(true)
    const data = await getMeetings()
    setMeetings(data as any)
    setLoading(false)
  }

  async function handleAttendeeStatus(meetingId: string, profileId: string, status: string) {
    await updateAttendeeStatus(meetingId, profileId, status)
    toast({ title: `Status: ${status.toLowerCase()}` })
    loadMeetings()
  }

  async function handleAddNote(meetingId: string) {
    if (!noteText.trim()) return
    await addMeetingNote(meetingId, noteText)
    setNoteText("")
    setNoteMeetingId(null)
    toast({ title: "Note added" })
    loadMeetings()
  }

  async function handleDownloadIcs(meetingId: string) {
    const ics = await downloadMeetingIcs(meetingId)
    if (!ics) return
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `meeting-${meetingId}.ics`
    a.click()
    URL.revokeObjectURL(url)
  }

  const now = new Date()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">My Meetings</h2>
        <p className="text-muted-foreground">View and manage your scheduled meetings</p>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading meetings...</div>
        ) : meetings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No meetings</p>
              <p className="text-sm text-muted-foreground">You have no scheduled meetings.</p>
            </CardContent>
          </Card>
        ) : (
          meetings.map((meeting) => {
            const myAttendance = meeting.attendees?.find((a: any) => a.status && a.profile)
            const isPast = new Date(meeting.endDateTime) < now
            return (
              <Card key={meeting.id} className={isPast ? "opacity-75" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{meeting.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">{meeting.meetingType.replace(/_/g, " ")}</p>
                    </div>
                    <Badge className={STATUS_COLORS[meeting.status] || ""}>{meeting.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {meeting.description && (
                    <p className="text-sm text-muted-foreground">{meeting.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(meeting.startDateTime)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatTime(meeting.startDateTime)} - {formatTime(meeting.endDateTime)}
                    </div>
                    {meeting.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {meeting.location}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {meeting.attendees?.length || 0} attendees
                    </div>
                  </div>

                  {myAttendance && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">My Status:</span>
                      <Badge variant="outline" className={ATTENDEE_STATUS_COLORS[myAttendance.status] || ""}>
                        {myAttendance.status}
                      </Badge>
                      {meeting.status !== "CANCELLED" && meeting.status !== "REJECTED" && meeting.status !== "COMPLETED" && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleAttendeeStatus(meeting.id, myAttendance.profileId, "ACCEPTED")}>
                            <Check className="h-3 w-3 mr-1" />
                            Accept
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleAttendeeStatus(meeting.id, myAttendance.profileId, "DECLINED")}>
                            <X className="h-3 w-3 mr-1" />
                            Decline
                          </Button>
                        </>
                      )}
                    </div>
                  )}

                  {meeting.notes && meeting.notes.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Notes</h4>
                      <div className="space-y-2">
                        {meeting.notes.map((note: any) => (
                          <div key={note.id} className="border rounded p-3 bg-muted/30">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{note.author?.firstName} {note.author?.lastName}</span>
                              <span className="text-xs text-muted-foreground">{new Date(note.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="text-sm">{note.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    {meeting.status !== "CANCELLED" && meeting.status !== "REJECTED" && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => setNoteMeetingId(meeting.id)}>
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Add Note
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDownloadIcs(meeting.id)}>
                          <Download className="h-4 w-4 mr-1" />
                          Calendar
                        </Button>
                      </>
                    )}
                  </div>

                  {noteMeetingId === meeting.id && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter your note..."
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                      />
                      <Button size="sm" onClick={() => handleAddNote(meeting.id)}>Add</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
