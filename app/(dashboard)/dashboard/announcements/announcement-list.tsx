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
import { Textarea } from "@/components/ui/textarea"
import { createAnnouncement, updateAnnouncement, deleteAnnouncement, addAnnouncementAttachment, deleteAnnouncementAttachment } from "@/actions/announcement.actions"
import { useToast } from "@/hooks/use-toast"
import { Pencil, Trash2, Plus, Paperclip, ExternalLink } from "lucide-react"

const audiences = ["ALL", "SCHOOL", "BRANCH", "CLASS", "SECTION", "TEACHERS", "STUDENTS", "PARENTS"] as const

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
  const [viewItem, setViewItem] = useState<any>(null)

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
    try {
      const res = await deleteAnnouncement(id)
      if (res.success) {
        toast({ title: "Announcement deleted" })
        router.refresh()
      } else {
        toast({ title: "Failed to delete announcement", variant: "destructive" })
      }
    } catch {
      toast({ title: "Failed to delete announcement", variant: "destructive" })
    }
  }

  async function handleDeleteAttachment(attachmentId: string) {
    if (!confirm("Delete this attachment?")) return
    const res = await deleteAnnouncementAttachment(attachmentId)
    if (res.success) {
      toast({ title: "Attachment deleted" })
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                <Textarea id="content" name="content" defaultValue={editItem?.content || ""} required rows={5} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="audience">Audience</Label>
                  <select name="audience" defaultValue={editItem?.audience || "ALL"} className="w-full border rounded p-2">
                    {audiences.map(a => (
                      <option key={a} value={a}>{a.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="isPublished">Status</Label>
                  <select name="isPublished" defaultValue={editItem?.isPublished ? "true" : "false"} className="w-full border rounded p-2">
                    <option value="true">Published</option>
                    <option value="false">Draft</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="classId">Class (optional)</Label>
                  <Input id="classId" name="classId" defaultValue={editItem?.classId || ""} placeholder="UUID" />
                </div>
                <div>
                  <Label htmlFor="sectionId">Section (optional)</Label>
                  <Input id="sectionId" name="sectionId" defaultValue={editItem?.sectionId || ""} placeholder="UUID" />
                </div>
              </div>
              <div>
                <Label htmlFor="scheduledAt">Schedule Publish (optional)</Label>
                <Input id="scheduledAt" name="scheduledAt" type="datetime-local" defaultValue={editItem?.scheduledAt ? new Date(editItem.scheduledAt).toISOString().slice(0, 16) : ""} />
                <p className="text-xs text-muted-foreground mt-1">Leave empty for immediate publishing</p>
              </div>
              <Button type="submit" className="w-full">{editItem ? "Update" : "Create"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* View Detail Dialog */}
      <Dialog open={!!viewItem} onOpenChange={(o) => { if (!o) setViewItem(null) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewItem?.title}</DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge>{viewItem.audience.replace(/_/g, " ")}</Badge>
                <Badge variant={viewItem.isPublished ? "default" : "secondary"}>
                  {viewItem.isPublished ? "Published" : "Draft"}
                </Badge>
                {viewItem.scheduledAt && (
                  <Badge variant="outline">Scheduled: {new Date(viewItem.scheduledAt).toLocaleString()}</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                By {viewItem.author?.firstName} {viewItem.author?.lastName} on {new Date(viewItem.createdAt).toLocaleDateString()}
              </p>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap">{viewItem.content}</div>
              {viewItem.class && (
                <p className="text-sm"><span className="font-medium">Class:</span> {viewItem.class.name}</p>
              )}
              {viewItem.section && (
                <p className="text-sm"><span className="font-medium">Section:</span> {viewItem.section.name}</p>
              )}
              {viewItem.attachments?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Attachments</h4>
                  <div className="space-y-2">
                    {viewItem.attachments.map((att: any) => (
                      <div key={att.id} className="flex items-center gap-2 p-2 border rounded">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <a href={att.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                          {att.fileName}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {att.fileType} {att.fileSize ? `(${Math.round(att.fileSize / 1024)}KB)` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {viewItem.reads?.length > 0 && (
                <p className="text-xs text-green-600">You have read this announcement</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DataTable
        columns={[
          { header: "Title", accessorKey: "title", cell: ({ row }: any) => (
            <button onClick={() => setViewItem(row)} className="text-left font-medium hover:underline">{row.title}</button>
          )},
          { header: "Author", accessorKey: "author", cell: ({ row }: any) => `${row.author?.firstName} ${row.author?.lastName}` },
          { header: "Audience", accessorKey: "audience", cell: ({ row }: any) => (
            <Badge>{row.audience.replace(/_/g, " ")}</Badge>
          )},
          { header: "Status", accessorKey: "isPublished", cell: ({ row }: any) => (
            <Badge variant={row.isPublished ? "default" : "secondary"}>
              {row.isPublished ? "Published" : "Draft"}
            </Badge>
          )},
          { header: "Attachments", accessorKey: "attachments", cell: ({ row }: any) => (
            row.attachments?.length > 0 ? (
              <Badge variant="outline"><Paperclip className="h-3 w-3 mr-1" />{row.attachments.length}</Badge>
            ) : null
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
