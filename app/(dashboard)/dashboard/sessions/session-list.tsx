import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { setCurrentSession, deleteSession } from "@/actions/session.actions"

type Session = {
  id: string
  name: string
  startDate: Date
  endDate: Date
  isCurrent: boolean
  school: { name: string }
}

export function SessionList({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No academic sessions created yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Sessions ({sessions.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>School</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell className="font-medium">{session.name}</TableCell>
                <TableCell>{session.school.name}</TableCell>
                <TableCell>
                  {session.startDate.toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {session.endDate.toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {session.isCurrent ? (
                    <span className="text-green-600 font-medium">Current</span>
                  ) : (
                    "Inactive"
                  )}
                </TableCell>
                <TableCell className="flex gap-2">
                  {!session.isCurrent && (
                    <form action={setCurrentSession.bind(null, session.id)}>
                      <Button variant="outline" size="sm" type="submit">
                        Set Current
                      </Button>
                    </form>
                  )}
                  <form action={deleteSession.bind(null, session.id)}>
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
