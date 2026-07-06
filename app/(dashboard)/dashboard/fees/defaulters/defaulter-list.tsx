"use client"

import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"

export function DefaulterList({
  defaulters,
  academicSessions,
  selectedSession,
}: {
  defaulters: any[]
  academicSessions: any[]
  selectedSession: string
}) {
  const router = useRouter()

  const totalDue = defaulters.reduce((sum: number, inv: any) => {
    return sum + Number(inv.totalAmount) + Number(inv.lateFee) - Number(inv.paidAmount) - Number(inv.discountAmount)
  }, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee Defaulters"
        description="Students with overdue invoices"
      />

      <div className="flex items-center gap-4">
        <div className="w-64">
          <Select
            value={selectedSession}
            onValueChange={(v: string | null) => { if (v) router.push(`/dashboard/fees/defaulters?sessionId=${v}`) }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select academic session" />
            </SelectTrigger>
            <SelectContent>
              {academicSessions.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedSession && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Defaulters</p>
              <p className="text-2xl font-bold">{defaulters.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Overdue Amount</p>
              <p className="text-2xl font-bold text-red-600">${totalDue.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Session</p>
              <p className="text-2xl font-bold">{academicSessions.find(s => s.id === selectedSession)?.name || ""}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {!selectedSession ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Select an academic session to view defaulters.
          </CardContent>
        </Card>
      ) : defaulters.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-green-600 font-medium">
            No defaulters found for this session.
          </CardContent>
        </Card>
      ) : (
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
            { header: "Admission No", accessorKey: "student.admissionNo" },
            { header: "Phone", accessorKey: "student.phone", cell: ({ row }: any) => row.student.phone || "—" },
            {
              header: "Due Amount",
              cell: ({ row }: any) => {
                const due = Number(row.totalAmount) + Number(row.lateFee) - Number(row.paidAmount) - Number(row.discountAmount)
                return <span className="font-semibold text-red-600">${Math.max(0, due).toFixed(2)}</span>
              },
            },
            {
              header: "Due Date",
              accessorKey: "dueDate",
              cell: ({ row }: any) => {
                const date = new Date(row.dueDate)
                const daysOverdue = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
                return (
                  <span>
                    {date.toLocaleDateString()}
                    {daysOverdue > 0 && <Badge variant="destructive" className="ml-2">{daysOverdue}d overdue</Badge>}
                  </span>
                )
              },
            },
            {
              header: "Status",
              accessorKey: "status",
              cell: ({ row }: any) => (
                <Badge variant={row.status === "PARTIAL" ? "default" : "destructive"}>{row.status}</Badge>
              ),
            },
            {
              header: "Actions",
              cell: ({ row }: any) => (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/fees/payments?invoiceId=${row.id}`}>Record Payment</Link>
                </Button>
              ),
            },
          ]}
          data={defaulters}
        />
      )}
    </div>
  )
}
