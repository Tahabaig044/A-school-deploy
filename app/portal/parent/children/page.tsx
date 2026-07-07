import { getParentChildren } from "@/actions/parent-portal.actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Users, GraduationCap, Calendar } from "lucide-react"

export default async function ChildrenPage() {
  const children = await getParentChildren()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">My Children</h2>
        <p className="text-muted-foreground">View and manage your children's information</p>
      </div>

      {children.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No children linked to your account</p>
            <p className="text-sm text-muted-foreground">
              Contact the school administration to link your children
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {children.map((child) => {
            const enrollment = child.enrollments?.[0]

            return (
              <Card key={child.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">
                      {child.firstName} {child.lastName}
                    </CardTitle>
                    <Badge variant={enrollment ? "success" : "secondary"}>
                      {enrollment ? "Active" : "No Enrollment"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Admission No</p>
                      <p className="font-medium">{child.admissionNo}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Gender</p>
                      <p className="font-medium">{child.gender || "N/A"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Class / Section</p>
                      <p className="font-medium">
                        {enrollment
                          ? `${enrollment.class.name} - ${enrollment.section?.name || "N/A"}`
                          : "Not enrolled"}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link href={`/portal/parent/attendance?student=${child.id}`}>
                        <Calendar className="h-4 w-4" />
                        Attendance
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link href={`/portal/parent/fees?student=${child.id}`}>
                        Fees
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link href={`/portal/parent/results?student=${child.id}`}>
                        <GraduationCap className="h-4 w-4" />
                        Results
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
