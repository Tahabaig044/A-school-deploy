"use client"

import { useState, useEffect, useActionState } from "react"
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  X,
  CheckCircle2,
  Ban,
  MessageSquare,
  Download,
  Pencil,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  getTeacherMeetings,
  createTeacherMeeting,
  updateTeacherMeetingStatus,
  addTeacherMeetingNote,
} from "@/actions/teacher-portal.actions"
import { cancelMeeting, rescheduleMeeting, downloadMeetingIcs } from "@/actions/meeting.actions"
import { useToast } from "@/hooks/use-toast"

const statusStyles: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  APPROVED: "bg-green-100 text-green-800 border-green-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  COMPLETED: "bg-gray-100 text-gray-800 border-gray-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
  RESCHEDULED: "bg-purple-100 text-purple-800 border-purple-200",
}

const meetingTypeLabels: Record<string, string> = {
  PARENT_TEACHER: "Parent-Teacher",
  STAFF: "Staff",
  DEPARTMENT: "Department",
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
}

export default function TeacherMeetingsPage() {
  const { toast } = useToast()
  const [meetings, setMeetings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [state, formAction, pending] = useActionState(createTeacherMeeting, null)
  const [noteText, setNoteText] = useState<Record<string, string>>({})
  const [editDialog, setEditDialog] = useState<any>(null)
  const [editStart, setEditStart] = useState("")
  const [editEnd, setEditEnd] = useState("")
  const [rescheduleDialog, setRescheduleDialog] = useState<any>(null)
  const [reschedStart, setReschedStart] = useState("")
  const [reschedEnd, setReschedEnd] = useState("")

  useEffect(() => {
    loadMeetings()
  }, [])

  useEffect(() => {
    if (state?.success) {
      loadMeetings()
      setShowForm(false)
    }
  }, [state?.success])

  async function loadMeetings() {
    setLoading(true)
    const data = await getTeacherMeetings()
    setMeetings(data as any)
    setLoading(false)
  }

  async function handleStatusChange(meetingId: string, status: string) {
    await updateTeacherMeetingStatus(meetingId, status)
    toast({ title: `Meeting ${status.toLowerCase()}` })
    loadMeetings()
  }

  async function handleCancel(meetingId: string) {
    await cancelMeeting(meetingId)
    toast({ title: "Meeting cancelled" })
    loadMeetings()
  }

  async function handleReschedule() {
    if (!rescheduleDialog || !reschedStart || !reschedEnd) return
    await rescheduleMeeting(rescheduleDialog.id, reschedStart, reschedEnd)
    setRescheduleDialog(null)
    toast({ title: "Meeting rescheduled" })
    loadMeetings()
  }

  async function handleAddNote(meetingId: string, formData: FormData) {
    formData.set("meetingId", meetingId)
    await addTeacherMeetingNote(null, formData)
    setNoteText((prev) => ({ ...prev, [meetingId]: "" }))
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Meetings</h2>
          <p className="text-muted-foreground">Schedule and manage parent-teacher meetings</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {showForm ? "Cancel" : "New Meeting"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Schedule a Meeting</CardTitle>
            <CardDescription>Fill in the details to create a new meeting</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" name="title" placeholder="e.g. Parent-Teacher Meeting" required />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="meetingType">Type *</Label>
                  <select
                    id="meetingType"
                    name="meetingType"
                    className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                    required
                  >
                    <option value="PARENT_TEACHER">Parent-Teacher</option>
                    <option value="STAFF">Staff</option>
                    <option value="DEPARTMENT">Department</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" name="location" placeholder="Room 101" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="startDateTime">Start *</Label>
                  <Input id="startDateTime" name="startDateTime" type="datetime-local" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endDateTime">End *</Label>
                  <Input id="endDateTime" name="endDateTime" type="datetime-local" required />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="parentProfileId">Attendee Profile ID</Label>
                <Input
                  id="parentProfileId"
                  name="parentProfileId"
                  placeholder="Optional parent profile ID"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={3}
                  placeholder="Meeting agenda..."
                />
              </div>
              {state?.error && <p className="text-destructive text-sm">{state.error}</p>}
              <Button type="submit" disabled={pending}>
                {pending ? "Creating..." : "Create Meeting"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="text-muted-foreground py-8 text-center">Loading meetings...</div>
        ) : meetings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="text-muted-foreground mb-4 h-12 w-12" />
              <p className="text-lg font-medium">No meetings</p>
              <p className="text-muted-foreground text-sm">No meetings scheduled yet.</p>
            </CardContent>
          </Card>
        ) : (
          meetings.map((meeting) => (
            <Card key={meeting.id}>
              <CardContent className="p-4">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="font-semibold">{meeting.title}</h3>
                      <Badge className={statusStyles[meeting.status]}>{meeting.status}</Badge>
                      <Badge variant="outline">
                        {meetingTypeLabels[meeting.meetingType] || meeting.meetingType}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-sm">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(meeting.startDateTime)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(meeting.startDateTime)} - {formatTime(meeting.endDateTime)}
                      </span>
                      {meeting.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {meeting.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {meeting.description && (
                  <p className="text-muted-foreground mb-3 text-sm">{meeting.description}</p>
                )}

                <div className="mb-3 flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">
                    By {meeting.createdBy?.firstName} {meeting.createdBy?.lastName} (
                    {meeting.createdBy?.role})
                  </span>
                  <span className="text-muted-foreground">|</span>
                  <span className="text-muted-foreground">
                    {meeting._count?.notes || 0} note(s)
                  </span>
                </div>

                {meeting.attendees?.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {meeting.attendees.map((a: any) => (
                      <Badge key={a.id} variant="secondary" className="text-xs">
                        {a.profile.firstName} {a.profile.lastName} ({a.profile.role}) - {a.status}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="mb-3 flex flex-wrap gap-2">
                  {(meeting.status === "PENDING" || meeting.status === "APPROVED") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(meeting.id, "COMPLETED")}
                    >
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Complete
                    </Button>
                  )}
                  {meeting.status !== "CANCELLED" &&
                    meeting.status !== "REJECTED" &&
                    meeting.status !== "COMPLETED" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancel(meeting.id)}
                        >
                          <Ban className="mr-1 h-3 w-3" />
                          Cancel
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRescheduleDialog(meeting)
                            setReschedStart(
                              new Date(meeting.startDateTime).toISOString().slice(0, 16),
                            )
                            setReschedEnd(new Date(meeting.endDateTime).toISOString().slice(0, 16))
                          }}
                        >
                          <Clock className="mr-1 h-3 w-3" />
                          Reschedule
                        </Button>
                      </>
                    )}
                  <Button variant="ghost" size="sm" onClick={() => handleDownloadIcs(meeting.id)}>
                    <Download className="mr-1 h-3 w-3" />
                    Calendar
                  </Button>
                </div>

                {meeting.notes?.length > 0 && (
                  <div className="bg-muted/30 mb-3 rounded-md border p-3">
                    <p className="text-muted-foreground mb-2 text-xs font-medium">Recent Notes</p>
                    {meeting.notes.slice(0, 3).map((note: any) => (
                      <div key={note.id} className="mb-1 text-sm">
                        <span className="font-medium">{note.author?.firstName}:</span>{" "}
                        {note.content}
                        <span className="text-muted-foreground ml-2 text-xs">
                          {new Date(note.createdAt).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <form action={handleAddNote.bind(null, meeting.id)} className="flex gap-2">
                  <Input
                    name="content"
                    placeholder="Add a note..."
                    value={noteText[meeting.id] || ""}
                    onChange={(e) =>
                      setNoteText((prev) => ({ ...prev, [meeting.id]: e.target.value }))
                    }
                  />
                  <Button type="submit" size="sm" variant="secondary">
                    <MessageSquare className="mr-1 h-4 w-4" />
                    Add
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {rescheduleDialog && (
        <Dialog open={!!rescheduleDialog} onOpenChange={() => setRescheduleDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reschedule Meeting</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>New Start</Label>
                <Input
                  type="datetime-local"
                  value={reschedStart}
                  onChange={(e) => setReschedStart(e.target.value)}
                />
              </div>
              <div>
                <Label>New End</Label>
                <Input
                  type="datetime-local"
                  value={reschedEnd}
                  onChange={(e) => setReschedEnd(e.target.value)}
                />
              </div>
              <Button onClick={handleReschedule} className="w-full">
                Reschedule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
