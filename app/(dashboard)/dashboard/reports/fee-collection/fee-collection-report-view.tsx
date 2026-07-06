"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function FeeCollectionReportView({
  data,
  profile,
}: {
  data: any
  profile: any
}) {
  const router = useRouter()
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  function handleFilter() {
    const params = new URLSearchParams()
    if (fromDate) params.set("fromDate", fromDate)
    if (toDate) params.set("toDate", toDate)
    router.push(`/dashboard/reports/fee-collection?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Fee Collection Report" description="Fee collection and payment statistics" />

      <Card>
        <CardHeader>
          <CardTitle>Filter by Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div>
              <Label htmlFor="fromDate">From Date</Label>
              <Input
                id="fromDate"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="toDate">To Date</Label>
              <Input
                id="toDate"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <Button onClick={handleFilter}>Apply Filter</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${data.totalCollected.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.payments.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Collection by Payment Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            {Object.entries(data.byMode).map(([mode, amount]) => (
              <Badge key={mode} variant="outline" className="text-sm">
                {mode}: ${Number(amount).toLocaleString()}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left">Receipt No</th>
                  <th className="p-3 text-left">Student</th>
                  <th className="p-3 text-left">Amount</th>
                  <th className="p-3 text-left">Mode</th>
                  <th className="p-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.payments.slice(0, 20).map((payment: any) => (
                  <tr key={payment.id} className="border-b">
                    <td className="p-3">{payment.receiptNumber}</td>
                    <td className="p-3">
                      {payment.invoice?.student?.firstName} {payment.invoice?.student?.lastName}
                    </td>
                    <td className="p-3">${Number(payment.amount).toLocaleString()}</td>
                    <td className="p-3"><Badge>{payment.paymentMode}</Badge></td>
                    <td className="p-3">{new Date(payment.paymentDate).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
