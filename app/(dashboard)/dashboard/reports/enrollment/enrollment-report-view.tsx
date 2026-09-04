"use client"

import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function EnrollmentReportView({ data, profile }: { data: any[]; profile: any }) {
  const totalStudents = data.reduce((sum, d) => sum + d.count, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Enrollment Report"
        description="Class-wise student enrollment statistics"
      />

      <Card>
        <CardHeader>
          <CardTitle>Total Students: {totalStudents}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="p-3 text-left">Class</th>
                  <th className="p-3 text-right">Students</th>
                  <th className="p-3 text-right">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-3">{item.className}</td>
                    <td className="p-3 text-right">{item.count}</td>
                    <td className="p-3 text-right">
                      {totalStudents > 0 ? ((item.count / totalStudents) * 100).toFixed(1) : 0}%
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
