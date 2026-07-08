"use client"

import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function CollectionReport({
  payments,
  totalCollected,
  byMode,
  fromDate,
  toDate,
}: {
  payments: any[]
  totalCollected: number
  byMode: Record<string, number>
  fromDate: string
  toDate: string
}) {
  const router = useRouter()

  function handleFilter(formData: FormData) {
    const from = formData.get("fromDate") as string
    const to = formData.get("toDate") as string
    router.push(`/dashboard/fees/collection-report?fromDate=${from}&toDate=${to}`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Collection Report"
        description="Daily collection summary"
      />

      <form action={handleFilter} className="flex flex-wrap items-end gap-4">
        <div>
          <label className="text-sm font-medium">From</label>
          <Input name="fromDate" type="date" defaultValue={fromDate} />
        </div>
        <div>
          <label className="text-sm font-medium">To</label>
          <Input name="toDate" type="date" defaultValue={toDate} />
        </div>
        <Button type="submit">Filter</Button>
      </form>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Collected</p>
            <p className="text-2xl font-bold text-green-600">${totalCollected.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Transactions</p>
            <p className="text-2xl font-bold">{payments.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Period</p>
            <p className="text-lg font-medium">{new Date(fromDate).toLocaleDateString()} — {new Date(toDate).toLocaleDateString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Cash / Bank / Online</p>
            <p className="text-lg font-medium">
              ${(byMode["CASH"] || 0).toFixed(2)} / ${(byMode["BANK_TRANSFER"] || 0).toFixed(2)} / ${(byMode["ONLINE"] || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Collection Breakdown by Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(byMode).map(([mode, amount]) => (
              <div key={mode} className="flex justify-between items-center">
                <span className="font-medium">{mode.replace(/_/g, " ")}</span>
                <span className="font-bold">${amount.toFixed(2)}</span>
              </div>
            ))}
            {Object.keys(byMode).length === 0 && (
              <p className="text-muted-foreground text-sm">No collections in this period.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No payments found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="hidden md:table-cell">Receipt #</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead className="hidden md:table-cell">Mode</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="hidden lg:table-cell">Recorded By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell>{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-xs">{payment.receiptNumber}</TableCell>
                      <TableCell>
                        {payment.invoice.student.firstName} {payment.invoice.student.lastName}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{payment.paymentMode.replace(/_/g, " ")}</TableCell>
                      <TableCell className="text-right font-medium">${Number(payment.amount).toFixed(2)}</TableCell>
                      <TableCell className="hidden lg:table-cell">{payment.recorder.firstName} {payment.recorder.lastName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
