"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Trash2, Mail, Phone } from "lucide-react"
import { deleteAlumni } from "@/actions/alumni.actions"
import { useToast } from "@/hooks/use-toast"

interface Alumni {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  graduationYear: number
  class: string | null
  profession: string | null
  company: string | null
}

export function AlumniList({ alumni }: { alumni: Alumni[] }) {
  const router = useRouter()
  const { toast } = useToast()

  async function handleDelete(id: string) {
    if (!confirm("Remove this alumni record?")) return
    await deleteAlumni(id)
    toast({ title: "Alumni removed" })
    router.refresh()
  }

  if (alumni.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center">
          No alumni records yet. Add your first alumni to get started.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Graduation Year</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Profession</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {alumni.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">
                  {a.firstName} {a.lastName}
                </TableCell>
                <TableCell>{a.graduationYear}</TableCell>
                <TableCell>{a.class || "—"}</TableCell>
                <TableCell>
                  {a.profession}
                  {a.company && ` at ${a.company}`}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {a.email && (
                      <a href={`mailto:${a.email}`} className="text-muted-foreground hover:text-foreground">
                        <Mail className="h-4 w-4" />
                      </a>
                    )}
                    {a.phone && (
                      <a href={`tel:${a.phone}`} className="text-muted-foreground hover:text-foreground">
                        <Phone className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
