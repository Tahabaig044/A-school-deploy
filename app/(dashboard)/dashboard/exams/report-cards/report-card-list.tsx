"use client"

import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import { publishReportCard, unpublishReportCard } from "@/actions/exam.actions"
import { useToast } from "@/hooks/use-toast"
import { Eye, EyeOff, Printer } from "lucide-react"

export function ReportCardList({ reportCards, profile }: { reportCards: any[]; profile: any }) {
  const router = useRouter()
  const { toast } = useToast()

  async function handlePublish(id: string) {
    await publishReportCard(id)
    toast({ title: "Report card published" })
    router.refresh()
  }

  async function handleUnpublish(id: string) {
    await unpublishReportCard(id)
    toast({ title: "Report card unpublished" })
    router.refresh()
  }

  function handlePrint(studentId: string, examId: string) {
    window.open(
      `/dashboard/exams/report-cards/print?studentId=${studentId}&examId=${examId}`,
      "_blank",
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Report Cards" description="Manage and publish student report cards" />

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
          {
            header: "Subject",
            accessorKey: "exam",
            cell: ({ row }: any) => row.exam?.subject?.name,
          },
          { header: "Class", accessorKey: "exam", cell: ({ row }: any) => row.exam?.class?.name },
          { header: "Total Marks", accessorKey: "totalMarks" },
          { header: "Obtained", accessorKey: "obtainedMarks" },
          {
            header: "Percentage",
            accessorKey: "percentage",
            cell: ({ row }: any) =>
              row.percentage ? `${Number(row.percentage).toFixed(1)}%` : "-",
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
          {
            header: "Rank",
            accessorKey: "rank",
            cell: ({ row }: any) => (row.rank ? `#${row.rank}` : "-"),
          },
          {
            header: "Status",
            accessorKey: "isPublished",
            cell: ({ row }: any) => (
              <Badge variant={row.isPublished ? "default" : "secondary"}>
                {row.isPublished ? "Published" : "Draft"}
              </Badge>
            ),
          },
          {
            header: "Actions",
            cell: ({ row }: any) => (
              <div className="flex gap-2">
                {row.isPublished ? (
                  <Button variant="ghost" size="icon" onClick={() => handleUnpublish(row.id)}>
                    <EyeOff className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" onClick={() => handlePublish(row.id)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handlePrint(row.studentId, row.examId)}
                >
                  <Printer className="h-4 w-4" />
                </Button>
              </div>
            ),
          },
        ]}
        data={reportCards}
      />
    </div>
  )
}
