import { getTeacherClasses } from "@/actions/teacher-portal.actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GraduationCap, BookOpen, Users } from "lucide-react"

export default async function TeacherClassesPage() {
  const assignments = await getTeacherClasses()

  const grouped = assignments.reduce<Record<string, typeof assignments>>((acc, a) => {
    const key = a.class.name
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">My Classes</h2>
        <p className="text-muted-foreground">Your assigned classes and subjects</p>
      </div>

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <GraduationCap className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="text-lg font-semibold">No classes assigned</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              You don&apos;t have any class assignments yet. Contact your administrator.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {Object.entries(grouped).map(([className, classAssignments]) => (
            <Card key={className}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                    <GraduationCap className="text-primary h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>{className}</CardTitle>
                    {classAssignments[0]?.academicSession?.name && (
                      <p className="text-muted-foreground text-xs">
                        {classAssignments[0].academicSession.name}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {classAssignments.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <BookOpen className="text-muted-foreground h-4 w-4" />
                        <div>
                          <p className="text-sm font-medium">{a.subject.name}</p>
                          <p className="text-muted-foreground text-xs">
                            Section {a.section?.name || "N/A"}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        <Users className="mr-1 h-3 w-3" />
                        {a.section?.name || "N/A"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
