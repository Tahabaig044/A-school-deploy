"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { issueBook, returnBook } from "@/actions/library.actions"
import { useToast } from "@/hooks/use-toast"
import { BookOpen, RotateCcw } from "lucide-react"

export function IssueList({ issues, profile }: { issues: any[]; profile: any }) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleIssue(formData: FormData) {
    const res = await issueBook(null, formData)
    if (res?.error) {
      setError(res.error)
    } else {
      setOpen(false)
      setError(null)
      toast({ title: "Book issued successfully" })
      router.refresh()
    }
  }

  async function handleReturn(issueId: string) {
    if (!confirm("Are you sure you want to mark this book as returned?")) return
    const res = await returnBook(issueId)
    if (res?.error) {
      toast({ title: res.error, variant: "destructive" })
    } else {
      const fineMsg = res.fineAmount && res.fineAmount > 0 ? ` Fine: $${res.fineAmount}` : ""
      toast({ title: `Book returned successfully${fineMsg}` })
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Book Issues" description="Manage book issue and return">
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o)
            if (!o) setError(null)
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <BookOpen className="mr-2 h-4 w-4" />
              Issue Book
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Issue Book</DialogTitle>
            </DialogHeader>
            <form action={handleIssue} className="space-y-4">
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div>
                <Label htmlFor="bookId">Book ID</Label>
                <Input id="bookId" name="bookId" required />
              </div>
              <div>
                <Label htmlFor="studentId">Student ID</Label>
                <Input id="studentId" name="studentId" required />
              </div>
              <div>
                <Label htmlFor="issueDate">Issue Date</Label>
                <Input id="issueDate" name="issueDate" type="date" required />
              </div>
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input id="dueDate" name="dueDate" type="date" required />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" />
              </div>
              <Button type="submit" className="w-full">
                Issue Book
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <DataTable
        columns={[
          { header: "Book", accessorKey: "book", cell: ({ row }: any) => row.book?.title },
          {
            header: "Author",
            accessorKey: "book",
            cell: ({ row }: any) => row.book?.author || "-",
          },
          {
            header: "Student",
            accessorKey: "student",
            cell: ({ row }: any) => `${row.student?.firstName} ${row.student?.lastName}`,
          },
          {
            header: "Admission No",
            accessorKey: "student",
            cell: ({ row }: any) => row.student?.admissionNo,
          },
          {
            header: "Issue Date",
            accessorKey: "issueDate",
            cell: ({ row }: any) => new Date(row.issueDate).toLocaleDateString(),
          },
          {
            header: "Due Date",
            accessorKey: "dueDate",
            cell: ({ row }: any) => new Date(row.dueDate).toLocaleDateString(),
          },
          {
            header: "Return Date",
            accessorKey: "returnDate",
            cell: ({ row }: any) =>
              row.returnDate ? new Date(row.returnDate).toLocaleDateString() : "-",
          },
          {
            header: "Fine",
            accessorKey: "fineAmount",
            cell: ({ row }: any) => (row.fineAmount > 0 ? `$${row.fineAmount}` : "-"),
          },
          {
            header: "Status",
            accessorKey: "status",
            cell: ({ row }: any) => (
              <Badge
                variant={
                  row.status === "RETURNED"
                    ? "default"
                    : row.status === "ISSUED" && new Date(row.dueDate) < new Date()
                      ? "destructive"
                      : "secondary"
                }
              >
                {row.status}
              </Badge>
            ),
          },
          {
            header: "Actions",
            cell: ({ row }: any) => (
              <div className="flex gap-2">
                {row.status === "ISSUED" && (
                  <Button variant="ghost" size="icon" onClick={() => handleReturn(row.id)}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ),
          },
        ]}
        data={issues}
      />
    </div>
  )
}
