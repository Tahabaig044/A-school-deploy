"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { generateInvoice, cancelInvoice } from "@/actions/fees.actions"
import { useToast } from "@/hooks/use-toast"
import { Plus, Eye, Trash2 } from "lucide-react"
import Link from "next/link"

const statusVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  PENDING: "secondary",
  PARTIAL: "default",
  PAID: "outline",
  OVERDUE: "destructive",
  CANCELLED: "secondary",
}

export function InvoiceList({
  invoices,
  total,
  page,
  pageSize,
  students,
  academicSessions,
  profile,
}: {
  invoices: any[]
  total: number
  page: number
  pageSize: number
  students: any[]
  academicSessions: any[]
  profile: any
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate(formData: FormData) {
    const res = await generateInvoice(null, formData)
    if (res?.error) {
      setError(res.error)
    } else {
      setOpen(false)
      setError(null)
      toast({ title: "Invoice generated successfully" })
      router.refresh()
    }
  }

  async function handleCancel(id: string, invoiceNumber: string) {
    if (!confirm(`Are you sure you want to cancel invoice "${invoiceNumber}"?`)) return
    try {
      const res = await cancelInvoice(id)
      if (res.success) {
        toast({ title: "Invoice cancelled" })
        router.refresh()
      } else {
        toast({ title: res.error || "Failed to cancel invoice", variant: "destructive" })
      }
    } catch {
      toast({ title: "Failed to cancel invoice", variant: "destructive" })
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Manage fee invoices"
      >
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setError(null) }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Generate Invoice</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Invoice</DialogTitle>
            </DialogHeader>
            <form action={handleGenerate} className="space-y-4">
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div>
                <Label htmlFor="studentId">Student</Label>
                <Select name="studentId" required>
                  <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent>
                    {students.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} ({s.admissionNo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="academicSessionId">Academic Session</Label>
                <Select name="academicSessionId" required>
                  <SelectTrigger><SelectValue placeholder="Select session" /></SelectTrigger>
                  <SelectContent>
                    {academicSessions.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input id="dueDate" name="dueDate" type="date" required />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" />
              </div>
              <Button type="submit" className="w-full">Generate</Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <DataTable
        columns={[
          { header: "Invoice #", accessorKey: "invoiceNumber" },
          {
            header: "Student",
            cell: ({ row }: any) => (
              <Link href={`/dashboard/students/${row.studentId}`} className="text-primary hover:underline">
                {row.student.firstName} {row.student.lastName}
              </Link>
            ),
          },
          { header: "Session", accessorKey: "academicSession.name" },
          {
            header: "Total",
            accessorKey: "totalAmount",
            cell: ({ row }: any) => `$${Number(row.totalAmount).toFixed(2)}`,
          },
          {
            header: "Paid",
            accessorKey: "paidAmount",
            cell: ({ row }: any) => `$${Number(row.paidAmount).toFixed(2)}`,
          },
          {
            header: "Due",
            cell: ({ row }: any) => {
              const due = Number(row.totalAmount) + Number(row.lateFee) - Number(row.paidAmount) - Number(row.discountAmount)
              return <span className="font-semibold">${Math.max(0, due).toFixed(2)}</span>
            },
          },
          { header: "Due Date", accessorKey: "dueDate", cell: ({ row }: any) => new Date(row.dueDate).toLocaleDateString() },
          {
            header: "Status",
            accessorKey: "status",
            cell: ({ row }: any) => <Badge variant={statusVariants[row.status] || "secondary"}>{row.status}</Badge>,
          },
          {
            header: "Actions",
            cell: ({ row }: any) => (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/dashboard/fees/payments?invoiceId=${row.id}`}><Eye className="mr-1 h-4 w-4" />View</Link>
                </Button>
                {row.status !== "CANCELLED" && row.status !== "PAID" && (
                  <Button variant="ghost" size="sm" onClick={() => handleCancel(row.id, row.invoiceNumber)}>
                    <Trash2 className="mr-1 h-4 w-4" />Cancel
                  </Button>
                )}
              </div>
            ),
          },
        ]}
        data={invoices}
      />

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <Button
              key={i}
              variant={page === i + 1 ? "default" : "outline"}
              size="sm"
              onClick={() => router.push(`/dashboard/fees/invoices?page=${i + 1}`)}
            >
              {i + 1}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
