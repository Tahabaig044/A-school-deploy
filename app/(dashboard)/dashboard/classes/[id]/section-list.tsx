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
import { deleteSection } from "@/actions/class.actions"

type Section = {
  id: string
  name: string
  capacity: number
}

export function SectionList({ sections, classId }: { sections: Section[]; classId: string }) {
  if (sections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sections</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No sections added yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sections ({sections.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sections.map((section) => (
              <TableRow key={section.id}>
                <TableCell className="font-medium">{section.name}</TableCell>
                <TableCell>{section.capacity}</TableCell>
                <TableCell>
                  <form
                    action={deleteSection.bind(null, section.id)}
                  >
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
