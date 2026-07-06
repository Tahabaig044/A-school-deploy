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
import { updateStaff, deleteStaff } from "@/actions/staff.actions"
import { useToast } from "@/hooks/use-toast"
import { Pencil, Trash2 } from "lucide-react"

type StaffItem = {
  id: string
  firstName: string
  lastName: string
  employeeCode: string
  department: string
  designation: string
  phone: string | null
  email: string | null
  status: string
  school: { name: string }
}

export function StaffList({
  staff,
  total,
  page,
  totalPages,
}: {
  staff: StaffItem[]
  total: number
  page: number
  totalPages: number
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [editItem, setEditItem] = useState<StaffItem | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleUpdate(formData: FormData) {
    if (!editItem) return
    try {
      const res = await updateStaff(editItem.id, null, formData)
      if (res?.error) {
        setError(res.error)
      } else {
        setEditItem(null)
        setError(null)
        toast({ title: "Staff updated successfully" })
        router.refresh()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update staff")
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this staff member?")) return
    try {
      await deleteStaff(id)
      toast({ title: "Staff deleted" })
      router.refresh()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Failed to delete staff", variant: "destructive" })
    }
  }

  if (staff.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>All Staff</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No staff added yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader><CardTitle>All Staff ({total})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.firstName} {s.lastName}</TableCell>
                  <TableCell>{s.employeeCode}</TableCell>
                  <TableCell>{s.department}</TableCell>
                  <TableCell>{s.designation}</TableCell>
                  <TableCell>{s.school.name}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      s.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}>
                      {s.status.charAt(0) + s.status.slice(1).toLowerCase()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditItem(s); setError(null) }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
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

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => router.push(`/dashboard/staff?page=${page - 1}`)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => router.push(`/dashboard/staff?page=${page + 1}`)}
          >
            Next
          </Button>
        </div>
      )}

      <Dialog open={!!editItem} onOpenChange={(o) => { if (!o) { setEditItem(null); setError(null) } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Staff</DialogTitle>
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
                <Label htmlFor="edit-department">Department</Label>
                <Input id="edit-department" name="department" defaultValue={editItem?.department} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-designation">Designation</Label>
                <Input id="edit-designation" name="designation" defaultValue={editItem?.designation} required />
              </div>
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
            <div className="grid gap-2">
              <Label htmlFor="edit-status">Status</Label>
              <select id="edit-status" name="status" defaultValue={editItem?.status} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <Button type="submit" className="w-full">Update Staff</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
