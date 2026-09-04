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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  updateTeacher,
  deleteTeacher,
  suspendTeacher,
  activateTeacher,
} from "@/actions/teacher.actions"
import { useToast } from "@/hooks/use-toast"
import { MoreHorizontal, Eye, Pencil, Trash2, UserX, UserCheck } from "lucide-react"

type TeacherItem = {
  id: string
  firstName: string
  lastName: string
  employeeCode: string
  qualification: string | null
  specialization: string | null
  designation: string | null
  department: string | null
  experience: number | null
  phone: string | null
  email: string | null
  status: string
  school: { name: string }
  assignments: { class: { name: string }; subject: { name: string } }[]
}

export function TeacherList({
  teachers,
  total,
  page,
  totalPages,
}: {
  teachers: TeacherItem[]
  total: number
  page: number
  totalPages: number
}) {
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
    } catch {
      toast({ title: "Failed to delete teacher", variant: "destructive" })
    }
  }

  async function handleSuspend(id: string) {
    if (!confirm("Suspend this teacher? Their account will be deactivated.")) return
    try {
      await suspendTeacher(id)
      toast({ title: "Teacher suspended" })
      router.refresh()
    } catch {
      toast({ title: "Failed to suspend teacher", variant: "destructive" })
    }
  }

  async function handleActivate(id: string) {
    try {
      await activateTeacher(id)
      toast({ title: "Teacher activated" })
      router.refresh()
    } catch {
      toast({ title: "Failed to activate teacher", variant: "destructive" })
    }
  }

  if (teachers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Teachers</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No teachers added yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>All Teachers ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Employee Code</TableHead>
                  <TableHead className="hidden lg:table-cell">Department</TableHead>
                  <TableHead className="hidden lg:table-cell">Designation</TableHead>
                  <TableHead className="hidden xl:table-cell">School</TableHead>
                  <TableHead className="hidden xl:table-cell">Assignments</TableHead>
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
                    <TableCell className="hidden md:table-cell">{teacher.employeeCode}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {teacher.department || "-"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {teacher.designation || "-"}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">{teacher.school.name}</TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {teacher.assignments.length}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          teacher.status === "ACTIVE"
                            ? "bg-green-100 text-green-800"
                            : teacher.status === "INACTIVE"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {teacher.status.charAt(0) + teacher.status.slice(1).toLowerCase()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={() => router.push(`/dashboard/teachers/${teacher.id}`)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditItem(teacher)
                              setError(null)
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {teacher.status === "ACTIVE" ? (
                            <DropdownMenuItem onClick={() => handleSuspend(teacher.id)}>
                              <UserX className="mr-2 h-4 w-4" />
                              Suspend
                            </DropdownMenuItem>
                          ) : teacher.status === "INACTIVE" ? (
                            <DropdownMenuItem onClick={() => handleActivate(teacher.id)}>
                              <UserCheck className="mr-2 h-4 w-4" />
                              Activate
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem
                            onClick={() => handleDelete(teacher.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => router.push(`/dashboard/teachers?page=${page - 1}`)}
          >
            Previous
          </Button>
          <span className="text-muted-foreground text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => router.push(`/dashboard/teachers?page=${page + 1}`)}
          >
            Next
          </Button>
        </div>
      )}

      <Dialog
        open={!!editItem}
        onOpenChange={(o) => {
          if (!o) {
            setEditItem(null)
            setError(null)
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Teacher</DialogTitle>
          </DialogHeader>
          <form action={handleUpdate} className="space-y-4">
            {error && <p className="text-destructive text-sm">{error}</p>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="edit-firstName">First Name</Label>
                <Input
                  id="edit-firstName"
                  name="firstName"
                  defaultValue={editItem?.firstName}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-lastName">Last Name</Label>
                <Input
                  id="edit-lastName"
                  name="lastName"
                  defaultValue={editItem?.lastName}
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-employeeCode">Employee Code</Label>
              <Input
                id="edit-employeeCode"
                name="employeeCode"
                defaultValue={editItem?.employeeCode}
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  name="phone"
                  type="tel"
                  defaultValue={editItem?.phone || ""}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  name="email"
                  type="email"
                  defaultValue={editItem?.email || ""}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="edit-qualification">Qualification</Label>
                <Input
                  id="edit-qualification"
                  name="qualification"
                  defaultValue={editItem?.qualification || ""}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-specialization">Specialization</Label>
                <Input
                  id="edit-specialization"
                  name="specialization"
                  defaultValue={editItem?.specialization || ""}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="edit-designation">Designation</Label>
                <Input
                  id="edit-designation"
                  name="designation"
                  defaultValue={editItem?.designation || ""}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-department">Department</Label>
                <Input
                  id="edit-department"
                  name="department"
                  defaultValue={editItem?.department || ""}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-experience">Experience (Years)</Label>
              <Input
                id="edit-experience"
                name="experience"
                type="number"
                min="0"
                defaultValue={editItem?.experience?.toString() || ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-status">Status</Label>
              <select
                id="edit-status"
                name="status"
                defaultValue={editItem?.status}
                className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <Button type="submit" className="w-full">
              Update Teacher
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
