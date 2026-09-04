"use client"

import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"

export function ResultList({ results, profile }: { results: any[]; profile: any }) {
  return (
    <div className="space-y-6">
      <PageHeader title="Exam Results" description="View all exam results" />

      <DataTable
        columns={[
          {
            header: "Admission No",
            accessorKey: "student",
            cell: ({ row }: any) => row.student?.admissionNo,
          },
          {
            header: "Student",
            accessorKey: "student",
            cell: ({ row }: any) => `${row.student?.firstName} ${row.student?.lastName}`,
          },
          { header: "Exam", accessorKey: "exam", cell: ({ row }: any) => row.exam?.name },
          { header: "Type", accessorKey: "exam", cell: ({ row }: any) => row.exam?.examType?.name },
          {
            header: "Subject",
            accessorKey: "exam",
            cell: ({ row }: any) => row.exam?.subject?.name,
          },
          { header: "Class", accessorKey: "exam", cell: ({ row }: any) => row.exam?.class?.name },
          {
            header: "Total Marks",
            accessorKey: "exam",
            cell: ({ row }: any) => row.exam?.totalMarks,
          },
          {
            header: "Marks Obtained",
            accessorKey: "marksObtained",
            cell: ({ row }: any) => row.marksObtained ?? "-",
          },
          {
            header: "Grade",
            accessorKey: "grade",
            cell: ({ row }: any) => (
              <Badge
                variant={
                  ["A_PLUS", "A", "B_PLUS", "B"].includes(row.grade) ? "default" : "destructive"
                }
              >
                {row.grade?.replace("_", "+")}
              </Badge>
            ),
          },
          { header: "Remarks", accessorKey: "remarks", cell: ({ row }: any) => row.remarks || "-" },
          {
            header: "Graded At",
            accessorKey: "gradedAt",
            cell: ({ row }: any) =>
              row.gradedAt ? new Date(row.gradedAt).toLocaleDateString() : "-",
          },
        ]}
        data={results}
      />
    </div>
  )
}
