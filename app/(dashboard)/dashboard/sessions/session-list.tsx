"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { setCurrentSession, deleteSession, updateSession } from "@/actions/session.actions"
import { useToast } from "@/hooks/use-toast"
import { Pencil, Trash2, Plus } from "lucide-react"

type Session = {
  id: string
  name: string
  startDate: Date
  endDate: Date
  isCurrent: boolean
  school: { name: string }
}

export function SessionList({ sessions }: { sessions: Session[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [editItem, setEditItem] = useState<Session | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    if (!editItem) return
    const res = await updateSession(editItem.id, null, formData)
    if (res?.error) {
      setError(res.error)
    } else {
      setOpen(false)
      setEditItem(null)
      setError(null)
      toast({ title: "Session updated" })
      router.refresh()
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete session "${name}"?`)) return
    try {
      await deleteSession(id)
      toast({ title: "Session deleted" })
      router.refresh()
    } catch {
      toast({ title: "Failed to delete session", variant: "destructive" })
    }
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No academic sessions created yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>All Sessions ({sessions.length})</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>School</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell className="font-medium">{session.name}</TableCell>
                <TableCell>{session.school.name}</TableCell>
                <TableCell>
                  {session.startDate.toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {session.endDate.toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {session.isCurrent ? (
                    <span className="text-green-600 font-medium">Current</span>
                  ) : (
                    "Inactive"
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {!session.isCurrent && (
                      <form action={setCurrentSession.bind(null, session.id)}>
                        <Button variant="outline" size="sm" type="submit">
                          Set Current
                        </Button>
                      </form>
                    )}
                    <Dialog open={open && editItem?.id === session.id} onOpenChange={(o) => { setOpen(o); if (!o) { setEditItem(null); setError(null) } }}>
                      <DialogTrigger render={<Button variant="ghost" size="icon" />}>
                        <Pencil className="h-4 w-4" />
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Session</DialogTitle>
                        </DialogHeader>
                        <form action={handleSubmit} className="space-y-4">
                          {error && <p className="text-sm text-red-500">{error}</p>}
                          <div>
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" name="name" defaultValue={session.name} required />
                          </div>
                          <div>
                            <Label htmlFor="startDate">Start Date</Label>
                            <Input id="startDate" name="startDate" type="date" defaultValue={session.startDate.toISOString().split("T")[0]} required />
                          </div>
                          <div>
                            <Label htmlFor="endDate">End Date</Label>
                            <Input id="endDate" name="endDate" type="date" defaultValue={session.endDate.toISOString().split("T")[0]} required />
                          </div>
                          <Button type="submit" className="w-full">Update</Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(session.id, session.name)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
