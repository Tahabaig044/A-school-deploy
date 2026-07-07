import { getStudentProfile } from "@/actions/student-portal.actions"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { User, GraduationCap, Calendar, MapPin, Phone, Mail } from "lucide-react"

export default async function StudentProfilePage() {
  const data = await getStudentProfile()
  if (!data) redirect("/portal/student")

  const { student, enrollment } = data

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">My Profile</h2>
        <p className="text-muted-foreground">View your personal and enrollment details</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Personal Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Full Name</p>
                <p className="font-medium">{student.firstName} {student.lastName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Admission No.</p>
                <p className="font-medium">{student.admissionNo || "N/A"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Date of Birth</p>
                <p className="font-medium">
                  {student.dateOfBirth
                    ? new Date(student.dateOfBirth).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Gender</p>
                <p className="font-medium">{student.gender || "N/A"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Blood Group</p>
                <p className="font-medium">{student.bloodGroup || "N/A"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Religion</p>
                <p className="font-medium">{student.religion || "N/A"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">Nationality</p>
                <p className="font-medium">{student.nationality || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <GraduationCap className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Enrollment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Class</p>
                <p className="font-medium">{enrollment?.class?.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Section</p>
                <p className="font-medium">{enrollment?.section?.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Roll Number</p>
                <p className="font-medium">{enrollment?.rollNumber || "N/A"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Academic Session</p>
                <p className="font-medium">{enrollment?.academicSession?.name || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Phone</p>
                <p className="font-medium">{student.phone || "N/A"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium">{student.email || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="col-span-2">
                <p className="text-muted-foreground">Street Address</p>
                <p className="font-medium">{student.address || "N/A"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">City</p>
                <p className="font-medium">{student.city || "N/A"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">State</p>
                <p className="font-medium">{student.state || "N/A"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Postal Code</p>
                <p className="font-medium">{student.postalCode || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
