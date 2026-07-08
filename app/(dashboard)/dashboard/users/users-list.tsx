"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateUser, deleteUser } from "@/actions/auth.actions"
import { useToast } from "@/hooks/use-toast"
import { Pencil, Trash2 } from "lucide-react"
import type { Role } from "@/lib/constants"

type User = {
  id: string
  email: string | null
  firstName: string | null
  lastName: string | null
  role: string
  status: string
  isActive: boolean
  createdAt: string
}

const ROLES: Role[] = [
  "SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "STUDENT",
  "PARENT", "ACCOUNTANT", "PRINCIPAL", "LIBRARIAN", "TRANSPORT_MANAGER", "ADMISSION_OFFICER",
]

function getStatusBadge(status: string) {
  switch (status) {
    case "ACTIVE":
      return <Badge className="bg-green-100 text-green-800">Active</Badge>
    case "INVITED":
      return <Badge className="bg-yellow-100 text-yellow-800">Invited</Badge>
    case "SUSPENDED":
      return <Badge className="bg-red-100 text-red-800">Suspended</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function getRoleBadge(role: string) {
  const roleColors: Record<string, string> = {
    SUPER_ADMIN: "bg-purple-100 text-purple-800",
    SCHOOL_ADMIN: "bg-blue-100 text-blue-800",
    BRANCH_ADMIN: "bg-indigo-100 text-indigo-800",
    TEACHER: "bg-green-100 text-green-800",
    STUDENT: "bg-cyan-100 text-cyan-800",
    PARENT: "bg-pink-100 text-pink-800",
    ACCOUNTANT: "bg-orange-100 text-orange-800",
    PRINCIPAL: "bg-violet-100 text-violet-800",
    LIBRARIAN: "bg-teal-100 text-teal-800",
    TRANSPORT_MANAGER: "bg-amber-100 text-amber-800",
    ADMISSION_OFFICER: "bg-lime-100 text-lime-800",
  }

  return (
    <Badge className={roleColors[role] || "bg-gray-100 text-gray-800"}>
      {role.replace("_", " ")}
    </Badge>
  )
}

export function UsersList({ users }: { users: User[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [editItem, setEditItem] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    if (!editItem) return
    const res = await updateUser(editItem.id, null, formData)
    if (res?.error) {
      setError(res.error)
    } else {
      setOpen(false)
      setEditItem(null)
      setError(null)
      toast({ title: "User updated" })
      router.refresh()
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete user "${name}"?`)) return
    try {
      const res = await deleteUser(id)
      if (res.success) {
        toast({ title: "User deleted" })
        router.refresh()
      } else {
        toast({ title: res.error || "Failed to delete user", variant: "destructive" })
      }
    } catch {
      toast({ title: "Failed to delete user", variant: "destructive" })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Users ({users.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No users found. Invite your first user above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Name</th>
                  <th className="text-left p-2 font-medium hidden md:table-cell">Email</th>
                  <th className="text-left p-2 font-medium">Role</th>
                  <th className="text-left p-2 font-medium">Status</th>
                  <th className="text-left p-2 font-medium hidden lg:table-cell">Joined</th>
                  <th className="text-right p-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0">
                    <td className="p-2">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="p-2 text-muted-foreground hidden md:table-cell">{user.email || "—"}</td>
                    <td className="p-2">{getRoleBadge(user.role)}</td>
                    <td className="p-2">{getStatusBadge(user.status)}</td>
                    <td className="p-2 text-muted-foreground hidden lg:table-cell">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-2 text-right">
                      <div className="flex justify-end gap-1">
                        <Dialog open={open && editItem?.id === user.id} onOpenChange={(o) => { setOpen(o); if (!o) { setEditItem(null); setError(null) } }}>
                          <DialogTrigger render={<Button variant="ghost" size="icon" />}>
                            <Pencil className="h-4 w-4" />
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit User</DialogTitle>
                            </DialogHeader>
                            <form action={handleSubmit} className="space-y-4">
                              {error && <p className="text-sm text-red-500">{error}</p>}
                              <div>
                                <Label htmlFor="firstName">First Name</Label>
                                <Input id="firstName" name="firstName" defaultValue={user.firstName || ""} required />
                              </div>
                              <div>
                                <Label htmlFor="lastName">Last Name</Label>
                                <Input id="lastName" name="lastName" defaultValue={user.lastName || ""} required />
                              </div>
                              <div>
                                <Label htmlFor="role">Role</Label>
                                <Select name="role" defaultValue={user.role}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {ROLES.map(r => (
                                      <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="phone">Phone</Label>
                                <Input id="phone" name="phone" />
                              </div>
                              <div>
                                <Label htmlFor="isActive">Active</Label>
                                <Select name="isActive" defaultValue={user.isActive ? "true" : "false"}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="true">Active</SelectItem>
                                    <SelectItem value="false">Inactive</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button type="submit" className="w-full">Update</Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id, `${user.firstName} ${user.lastName}`)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
