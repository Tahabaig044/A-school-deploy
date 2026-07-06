"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createExam, updateExam, deleteExam } from "@/actions/exam.actions"
import { useToast } from "@/hooks/use-toast"
import { Pencil, Trash2, Plus, Eye } from "lucide-react"
import Link from "next/link"

export function ExamList({
  exams,
  total,
  page,
  pageSize,
  profile,
}: {
  exams: any[]
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
    const res = editItem
      ? await updateExam(editItem.id, null, formData)
      : await createExam(null, formData)
    if (res?.error) {
      setError(res.error)
    } else {
      setOpen(false)
      setEditItem(null)
      setError(null)
      toast({ title: `Exam ${editItem ? "updated" : "created"} successfully` })
      router.refresh()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this exam?")) return
    const res = await deleteExam(id)
    if (res.success) {
      toast({ title: "Exam deleted" })
      router.refresh()
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6">
      <PageHeader title="Exams" description="Manage examinations">
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditItem(null); setError(null) } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Exam</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editItem ? "Edit Exam" : "Add Exam"}</DialogTitle>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Exam Name</Label>
                  <Input id="name" name="name" defaultValue={editItem?.name || ""} required />
                </div>
                <div>
                  <Label htmlFor="examTypeId">Exam Type</Label>
                  <Input id="examTypeId" name="examTypeId" defaultValue={editItem?.examTypeId || ""} required />
                </div>
                <div>
                  <Label htmlFor="classId">Class ID</Label>
                  <Input id="classId" name="classId" defaultValue={editItem?.classId || ""} required />
                </div>
                <div>
                  <Label htmlFor="subjectId">Subject ID</Label>
                  <Input id="subjectId" name="subjectId" defaultValue={editItem?.subjectId || ""} required />
                </div>
                <div>
                  <Label htmlFor="academicSessionId">Academic Session ID</Label>
                  <Input id="academicSessionId" name="academicSessionId" defaultValue={editItem?.academicSessionId || ""} required />
                </div>
                <div>
                  <Label htmlFor="totalMarks">Total Marks</Label>
                  <Input id="totalMarks" name="totalMarks" type="number" defaultValue={editItem?.totalMarks || ""} required />
                </div>
                <div>
                  <Label htmlFor="passingMarks">Passing Marks</Label>
                  <Input id="passingMarks" name="passingMarks" type="number" defaultValue={editItem?.passingMarks || ""} required />
                </div>
                <div>
                  <Label htmlFor="examDate">Exam Date</Label>
                  <Input id="examDate" name="examDate" type="date" defaultValue={editItem?.examDate?.split("T")[0] || ""} />
                </div>
                <div>
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input id="startTime" name="startTime" type="time" defaultValue={editItem?.startTime || ""} />
                </div>
                <div>
                  <Label htmlFor="endTime">End Time</Label>
                  <Input id="endTime" name="endTime" type="time" defaultValue={editItem?.endTime || ""} />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" defaultValue={editItem?.description || ""} />
              </div>
              {editItem && (
                <div>
                  <Label htmlFor="isPublished">Published</Label>
                  <Select name="isPublished" defaultValue={editItem?.isPublished ? "true" : "false"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Published</SelectItem>
                      <SelectItem value="false">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button type="submit" className="w-full">{editItem ? "Update" : "Create"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <DataTable
        columns={[
          { header: "Name", accessorKey: "name" },
          { header: "Type", accessorKey: "examType", cell: ({ row }: any) => row.examType?.name },
          { header: "Class", accessorKey: "class", cell: ({ row }: any) => row.class?.name },
          { header: "Subject", accessorKey: "subject", cell: ({ row }: any) => row.subject?.name },
          { header: "Total Marks", accessorKey: "totalMarks" },
          { header: "Passing Marks", accessorKey: "passingMarks" },
          { header: "Date", accessorKey: "examDate", cell: ({ row }: any) => row.examDate ? new Date(row.examDate).toLocaleDateString() : "-" },
          { header: "Results", accessorKey: "_count", cell: ({ row }: any) => row._count?.results || 0 },
          { header: "Status", accessorKey: "isPublished", cell: ({ row }: any) => (
            <Badge variant={row.isPublished ? "default" : "secondary"}>
              {row.isPublished ? "Published" : "Draft"}
            </Badge>
          )},
          {
            header: "Actions",
            cell: ({ row }: any) => (
              <div className="flex gap-2">
                <Link href={`/dashboard/exams/marks-entry?examId=${row.id}`}>
                  <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => { setEditItem(row); setOpen(true) }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          },
        ]}
        data={exams}
        pagination={{ page, totalPages, total }}
      />
    </div>
  )
}
