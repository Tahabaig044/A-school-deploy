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
import { createAnnouncement, updateAnnouncement, deleteAnnouncement } from "@/actions/announcement.actions"
import { useToast } from "@/hooks/use-toast"
import { Pencil, Trash2, Plus } from "lucide-react"

const audiences = ["ALL", "TEACHERS", "STUDENTS", "PARENTS", "SPECIFIC_CLASS"] as const

export function AnnouncementList({
  announcements,
  total,
  page,
  pageSize,
  profile,
}: {
  announcements: any[]
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
    formData.set("authorId", profile.id || "")
    const res = editItem
      ? await updateAnnouncement(editItem.id, null, formData)
      : await createAnnouncement(null, formData)
    if (res?.error) {
      setError(res.error)
    } else {
      setOpen(false)
      setEditItem(null)
      setError(null)
      toast({ title: `Announcement ${editItem ? "updated" : "created"} successfully` })
      router.refresh()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this announcement?")) return
    const res = await deleteAnnouncement(id)
    if (res.success) {
      toast({ title: "Announcement deleted" })
      router.refresh()
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6">
      <PageHeader title="Announcements" description="Manage school announcements">
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditItem(null); setError(null) } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Announcement</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem ? "Edit Announcement" : "Add Announcement"}</DialogTitle>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" defaultValue={editItem?.title || ""} required />
              </div>
              <div>
                <Label htmlFor="content">Content</Label>
                <textarea
                  id="content"
                  name="content"
                  defaultValue={editItem?.content || ""}
                  required
                  className="w-full border rounded p-2 min-h-[100px]"
                />
              </div>
              <div>
                <Label htmlFor="audience">Audience</Label>
                <select name="audience" defaultValue={editItem?.audience || "ALL"} className="w-full border rounded p-2">
                  {audiences.map(a => (
                    <option key={a} value={a}>{a.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="classId">Class ID (for SPECIFIC_CLASS)</Label>
                <Input id="classId" name="classId" defaultValue={editItem?.classId || ""} />
              </div>
              {editItem && (
                <div>
                  <Label htmlFor="isPublished">Published</Label>
                  <select name="isPublished" defaultValue={editItem?.isPublished ? "true" : "false"} className="w-full border rounded p-2">
                    <option value="true">Published</option>
                    <option value="false">Draft</option>
                  </select>
                </div>
              )}
              <Button type="submit" className="w-full">{editItem ? "Update" : "Create"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <DataTable
        columns={[
          { header: "Title", accessorKey: "title" },
          { header: "Author", accessorKey: "author", cell: ({ row }: any) => `${row.author?.firstName} ${row.author?.lastName}` },
          { header: "Audience", accessorKey: "audience", cell: ({ row }: any) => (
            <Badge>{row.audience.replace(/_/g, " ")}</Badge>
          )},
          { header: "Status", accessorKey: "isPublished", cell: ({ row }: any) => (
            <Badge variant={row.isPublished ? "default" : "secondary"}>
              {row.isPublished ? "Published" : "Draft"}
            </Badge>
          )},
          { header: "Date", accessorKey: "createdAt", cell: ({ row }: any) => new Date(row.createdAt).toLocaleDateString() },
          {
            header: "Actions",
            cell: ({ row }: any) => (
              <div className="flex gap-2">
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
        data={announcements}
        pagination={{ page, totalPages, total }}
      />
    </div>
  )
}
