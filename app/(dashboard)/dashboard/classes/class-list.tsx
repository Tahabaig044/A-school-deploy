"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
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
import { updateClass, deleteClass } from "@/actions/class.actions"
import { useToast } from "@/hooks/use-toast"
import { Pencil, Trash2 } from "lucide-react"

type ClassWithSections = {
  id: string
  name: string
  code: string
  order: number
  school: { name: string }
  sections: { id: string }[]
}

export function ClassList({ classes }: { classes: ClassWithSections[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const [editItem, setEditItem] = useState<ClassWithSections | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleUpdate(formData: FormData) {
    if (!editItem) return
    try {
      const res = await updateClass(editItem.id, null, formData)
      if (res?.error) {
        setError(res.error)
      } else {
        setEditItem(null)
        setError(null)
        toast({ title: "Class updated successfully" })
        router.refresh()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update class")
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete class "${name}"?`)) return
    try {
      await deleteClass(id)
      toast({ title: "Class deleted" })
      router.refresh()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Failed to delete class", variant: "destructive" })
    }
  }

  if (classes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Classes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No classes created yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>All Classes ({classes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Sections</TableHead>
                <TableHead>Order</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map((cls) => (
                <TableRow key={cls.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/dashboard/classes/${cls.id}`}
                      className="hover:underline"
                    >
                      {cls.name}
                    </Link>
                  </TableCell>
                  <TableCell>{cls.code}</TableCell>
                  <TableCell>{cls.school.name}</TableCell>
                  <TableCell>{cls.sections.length}</TableCell>
                  <TableCell>{cls.order}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditItem(cls); setError(null) }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(cls.id, cls.name)}>
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

      <Dialog open={!!editItem} onOpenChange={(o) => { if (!o) { setEditItem(null); setError(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
          </DialogHeader>
          <form action={handleUpdate} className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Class Name</Label>
              <Input id="edit-name" name="name" defaultValue={editItem?.name} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-code">Class Code</Label>
              <Input id="edit-code" name="code" defaultValue={editItem?.code} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-order">Display Order</Label>
              <Input id="edit-order" name="order" type="number" defaultValue={editItem?.order} />
            </div>
            <Button type="submit" className="w-full">Update Class</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
