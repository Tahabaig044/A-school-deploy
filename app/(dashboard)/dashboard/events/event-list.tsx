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
import {
  createEvent,
  registerForEvent,
  cancelEventRegistration,
  updateEventStatus,
} from "@/actions/event.actions"
import { useToast } from "@/hooks/use-toast"
import { Calendar, Clock, MapPin, Users, Plus, Check, X } from "lucide-react"

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  PUBLISHED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  COMPLETED: "bg-blue-100 text-blue-800",
}

const TYPE_COLORS: Record<string, string> = {
  SCHOOL: "bg-purple-100 text-purple-800",
  BRANCH: "bg-blue-100 text-blue-800",
  CLASS: "bg-green-100 text-green-800",
}

export function EventList({ events, activeType }: { events: any[]; activeType: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [locationType, setLocationType] = useState("")
  const [customLocation, setCustomLocation] = useState("")

  async function handleCreateEvent(formData: FormData) {
    formData.set(
      "isRegistrationRequired",
      formData.get("isRegistrationRequired") === "on" ? "true" : "false",
    )
    const location = locationType === "Custom" ? customLocation : locationType
    formData.set("location", location)

    const res = await createEvent(null, formData)
    if (res?.error) {
      toast({ title: "Error", description: res.error, variant: "destructive" })
    } else {
      setOpen(false)
      toast({ title: "Event created" })
      router.refresh()
    }
  }

  async function handleRegister(eventId: string) {
    try {
      await registerForEvent(eventId)
      toast({ title: "Registered for event" })
      router.refresh()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  async function handleCancelRegistration(eventId: string) {
    await cancelEventRegistration(eventId)
    toast({ title: "Registration cancelled" })
    router.refresh()
  }

  async function handleUpdateStatus(eventId: string, status: string) {
    await updateEventStatus(eventId, status)
    toast({ title: `Event ${status.toLowerCase()}` })
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Events" description="Manage school events">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Event</DialogTitle>
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
                    <option value="SCHOOL">School</option>
                    <option value="BRANCH">Branch</option>
                    <option value="CLASS">Class</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <select
                    id="location"
                    value={locationType}
                    onChange={(e) => setLocationType(e.target.value)}
                    className="w-full rounded border p-2"
                  >
                    <option value="">Select location...</option>
                    <option value="Campus">Campus</option>
                    <option value="Building">Building</option>
                    <option value="Floor">Floor</option>
                    <option value="Room">Room</option>
                    <option value="Auditorium">Auditorium</option>
                    <option value="Playground">Playground</option>
                    <option value="Library">Library</option>
                    <option value="Science Lab">Science Lab</option>
                    <option value="Online (Google Meet)">Online Meeting (Google Meet)</option>
                    <option value="Online (Zoom)">Online Meeting (Zoom)</option>
                    <option value="Custom">Custom location...</option>
                  </select>
                  {locationType === "Custom" && (
                    <Input
                      className="mt-2"
                      placeholder="Enter custom location"
                      value={customLocation}
                      onChange={(e) => setCustomLocation(e.target.value)}
                    />
                  )}
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
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Input
                    type="checkbox"
                    id="isRegistrationRequired"
                    name="isRegistrationRequired"
                    className="h-4 w-4"
                  />
                  <Label htmlFor="isRegistrationRequired">Registration Required</Label>
                </div>
                <div>
                  <Label htmlFor="maxParticipants">Max Participants</Label>
                  <Input id="maxParticipants" name="maxParticipants" type="number" />
                </div>
              </div>
              <Button type="submit" className="w-full">
                Create Event
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Tabs value={activeType} onValueChange={(v) => router.push(`/dashboard/events?type=${v}`)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="SCHOOL">School</TabsTrigger>
          <TabsTrigger value="BRANCH">Branch</TabsTrigger>
          <TabsTrigger value="CLASS">Class</TabsTrigger>
        </TabsList>

        <TabsContent value={activeType} className="space-y-4">
          {events.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No events found</p>
          ) : (
            events.map((event) => (
              <Card key={event.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{event.title}</CardTitle>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge className={TYPE_COLORS[event.eventType] || ""}>
                          {event.eventType}
                        </Badge>
                        <Badge className={STATUS_COLORS[event.status] || ""}>{event.status}</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{event._count.registrations} registered</p>
                      {event.maxParticipants && (
                        <p className="text-muted-foreground text-xs">
                          Max: {event.maxParticipants}
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {event.description && (
                    <p className="text-muted-foreground text-sm">{event.description}</p>
                  )}
                  <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(event.startDateTime).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {new Date(event.startDateTime).toLocaleTimeString()} -{" "}
                      {new Date(event.endDateTime).toLocaleTimeString()}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {event.location}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {event.registrations && event.registrations.length > 0 ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelRegistration(event.id)}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Cancel Registration
                      </Button>
                    ) : event.isRegistrationRequired ? (
                      <Button size="sm" onClick={() => handleRegister(event.id)}>
                        <Check className="mr-2 h-4 w-4" />
                        Register
                      </Button>
                    ) : null}
                    {event.status === "DRAFT" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateStatus(event.id, "PUBLISHED")}
                      >
                        Publish
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
