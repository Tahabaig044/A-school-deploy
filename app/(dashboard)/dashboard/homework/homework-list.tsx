"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createHomework, updateHomework, deleteHomework } from "@/actions/homework.actions"
import { useToast } from "@/hooks/use-toast"
import { Pencil, Trash2, Plus, Eye } from "lucide-react"
import Link from "next/link"

export function HomeworkList({
  homework,
  total,
  page,
  pageSize,
  profile,
}: {
  homework: any[]
  total: number
  page: number
  pageSize: number
  profile: any
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    formData.set("schoolId", profile.schoolId || "")
    formData.set("branchId", profile.branchId || "")
    formData.set("teacherId", profile.id || "")
    const res = editItem
      ? await updateHomework(editItem.id, null, formData)
      : await createHomework(null, formData)
    if (res?.error) {
      setError(res.error)
    } else {
      setOpen(false)
      setEditItem(null)
      setError(null)
      toast({ title: `Homework ${editItem ? "updated" : "created"} successfully` })
      router.refresh()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this homework?")) return
    try {
      const res = await deleteHomework(id)
      if (res.success) {
        toast({ title: "Homework deleted" })
        router.refresh()
      } else {
        toast({ title: "Failed to delete homework", variant: "destructive" })
      }
    } catch {
      toast({ title: "Failed to delete homework", variant: "destructive" })
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6">
      <PageHeader title="Homework" description="Manage homework assignments">
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o)
            if (!o) {
              setEditItem(null)
              setError(null)
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Homework
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editItem ? "Edit Homework" : "Add Homework"}</DialogTitle>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" name="title" defaultValue={editItem?.title || ""} required />
                </div>
                <div>
                  <Label htmlFor="classId">Class ID</Label>
                  <Input
                    id="classId"
                    name="classId"
                    defaultValue={editItem?.classId || ""}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="sectionId">Section ID</Label>
                  <Input id="sectionId" name="sectionId" defaultValue={editItem?.sectionId || ""} />
                </div>
                <div>
                  <Label htmlFor="subjectId">Subject ID</Label>
                  <Input
                    id="subjectId"
                    name="subjectId"
                    defaultValue={editItem?.subjectId || ""}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="academicSessionId">Academic Session ID</Label>
                  <Input
                    id="academicSessionId"
                    name="academicSessionId"
                    defaultValue={editItem?.academicSessionId || ""}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    name="dueDate"
                    type="date"
                    defaultValue={editItem?.dueDate?.split("T")[0] || ""}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="totalMarks">Total Marks</Label>
                  <Input
                    id="totalMarks"
                    name="totalMarks"
                    type="number"
                    defaultValue={editItem?.totalMarks || ""}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  defaultValue={editItem?.description || ""}
                />
              </div>
              {editItem && (
                <div>
                  <Label htmlFor="isActive">Active</Label>
                  <select
                    name="isActive"
                    defaultValue={editItem?.isActive ? "true" : "false"}
                    className="w-full rounded border p-2"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              )}
              <Button type="submit" className="w-full">
                {editItem ? "Update" : "Create"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <DataTable
        columns={[
          { header: "Title", accessorKey: "title" },
          { header: "Class", accessorKey: "class", cell: ({ row }: any) => row.class?.name },
          { header: "Subject", accessorKey: "subject", cell: ({ row }: any) => row.subject?.name },
          {
            header: "Teacher",
            accessorKey: "teacher",
            cell: ({ row }: any) => `${row.teacher?.firstName} ${row.teacher?.lastName}`,
          },
          {
            header: "Due Date",
            accessorKey: "dueDate",
            cell: ({ row }: any) => new Date(row.dueDate).toLocaleDateString(),
          },
          {
            header: "Total Marks",
            accessorKey: "totalMarks",
            cell: ({ row }: any) => row.totalMarks || "-",
          },
          {
            header: "Submissions",
            accessorKey: "_count",
            cell: ({ row }: any) => row._count?.submissions || 0,
          },
          {
            header: "Status",
            accessorKey: "isActive",
            cell: ({ row }: any) => (
              <Badge variant={row.isActive ? "default" : "secondary"}>
                {row.isActive ? "Active" : "Inactive"}
              </Badge>
            ),
          },
          {
            header: "Actions",
            cell: ({ row }: any) => (
              <div className="flex gap-2">
                <Link href={`/dashboard/homework/check?homeworkId=${row.id}`}>
                  <Button variant="ghost" size="icon">
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditItem(row)
                    setOpen(true)
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          },
        ]}
        data={homework}
        pagination={{ page, totalPages, total }}
      />
    </div>
  )
}
