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
import { createExamType, updateExamType, deleteExamType } from "@/actions/exam.actions"
import { useToast } from "@/hooks/use-toast"
import { Pencil, Trash2, Plus } from "lucide-react"

export function ExamTypeList({
  examTypes,
  profile,
}: {
  examTypes: any[]
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
      ? await updateExamType(editItem.id, null, formData)
      : await createExamType(null, formData)
    if (res?.error) {
      setError(res.error)
    } else {
      setOpen(false)
      setEditItem(null)
      setError(null)
      toast({ title: `Exam type ${editItem ? "updated" : "created"} successfully` })
      router.refresh()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this exam type?")) return
    try {
      const res = await deleteExamType(id)
      if (res.success) {
        toast({ title: "Exam type deleted" })
        router.refresh()
      } else {
        toast({ title: "Failed to delete exam type", variant: "destructive" })
      }
    } catch {
      toast({ title: "Failed to delete exam type", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Exam Types" description="Manage exam categories">
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditItem(null); setError(null) } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Exam Type</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem ? "Edit Exam Type" : "Add Exam Type"}</DialogTitle>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={editItem?.name || ""} required />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" defaultValue={editItem?.description || ""} />
              </div>
              <div>
                <Label htmlFor="weight">Weight</Label>
                <Input id="weight" name="weight" type="number" defaultValue={editItem?.weight || 1} required />
              </div>
              {editItem && (
                <div>
                  <Label htmlFor="isActive">Active</Label>
                  <Select name="isActive" defaultValue={editItem?.isActive ? "true" : "false"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
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
          { header: "Description", accessorKey: "description", cell: ({ row }: any) => row.description || "-" },
          { header: "Weight", accessorKey: "weight" },
          { header: "Status", accessorKey: "isActive", cell: ({ row }: any) => (
            <Badge variant={row.isActive ? "default" : "secondary"}>
              {row.isActive ? "Active" : "Inactive"}
            </Badge>
          )},
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
        data={examTypes}
      />
    </div>
  )
}
