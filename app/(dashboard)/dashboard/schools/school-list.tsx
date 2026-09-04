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
import { updateSchool, deleteSchool } from "@/actions/school.actions"
import { useToast } from "@/hooks/use-toast"
import { Pencil, Trash2 } from "lucide-react"

type School = {
  id: string
  name: string
  code: string
  address: string | null
  phone: string | null
  email: string | null
  isActive: boolean
}

export function SchoolList({
  schools,
  total,
  page,
  totalPages,
}: {
  schools: School[]
  total: number
  page: number
  totalPages: number
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [editItem, setEditItem] = useState<School | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleUpdate(formData: FormData) {
    if (!editItem) return
    try {
      await updateSchool(editItem.id, formData)
      setEditItem(null)
      setError(null)
      toast({ title: "School updated successfully" })
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update school")
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete school "${name}"?`)) return
    try {
      await deleteSchool(id)
      toast({ title: "School deleted" })
      router.refresh()
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Failed to delete school",
        variant: "destructive",
      })
    }
  }

  if (schools.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Schools</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No schools created yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>All Schools ({schools.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Code</TableHead>
                  <TableHead className="hidden lg:table-cell">Address</TableHead>
                  <TableHead className="hidden md:table-cell">Phone</TableHead>
                  <TableHead className="hidden lg:table-cell">Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schools.map((school) => (
                  <TableRow key={school.id}>
                    <TableCell className="font-medium">{school.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{school.code}</TableCell>
                    <TableCell className="hidden lg:table-cell">{school.address || "-"}</TableCell>
                    <TableCell className="hidden md:table-cell">{school.phone || "-"}</TableCell>
                    <TableCell className="hidden lg:table-cell">{school.email || "-"}</TableCell>
                    <TableCell>{school.isActive ? "Active" : "Inactive"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditItem(school)
                            setError(null)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(school.id, school.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => router.push(`/dashboard/schools?page=${page - 1}`)}
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
            onClick={() => router.push(`/dashboard/schools?page=${page + 1}`)}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit School</DialogTitle>
          </DialogHeader>
          <form action={handleUpdate} className="space-y-4">
            {error && <p className="text-destructive text-sm">{error}</p>}
            <div className="grid gap-2">
              <Label htmlFor="edit-name">School Name</Label>
              <Input id="edit-name" name="name" defaultValue={editItem?.name} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-code">School Code</Label>
              <Input id="edit-code" name="code" defaultValue={editItem?.code} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input id="edit-address" name="address" defaultValue={editItem?.address || ""} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input id="edit-phone" name="phone" defaultValue={editItem?.phone || ""} />
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
            <Button type="submit" className="w-full">
              Update School
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
