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
import { createBook, updateBook, deleteBook } from "@/actions/library.actions"
import { useToast } from "@/hooks/use-toast"
import { Pencil, Trash2, Plus } from "lucide-react"

export function BookList({
  books,
  total,
  page,
  pageSize,
  profile,
}: {
  books: any[]
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
      ? await updateBook(editItem.id, null, formData)
      : await createBook(null, formData)
    if (res?.error) {
      setError(res.error)
    } else {
      setOpen(false)
      setEditItem(null)
      setError(null)
      toast({ title: `Book ${editItem ? "updated" : "added"} successfully` })
      router.refresh()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this book?")) return
    try {
      const res = await deleteBook(id)
      if (res.success) {
        toast({ title: "Book deleted" })
        router.refresh()
      } else {
        toast({ title: "Failed to delete book", variant: "destructive" })
      }
    } catch {
      toast({ title: "Failed to delete book", variant: "destructive" })
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6">
      <PageHeader title="Library" description="Manage library books">
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditItem(null); setError(null) } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Book</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editItem ? "Edit Book" : "Add Book"}</DialogTitle>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" name="title" defaultValue={editItem?.title || ""} required />
                </div>
                <div>
                  <Label htmlFor="author">Author</Label>
                  <Input id="author" name="author" defaultValue={editItem?.author || ""} />
                </div>
                <div>
                  <Label htmlFor="isbn">ISBN</Label>
                  <Input id="isbn" name="isbn" defaultValue={editItem?.isbn || ""} />
                </div>
                <div>
                  <Label htmlFor="publisher">Publisher</Label>
                  <Input id="publisher" name="publisher" defaultValue={editItem?.publisher || ""} />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input id="category" name="category" defaultValue={editItem?.category || ""} />
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input id="quantity" name="quantity" type="number" defaultValue={editItem?.quantity || 1} required />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" name="location" defaultValue={editItem?.location || ""} />
                </div>
              </div>
              {editItem && (
                <div>
                  <Label htmlFor="isActive">Active</Label>
                  <select name="isActive" defaultValue={editItem?.isActive ? "true" : "false"} className="w-full border rounded p-2">
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              )}
              <Button type="submit" className="w-full">{editItem ? "Update" : "Add Book"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <DataTable
        columns={[
          { header: "Title", accessorKey: "title" },
          { header: "Author", accessorKey: "author", cell: ({ row }: any) => row.author || "-" },
          { header: "ISBN", accessorKey: "isbn", cell: ({ row }: any) => row.isbn || "-" },
          { header: "Category", accessorKey: "category", cell: ({ row }: any) => row.category || "-" },
          { header: "Quantity", accessorKey: "quantity" },
          { header: "Available", accessorKey: "available", cell: ({ row }: any) => (
            <Badge variant={row.available > 0 ? "default" : "destructive"}>
              {row.available}
            </Badge>
          )},
          { header: "Location", accessorKey: "location", cell: ({ row }: any) => row.location || "-" },
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
        data={books}
        pagination={{ page, totalPages, total }}
      />
    </div>
  )
}
