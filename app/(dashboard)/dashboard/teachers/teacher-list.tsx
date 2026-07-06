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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { updateTeacher, deleteTeacher } from "@/actions/teacher.actions"
import { useToast } from "@/hooks/use-toast"
import { Pencil, Trash2 } from "lucide-react"

type TeacherItem = {
  id: string
  firstName: string
  lastName: string
  employeeCode: string
  qualification: string | null
  specialization: string | null
  phone: string | null
  email: string | null
  status: string
  school: { name: string }
  assignments: { class: { name: string }; subject: { name: string } }[]
}

export function TeacherList({ teachers }: { teachers: TeacherItem[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const [editItem, setEditItem] = useState<TeacherItem | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleUpdate(formData: FormData) {
    if (!editItem) return
    try {
      const res = await updateTeacher(editItem.id, null, formData)
      if (res?.error) {
        setError(res.error)
      } else {
        setEditItem(null)
        setError(null)
        toast({ title: "Teacher updated successfully" })
        router.refresh()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update teacher")
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this teacher?")) return
    try {
      await deleteTeacher(id)
      toast({ title: "Teacher deleted" })
      router.refresh()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Failed to delete teacher", variant: "destructive" })
    }
  }

  if (teachers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Teachers</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No teachers added yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>All Teachers ({teachers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Employee Code</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Qualifications</TableHead>
                <TableHead>Assignments</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell className="font-medium">
                    {teacher.firstName} {teacher.lastName}
                  </TableCell>
                  <TableCell>{teacher.employeeCode}</TableCell>
                  <TableCell>{teacher.school.name}</TableCell>
                  <TableCell>
                    {[teacher.qualification, teacher.specialization].filter(Boolean).join(", ") || "-"}
                  </TableCell>
                  <TableCell>{teacher.assignments.length}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      teacher.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}>
                      {teacher.status.charAt(0) + teacher.status.slice(1).toLowerCase()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditItem(teacher); setError(null) }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(teacher.id)}>
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

      <Dialog open={!!editItem} onOpenChange={(o) => { if (!o) { setEditItem(null); setError(null) } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Teacher</DialogTitle>
          </DialogHeader>
          <form action={handleUpdate} className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-firstName">First Name</Label>
                <Input id="edit-firstName" name="firstName" defaultValue={editItem?.firstName} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-lastName">Last Name</Label>
                <Input id="edit-lastName" name="lastName" defaultValue={editItem?.lastName} required />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-employeeCode">Employee Code</Label>
              <Input id="edit-employeeCode" name="employeeCode" defaultValue={editItem?.employeeCode} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input id="edit-phone" name="phone" type="tel" defaultValue={editItem?.phone || ""} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input id="edit-email" name="email" type="email" defaultValue={editItem?.email || ""} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-qualification">Qualification</Label>
                <Input id="edit-qualification" name="qualification" defaultValue={editItem?.qualification || ""} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-specialization">Specialization</Label>
                <Input id="edit-specialization" name="specialization" defaultValue={editItem?.specialization || ""} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-status">Status</Label>
              <select id="edit-status" name="status" defaultValue={editItem?.status} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <Button type="submit" className="w-full">Update Teacher</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
