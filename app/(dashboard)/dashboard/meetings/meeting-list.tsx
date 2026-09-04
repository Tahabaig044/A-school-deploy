"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { UserPicker } from "@/components/ui/user-picker"
import {
  createMeeting,
  addMeetingNote,
  approveMeeting,
  rejectMeeting,
  cancelMeeting,
  completeMeeting,
  editMeeting,
  downloadMeetingIcs,
} from "@/actions/meeting.actions"
import { useToast } from "@/hooks/use-toast"
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Check,
  X,
  Plus,
  FileText,
  Download,
  Pencil,
  Ban,
} from "lucide-react"

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

export function MeetingList({
  meetings,
  activeType,
  canApprove = false,
}: {
  meetings: any[]
  activeType: string
  canApprove?: boolean
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [createOpen, setCreateOpen] = useState(false)
  const [editMeeting, setEditMeeting] = useState<any>(null)
  const [noteMeeting, setNoteMeeting] = useState<any>(null)
  const [noteContent, setNoteContent] = useState("")
  const [attendeesList, setAttendeesList] = useState<string[]>([])
  const [editAttendees, setEditAttendees] = useState<string[]>([])

  async function handleCreateMeeting(formData: FormData) {
    const attendeeIds = formData.get("attendeeIds") as string
    formData.set("attendeeIds", attendeeIds)
    const res = await createMeeting(null, formData)
    if (res?.error) {
      toast({ title: "Error", description: res.error, variant: "destructive" })
    } else {
      setCreateOpen(false)
      toast({ title: "Meeting created" })
      router.refresh()
    }
  }

  async function handleEditSubmit(meetingId: string, formData: FormData) {
    const res = await editMeeting(meetingId, null, formData)
    if (res?.error) {
      toast({ title: "Error", description: res.error, variant: "destructive" })
    } else {
      setEditMeeting(null)
      toast({ title: "Meeting updated" })
      router.refresh()
    }
  }

  async function handleApprove(meetingId: string) {
    await approveMeeting(meetingId)
    toast({ title: "Meeting approved" })
    router.refresh()
  }

  async function handleReject(meetingId: string) {
    await rejectMeeting(meetingId)
    toast({ title: "Meeting rejected" })
    router.refresh()
  }

  async function handleCancel(meetingId: string) {
    await cancelMeeting(meetingId)
    toast({ title: "Meeting cancelled" })
    router.refresh()
  }

  async function handleComplete(meetingId: string) {
    await completeMeeting(meetingId)
    toast({ title: "Meeting completed" })
    router.refresh()
  }

  async function handleAddNote(meetingId: string) {
    if (!noteContent.trim()) return
    await addMeetingNote(meetingId, noteContent)
    setNoteContent("")
    setNoteMeeting(null)
    toast({ title: "Note added" })
    router.refresh()
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

  function openEdit(m: any) {
    setEditMeeting(m)
    setEditAttendees(m.attendees?.map((a: any) => a.profileId) || [])
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Meetings" description="Manage meetings and conferences">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Meeting
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Meeting</DialogTitle>
            </DialogHeader>
            <form action={handleCreateMeeting} className="space-y-4">
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
                  <Label htmlFor="meetingType">Type</Label>
                  <select id="meetingType" name="meetingType" className="w-full rounded border p-2">
                    <option value="PARENT_TEACHER">Parent-Teacher</option>
                    <option value="STAFF">Staff</option>
                    <option value="DEPARTMENT">Department</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" name="location" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDateTime">Start</Label>
                  <Input id="startDateTime" name="startDateTime" type="datetime-local" required />
                </div>
                <div>
                  <Label htmlFor="endDateTime">End</Label>
                  <Input id="endDateTime" name="endDateTime" type="datetime-local" required />
                </div>
              </div>
              <div>
                <Label>Attendees</Label>
                <UserPicker
                  name="attendeeIds"
                  selected={attendeesList}
                  onChange={setAttendeesList}
                  multiple={true}
                  placeholder="Search users..."
                />
              </div>
              <Button type="submit" className="w-full">
                Create Meeting
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Tabs value={activeType} onValueChange={(v) => router.push(`/dashboard/meetings?type=${v}`)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="PARENT_TEACHER">Parent-Teacher</TabsTrigger>
          <TabsTrigger value="STAFF">Staff</TabsTrigger>
          <TabsTrigger value="DEPARTMENT">Department</TabsTrigger>
        </TabsList>

        <TabsContent value={activeType} className="space-y-4">
          {meetings.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No meetings found</p>
          ) : (
            meetings.map((meeting) => (
              <Card key={meeting.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{meeting.title}</CardTitle>
                      <p className="text-muted-foreground text-sm">
                        {meeting.meetingType.replace(/_/g, " ")}
                      </p>
                    </div>
                    <span className="flex items-center gap-2">
                      <Badge className={STATUS_COLORS[meeting.status] || ""}>
                        {meeting.status}
                      </Badge>
                      {meeting.status === "CANCELLED" || meeting.status === "REJECTED" ? (
                        <Badge variant="outline" className="border-red-200 text-red-700">
                          <Ban className="mr-1 h-3 w-3" />
                          {meeting.status === "CANCELLED" ? "Cancelled" : "Rejected"}
                        </Badge>
                      ) : null}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {meeting.description && (
                    <p className="text-muted-foreground text-sm">{meeting.description}</p>
                  )}
                  <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(meeting.startDateTime).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {new Date(meeting.startDateTime).toLocaleTimeString()} -{" "}
                      {new Date(meeting.endDateTime).toLocaleTimeString()}
                    </div>
                    {meeting.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {meeting.location}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {meeting.attendees.length} attendees
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      Created by {meeting.createdBy?.firstName} {meeting.createdBy?.lastName}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Attendees</h4>
                    <div className="flex flex-wrap gap-2">
                      {meeting.attendees.map((attendee: any) => (
                        <div
                          key={attendee.id}
                          className="flex items-center gap-2 rounded border p-2"
                        >
                          <span className="text-sm">
                            {attendee.profile.firstName} {attendee.profile.lastName}
                            <span className="text-muted-foreground ml-1 text-xs">
                              ({attendee.profile.role})
                            </span>
                          </span>
                          <Badge
                            variant="outline"
                            className={ATTENDEE_STATUS_COLORS[attendee.status] || ""}
                          >
                            {attendee.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {meeting.notes && meeting.notes.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Notes</h4>
                      <div className="space-y-2">
                        {meeting.notes.map((note: any) => (
                          <div key={note.id} className="bg-muted/30 rounded border p-3">
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-sm font-medium">
                                {note.author.firstName} {note.author.lastName}
                              </span>
                              <span className="text-muted-foreground text-xs">
                                {new Date(note.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm">{note.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    {canApprove && meeting.status === "PENDING" && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleApprove(meeting.id)}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleReject(meeting.id)}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                      </>
                    )}
                    {meeting.status !== "CANCELLED" &&
                      meeting.status !== "REJECTED" &&
                      meeting.status !== "COMPLETED" && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => openEdit(meeting)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleComplete(meeting.id)}
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Complete
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCancel(meeting.id)}
                          >
                            <X className="mr-2 h-4 w-4" />
                            Cancel
                          </Button>
                        </>
                      )}
                    <Button variant="outline" size="sm" onClick={() => setNoteMeeting(meeting)}>
                      <FileText className="mr-2 h-4 w-4" />
                      Add Note
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDownloadIcs(meeting.id)}>
                      <Download className="mr-2 h-4 w-4" />
                      Calendar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {noteMeeting && (
        <Dialog open={!!noteMeeting} onOpenChange={() => setNoteMeeting(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Note to {noteMeeting.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="Enter your note..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
              />
              <Button onClick={() => handleAddNote(noteMeeting.id)} className="w-full">
                Add Note
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {editMeeting && (
        <Dialog open={!!editMeeting} onOpenChange={() => setEditMeeting(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Meeting</DialogTitle>
            </DialogHeader>
            <form action={handleEditSubmit.bind(null, editMeeting.id)} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" defaultValue={editMeeting.title} required />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editMeeting.description || ""}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="meetingType">Type</Label>
                  <select
                    id="meetingType"
                    name="meetingType"
                    className="w-full rounded border p-2"
                    defaultValue={editMeeting.meetingType}
                  >
                    <option value="PARENT_TEACHER">Parent-Teacher</option>
                    <option value="STAFF">Staff</option>
                    <option value="DEPARTMENT">Department</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" name="location" defaultValue={editMeeting.location || ""} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDateTime">Start</Label>
                  <Input
                    id="startDateTime"
                    name="startDateTime"
                    type="datetime-local"
                    defaultValue={new Date(editMeeting.startDateTime).toISOString().slice(0, 16)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endDateTime">End</Label>
                  <Input
                    id="endDateTime"
                    name="endDateTime"
                    type="datetime-local"
                    defaultValue={new Date(editMeeting.endDateTime).toISOString().slice(0, 16)}
                    required
                  />
                </div>
              </div>
              <div>
                <Label>Attendees</Label>
                <UserPicker
                  name="attendeeIds"
                  selected={editAttendees}
                  onChange={setEditAttendees}
                  multiple={true}
                  placeholder="Search users..."
                />
              </div>
              <Button type="submit" className="w-full">
                Save Changes
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
