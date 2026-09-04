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
import { updateParent, deleteParent } from "@/actions/parent.actions"
import { useToast } from "@/hooks/use-toast"
import { Pencil, Trash2, Search } from "lucide-react"

type ParentItem = {
  id: string
  firstName: string
  lastName: string
  relationship: string
  phone: string | null
  email: string | null
  occupation: string | null
  address: string | null
  isPrimary: boolean
  students: {
    student: { id: string; firstName: string; lastName: string; admissionNo: string | null }
  }[]
}

export function ParentList({
  parents,
  total,
  page,
  totalPages,
  search,
}: {
  parents: ParentItem[]
  total: number
  page: number
  totalPages: number
  search: string
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [editItem, setEditItem] = useState<ParentItem | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState(search)

  async function handleUpdate(formData: FormData) {
    if (!editItem) return
    try {
      const res = await updateParent(editItem.id, null, formData)
      if (res?.error) {
        setError(res.error)
      } else {
        setEditItem(null)
        setError(null)
        toast({ title: "Parent updated successfully" })
        router.refresh()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update parent")
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this parent?")) return
    try {
      await deleteParent(id)
      toast({ title: "Parent deleted" })
      router.refresh()
    } catch {
      toast({ title: "Failed to delete parent", variant: "destructive" })
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(`/dashboard/parents?search=${encodeURIComponent(searchInput)}`)
  }

  if (parents.length === 0 && !search) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Parents ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No parents added yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Parents ({total})</CardTitle>
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <Input
                placeholder="Search parents..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-48"
              />
              <Button type="submit" variant="ghost" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          {parents.length === 0 ? (
            <p className="text-muted-foreground text-sm">No parents match your search.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Relationship</TableHead>
                    <TableHead className="hidden lg:table-cell">Contact</TableHead>
                    <TableHead className="hidden lg:table-cell">Linked Students</TableHead>
                    <TableHead>Primary</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parents.map((parent) => (
                    <TableRow key={parent.id}>
                      <TableCell className="font-medium">
                        {parent.firstName} {parent.lastName}
                      </TableCell>
                      <TableCell className="hidden capitalize md:table-cell">
                        {parent.relationship.toLowerCase()}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="text-sm">
                          {parent.email && <div>{parent.email}</div>}
                          {parent.phone && (
                            <div className="text-muted-foreground">{parent.phone}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {parent.students.length > 0 ? (
                          parent.students.map((s) => (
                            <span key={s.student.id} className="mr-2 inline-block text-sm">
                              {s.student.firstName} {s.student.lastName}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {parent.isPrimary ? (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                            Primary
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditItem(parent)
                              setError(null)
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(parent.id)}
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
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => router.push(`/dashboard/parents?page=${page - 1}&search=${search}`)}
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
            onClick={() => router.push(`/dashboard/parents?page=${page + 1}&search=${search}`)}
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
            <DialogTitle>Edit Parent</DialogTitle>
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
              <Label htmlFor="edit-relationship">Relationship</Label>
              <select
                id="edit-relationship"
                name="relationship"
                defaultValue={editItem?.relationship}
                className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                required
              >
                <option value="FATHER">Father</option>
                <option value="MOTHER">Mother</option>
                <option value="GUARDIAN">Guardian</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input id="edit-phone" name="phone" defaultValue={editItem?.phone || ""} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input id="edit-email" name="email" defaultValue={editItem?.email || ""} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-occupation">Occupation</Label>
              <Input
                id="edit-occupation"
                name="occupation"
                defaultValue={editItem?.occupation || ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input id="edit-address" name="address" defaultValue={editItem?.address || ""} />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="edit-isPrimary"
                name="isPrimary"
                type="checkbox"
                defaultChecked={editItem?.isPrimary}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="edit-isPrimary">Primary Contact</Label>
            </div>
            <Button type="submit" className="w-full">
              Update Parent
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
