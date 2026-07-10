"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { UserPicker } from "@/components/ui/user-picker"
import { createMeeting, updateMeetingStatus, updateAttendeeStatus, addMeetingNote } from "@/actions/meeting.actions"
import { useToast } from "@/hooks/use-toast"
import { Calendar, Clock, MapPin, Users, Check, X, Plus, FileText } from "lucide-react"

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-green-100 text-green-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
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
}: {
  meetings: any[]
  activeType: string
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null)
  const [noteContent, setNoteContent] = useState("")
  const [attendeesList, setAttendeesList] = useState<string[]>([])

  async function handleCreateMeeting(formData: FormData) {
    const attendeeIds = formData.get("attendeeIds") as string
    formData.set("attendeeIds", attendeeIds)

    const res = await createMeeting(null, formData)
    if (res?.error) {
      toast({ title: "Error", description: res.error, variant: "destructive" })
    } else {
      setOpen(false)
      toast({ title: "Meeting created" })
      router.refresh()
    }
  }

  async function handleUpdateStatus(meetingId: string, status: string) {
    await updateMeetingStatus(meetingId, status)
    toast({ title: `Meeting ${status.toLowerCase()}` })
    router.refresh()
  }

  async function handleAttendeeStatus(meetingId: string, profileId: string, status: string) {
    await updateAttendeeStatus(meetingId, profileId, status)
    toast({ title: `Status updated to ${status.toLowerCase()}` })
    router.refresh()
  }

  async function handleAddNote(meetingId: string) {
    if (!noteContent.trim()) return
    await addMeetingNote(meetingId, noteContent)
    setNoteContent("")
    toast({ title: "Note added" })
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Meetings" description="Manage meetings and conferences">
        <Dialog open={open} onOpenChange={setOpen}>
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
                  <select id="meetingType" name="meetingType" className="w-full border rounded p-2">
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
                  placeholder="Search users by name, email, or ID..."
                />
              </div>
              <Button type="submit" className="w-full">Create Meeting</Button>
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
            <p className="text-muted-foreground text-center py-8">No meetings found</p>
          ) : (
            meetings.map((meeting) => (
              <Card key={meeting.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{meeting.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">{meeting.meetingType.replace("_", " ")}</p>
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
                      {new Date(meeting.startDateTime).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {new Date(meeting.startDateTime).toLocaleTimeString()} - {new Date(meeting.endDateTime).toLocaleTimeString()}
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
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Attendees</h4>
                    <div className="flex flex-wrap gap-2">
                      {meeting.attendees.map((attendee: any) => (
                        <div key={attendee.id} className="flex items-center gap-2 border rounded p-2">
                          <span className="text-sm">
                            {attendee.profile.firstName} {attendee.profile.lastName}
                          </span>
                          <Badge variant="outline" className={ATTENDEE_STATUS_COLORS[attendee.status] || ""}>
                            {attendee.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {meeting.notes && meeting.notes.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Notes</h4>
                      <div className="space-y-2">
                        {meeting.notes.map((note: any) => (
                          <div key={note.id} className="border rounded p-3 bg-muted/30">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">
                                {note.author.firstName} {note.author.lastName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(note.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm">{note.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {meeting.status === "SCHEDULED" && (
                      <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(meeting.id, "CONFIRMED")}>
                        <Check className="mr-2 h-4 w-4" />
                        Confirm
                      </Button>
                    )}
                    {meeting.status !== "CANCELLED" && meeting.status !== "COMPLETED" && (
                      <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(meeting.id, "CANCELLED")}>
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setSelectedMeeting(meeting)}>
                      <FileText className="mr-2 h-4 w-4" />
                      Add Note
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {selectedMeeting && (
        <Dialog open={!!selectedMeeting} onOpenChange={() => setSelectedMeeting(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Note to {selectedMeeting.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="Enter your note..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
              />
              <Button onClick={() => handleAddNote(selectedMeeting.id)} className="w-full">
                Add Note
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
