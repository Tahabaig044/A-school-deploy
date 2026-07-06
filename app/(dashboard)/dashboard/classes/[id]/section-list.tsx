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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { deleteSection, updateSection } from "@/actions/class.actions"
import { useToast } from "@/hooks/use-toast"
import { Pencil, Trash2 } from "lucide-react"

type Section = {
  id: string
  name: string
  capacity: number
}

export function SectionList({ sections, classId }: { sections: Section[]; classId: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [editItem, setEditItem] = useState<Section | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    if (!editItem) return
    const res = await updateSection(editItem.id, null, formData)
    if (res?.error) {
      setError(res.error)
    } else {
      setOpen(false)
      setEditItem(null)
      setError(null)
      toast({ title: "Section updated" })
      router.refresh()
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete section "${name}"?`)) return
    try {
      await deleteSection(id)
      toast({ title: "Section deleted" })
      router.refresh()
    } catch {
      toast({ title: "Failed to delete section", variant: "destructive" })
    }
  }

  if (sections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sections</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No sections added yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sections ({sections.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sections.map((section) => (
              <TableRow key={section.id}>
                <TableCell className="font-medium">{section.name}</TableCell>
                <TableCell>{section.capacity}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Dialog open={open && editItem?.id === section.id} onOpenChange={(o) => { setOpen(o); if (!o) { setEditItem(null); setError(null) } }}>
                      <DialogTrigger render={<Button variant="ghost" size="icon" />}>
                        <Pencil className="h-4 w-4" />
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Section</DialogTitle>
                        </DialogHeader>
                        <form action={handleSubmit} className="space-y-4">
                          {error && <p className="text-sm text-red-500">{error}</p>}
                          <div>
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" name="name" defaultValue={section.name} required />
                          </div>
                          <div>
                            <Label htmlFor="capacity">Capacity</Label>
                            <Input id="capacity" name="capacity" type="number" defaultValue={section.capacity} required />
                          </div>
                          <Button type="submit" className="w-full">Update</Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(section.id, section.name)}>
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
  )
}
