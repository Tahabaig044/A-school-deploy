import { getAdmissionStats, getAdmissionsByClass, getAdmissionsByMonth } from "@/actions/admission.actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  UNDER_REVIEW: "bg-blue-100 text-blue-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  WAITLISTED: "bg-purple-100 text-purple-800",
}

export default async function AdmissionsReportPage() {
  const [stats, byClass, byMonth] = await Promise.all([
    getAdmissionStats(),
    getAdmissionsByClass(),
    getAdmissionsByMonth(),
  ])

  if (!stats) {
    return <div className="text-muted-foreground">No data available</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admission Reports</h1>
        <p className="text-muted-foreground">Overview of student admissions</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.thisMonth}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Enrolled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats).filter(([key]) => !["total", "thisMonth"].includes(key)).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[key.toUpperCase()] || ""}>
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </Badge>
                  </div>
                  <span className="font-bold">{value as number}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By Class</CardTitle>
          </CardHeader>
          <CardContent>
            {byClass.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead className="text-right">Applications</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byClass.map((item) => (
                    <TableRow key={item.className}>
                      <TableCell>{item.className}</TableCell>
                      <TableCell className="text-right font-bold">{item.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Trend (Last 6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {byMonth.map((item) => (
              <div key={item.month} className="flex items-center gap-4">
                <span className="w-24 text-sm text-muted-foreground">{item.month}</span>
                <div className="flex-1">
                  <div
                    className="h-6 bg-blue-500 rounded"
                    style={{ width: `${Math.max((item.count / Math.max(...byMonth.map((m) => m.count), 1)) * 100, 2)}%` }}
                  />
                </div>
                <span className="w-12 text-right font-bold">{item.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
