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
import { updateSubject, deleteSubject, assignSubjectToClass, removeSubjectFromClass } from "@/actions/subject.actions"
import { useToast } from "@/hooks/use-toast"
import { Pencil, Trash2 } from "lucide-react"

type SubjectItem = {
  id: string
  name: string
  code: string
  type: string
  school: { name: string }
  classSubjects: { id: string; class: { id: string; name: string } }[]
}

export function SubjectList({ subjects }: { subjects: SubjectItem[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const [editItem, setEditItem] = useState<SubjectItem | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleUpdate(formData: FormData) {
    if (!editItem) return
    try {
      const res = await updateSubject(editItem.id, null, formData)
      if (res?.error) {
        setError(res.error)
      } else {
        setEditItem(null)
        setError(null)
        toast({ title: "Subject updated successfully" })
        router.refresh()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update subject")
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this subject?")) return
    try {
      await deleteSubject(id)
      toast({ title: "Subject deleted" })
      router.refresh()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Failed to delete subject", variant: "destructive" })
    }
  }

  if (subjects.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>All Subjects</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No subjects created yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader><CardTitle>All Subjects ({subjects.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Assigned Classes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.map((subject) => (
                <TableRow key={subject.id}>
                  <TableCell className="font-medium">{subject.name}</TableCell>
                  <TableCell>{subject.code}</TableCell>
                  <TableCell className="capitalize">{subject.type.toLowerCase()}</TableCell>
                  <TableCell>{subject.school.name}</TableCell>
                  <TableCell>
                    {subject.classSubjects.length > 0
                      ? subject.classSubjects.map((cs) => cs.class.name).join(", ")
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditItem(subject); setError(null) }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(subject.id)}>
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
            <DialogTitle>Edit Subject</DialogTitle>
          </DialogHeader>
          <form action={handleUpdate} className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Subject Name</Label>
              <Input id="edit-name" name="name" defaultValue={editItem?.name} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-code">Subject Code</Label>
              <Input id="edit-code" name="code" defaultValue={editItem?.code} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-type">Type</Label>
              <select id="edit-type" name="type" defaultValue={editItem?.type} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="CORE">Core</option>
                <option value="ELECTIVE">Elective</option>
              </select>
            </div>
            <Button type="submit" className="w-full">Update Subject</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
