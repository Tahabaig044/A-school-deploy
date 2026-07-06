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
import { updateBranch, deleteBranch } from "@/actions/branch.actions"
import { useToast } from "@/hooks/use-toast"
import { Pencil, Trash2 } from "lucide-react"

type Branch = {
  id: string
  name: string
  code: string
  address: string | null
  phone: string | null
  email: string | null
  isActive: boolean
  school: { name: string }
}

export function BranchList({ branches }: { branches: Branch[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const [editItem, setEditItem] = useState<Branch | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleUpdate(formData: FormData) {
    if (!editItem) return
    try {
      await updateBranch(editItem.id, formData)
      setEditItem(null)
      setError(null)
      toast({ title: "Branch updated successfully" })
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update branch")
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete branch "${name}"?`)) return
    try {
      await deleteBranch(id)
      toast({ title: "Branch deleted" })
      router.refresh()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Failed to delete branch", variant: "destructive" })
    }
  }

  if (branches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Branches</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No branches created yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>All Branches ({branches.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell className="font-medium">{branch.name}</TableCell>
                  <TableCell>{branch.code}</TableCell>
                  <TableCell>{branch.school.name}</TableCell>
                  <TableCell>{branch.address || "-"}</TableCell>
                  <TableCell>{branch.phone || "-"}</TableCell>
                  <TableCell>
                    {branch.isActive ? "Active" : "Inactive"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditItem(branch); setError(null) }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(branch.id, branch.name)}>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Branch</DialogTitle>
          </DialogHeader>
          <form action={handleUpdate} className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Branch Name</Label>
              <Input id="edit-name" name="name" defaultValue={editItem?.name} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-code">Branch Code</Label>
              <Input id="edit-code" name="code" defaultValue={editItem?.code} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input id="edit-address" name="address" defaultValue={editItem?.address || ""} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input id="edit-phone" name="phone" defaultValue={editItem?.phone || ""} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input id="edit-email" name="email" type="email" defaultValue={editItem?.email || ""} />
              </div>
            </div>
            <Button type="submit" className="w-full">Update Branch</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
