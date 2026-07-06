"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
                  <th className="text-left p-2 font-medium">Email</th>
                  <th className="text-left p-2 font-medium">Role</th>
                  <th className="text-left p-2 font-medium">Status</th>
                  <th className="text-left p-2 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0">
                    <td className="p-2">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="p-2 text-muted-foreground">{user.email || "—"}</td>
                    <td className="p-2">{getRoleBadge(user.role)}</td>
                    <td className="p-2">{getStatusBadge(user.status)}</td>
                    <td className="p-2 text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
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
