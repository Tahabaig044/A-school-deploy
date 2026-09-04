"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function ExpenseReportView({ data, profile }: { data: any; profile: any }) {
  const router = useRouter()
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  function handleFilter() {
    const params = new URLSearchParams()
    if (fromDate) params.set("fromDate", fromDate)
    if (toDate) params.set("toDate", toDate)
    router.push(`/dashboard/reports/expenses?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Expense Report" description="Expense breakdown by category" />

      <Card>
        <CardHeader>
          <CardTitle>Filter by Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
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

      <Card>
        <CardHeader>
          <CardTitle>Total Expenses: ${data.totalExpenses.toLocaleString()}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="p-3 text-left">Category</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-right">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.byCategory).map(([category, amount]) => (
                  <tr key={category} className="border-b">
                    <td className="p-3">
                      <Badge>{category}</Badge>
                    </td>
                    <td className="p-3 text-right">${Number(amount).toLocaleString()}</td>
                    <td className="p-3 text-right">
                      {data.totalExpenses > 0
                        ? ((Number(amount) / data.totalExpenses) * 100).toFixed(1)
                        : 0}
                      %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expense History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Category</th>
                  <th className="p-3 text-left">Description</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.expenses.slice(0, 20).map((expense: any) => (
                  <tr key={expense.id} className="border-b">
                    <td className="p-3">{new Date(expense.expenseDate).toLocaleDateString()}</td>
                    <td className="p-3">
                      <Badge>{expense.category}</Badge>
                    </td>
                    <td className="p-3">{expense.description || "-"}</td>
                    <td className="p-3 text-right">${Number(expense.amount).toLocaleString()}</td>
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
