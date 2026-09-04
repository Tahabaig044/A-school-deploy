"use client"

import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"

export function AuditLogList({ logs, profile }: { logs: any[]; profile: any }) {
  function getActionBadge(action: string) {
    switch (action) {
      case "CREATE":
        return <Badge className="bg-green-500">{action}</Badge>
      case "UPDATE":
        return <Badge className="bg-blue-500">{action}</Badge>
      case "DELETE":
        return <Badge variant="destructive">{action}</Badge>
      case "LOGIN":
        return <Badge className="bg-purple-500">{action}</Badge>
      case "PAYMENT":
        return <Badge className="bg-yellow-500">{action}</Badge>
      default:
        return <Badge>{action}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Logs" description="Track all system activities" />

      <DataTable
        columns={[
          {
            header: "Date",
            accessorKey: "createdAt",
            cell: ({ row }: any) => new Date(row.createdAt).toLocaleString(),
          },
          {
            header: "User",
            accessorKey: "user",
            cell: ({ row }: any) => `${row.user?.firstName} ${row.user?.lastName}`,
          },
          {
            header: "Role",
            accessorKey: "user",
            cell: ({ row }: any) => <Badge variant="outline">{row.user?.role}</Badge>,
          },
          {
            header: "Action",
            accessorKey: "action",
            cell: ({ row }: any) => getActionBadge(row.action),
          },
          { header: "Entity Type", accessorKey: "entityType" },
          {
            header: "Entity ID",
            accessorKey: "entityId",
            cell: ({ row }: any) => (row.entityId ? row.entityId.substring(0, 8) + "..." : "-"),
          },
          {
            header: "IP Address",
            accessorKey: "ipAddress",
            cell: ({ row }: any) => row.ipAddress || "-",
          },
        ]}
        data={logs}
      />
    </div>
  )
}
