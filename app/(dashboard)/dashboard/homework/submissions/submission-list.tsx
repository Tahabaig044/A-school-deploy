"use client"

import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"

export function SubmissionList({
  submissions,
  profile,
}: {
  submissions: any[]
  profile: any
}) {
  return (
    <div className="space-y-6">
      <PageHeader title="My Homework Submissions" description="View your homework submissions" />

      <DataTable
        columns={[
          { header: "Title", accessorKey: "homework", cell: ({ row }: any) => row.homework?.title },
          { header: "Subject", accessorKey: "homework", cell: ({ row }: any) => row.homework?.subject?.name },
          { header: "Class", accessorKey: "homework", cell: ({ row }: any) => row.homework?.class?.name },
          { header: "Teacher", accessorKey: "homework", cell: ({ row }: any) => `${row.homework?.teacher?.firstName} ${row.homework?.teacher?.lastName}` },
          { header: "Due Date", accessorKey: "homework", cell: ({ row }: any) => new Date(row.homework?.dueDate).toLocaleDateString() },
          { header: "Submitted At", accessorKey: "submittedAt", cell: ({ row }: any) => new Date(row.submittedAt).toLocaleDateString() },
          { header: "Marks", accessorKey: "marksObtained", cell: ({ row }: any) => row.marksObtained ?? "-" },
          { header: "Feedback", accessorKey: "feedback", cell: ({ row }: any) => row.feedback || "-" },
          { header: "Status", accessorKey: "status", cell: ({ row }: any) => (
            <Badge variant={
              row.status === "GRADED" ? "default" :
              row.status === "SUBMITTED" ? "secondary" : "destructive"
            }>
              {row.status}
            </Badge>
          )},
        ]}
        data={submissions}
      />
    </div>
  )
}
