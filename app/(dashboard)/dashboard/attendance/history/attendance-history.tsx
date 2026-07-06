"use client"

import { useRouter, useSearchParams } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type RecordItem = {
  id: string
  date: string
  status: string
  student: { firstName: string; lastName: string; admissionNo: string | null }
}

export function AttendanceHistory({
  records, classes,
}: {
  records: RecordItem[]
  classes: { id: string; name: string }[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Records ({records.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <p className="text-sm text-muted-foreground">No attendance records found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Admission No</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium">
                    {r.student.firstName} {r.student.lastName}
                  </TableCell>
                  <TableCell>{r.student.admissionNo || "-"}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      r.status === "PRESENT" ? "bg-green-100 text-green-800" :
                      r.status === "ABSENT" ? "bg-red-100 text-red-800" :
                      r.status === "LATE" ? "bg-yellow-100 text-yellow-800" :
                      "bg-blue-100 text-blue-800"
                    }`}>
                      {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
