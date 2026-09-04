"use client"

import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function FeeDefaulterReportView({ data, profile }: { data: any[]; profile: any }) {
  const totalDue = data.reduce((sum, d) => sum + d.dueAmount, 0)
  const totalStudents = data.length

  return (
    <div className="space-y-6">
      <PageHeader title="Fee Defaulter Report" description="Students with pending fee payments" />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Defaulters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Due Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${totalDue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fee Defaulters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="p-3 text-left">Student</th>
                  <th className="p-3 text-left">Admission No</th>
                  <th className="p-3 text-left">Invoice</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-right">Paid</th>
                  <th className="p-3 text-right">Due</th>
                  <th className="p-3 text-left">Due Date</th>
                  <th className="p-3 text-right">Days Overdue</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-3">
                      {item.student?.firstName} {item.student?.lastName}
                    </td>
                    <td className="p-3">{item.student?.admissionNo}</td>
                    <td className="p-3">{item.invoiceNumber}</td>
                    <td className="p-3 text-right">${item.totalAmount.toLocaleString()}</td>
                    <td className="p-3 text-right">${item.paidAmount.toLocaleString()}</td>
                    <td className="p-3 text-right text-red-600">
                      ${item.dueAmount.toLocaleString()}
                    </td>
                    <td className="p-3">{new Date(item.dueDate).toLocaleDateString()}</td>
                    <td className="p-3 text-right">
                      {item.daysOverdue > 0 ? (
                        <Badge variant="destructive">{item.daysOverdue} days</Badge>
                      ) : (
                        <Badge>Due today</Badge>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge variant={item.status === "PENDING" ? "destructive" : "secondary"}>
                        {item.status}
                      </Badge>
                    </td>
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
