import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { deleteAssignment } from "@/actions/assignment.actions"

type AssignmentItem = {
  id: string
  teacher: { firstName: string; lastName: string; employeeCode: string }
  class: { name: string }
  section: { name: string } | null
  subject: { name: string; code: string }
  academicSession: { name: string }
}

export function AssignmentList({ assignments }: { assignments: AssignmentItem[] }) {
  if (assignments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No assignments created yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Assignments ({assignments.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Teacher</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Session</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">
                  {a.teacher.firstName} {a.teacher.lastName}
                </TableCell>
                <TableCell>{a.class.name}</TableCell>
                <TableCell>{a.section?.name || "-"}</TableCell>
                <TableCell>
                  {a.subject.name} ({a.subject.code})
                </TableCell>
                <TableCell>{a.academicSession.name}</TableCell>
                <TableCell>
                  <form action={deleteAssignment.bind(null, a.id)}>
                    <Button variant="destructive" size="sm" type="submit">
                      Delete
                    </Button>
                  </form>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
