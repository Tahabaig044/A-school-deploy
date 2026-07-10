"use client"

import { useActionState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { addParent } from "@/actions/parent.actions"
import { User, Phone, Mail, MapPin, Calendar, BookOpen } from "lucide-react"

type StudentData = {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: string | null
  gender: string
  bloodGroup: string | null
  religion: string | null
  nationality: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  admissionNo: string | null
  admissionDate: string | null
  status: string
  photoUrl: string | null
  enrollments: {
    id: string
    class: { name: string }
    section: { name: string } | null
    academicSession: { name: string }
    rollNumber: string | null
    status: string
  }[]
  parents: {
    parent: {
      id: string
      firstName: string
      lastName: string
      relationship: string
      phone: string | null
      email: string | null
      occupation: string | null
      address: string | null
      isPrimary: boolean
    }
  }[]
  documents: {
    id: string
    documentType: string
    documentName: string
    filePath: string
    fileSize: number | null
    createdAt: string
  }[]
}

export function StudentProfile({ student }: { student: StudentData }) {
  const currentEnrollment = student.enrollments[0]
  const [parentState, parentAction, parentPending] = useActionState(addParent, null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {student.firstName} {student.lastName}
          </h2>
          <p className="text-muted-foreground">
            {student.admissionNo ? `Admission No: ${student.admissionNo}` : "No admission number"}
            {" — "}
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                student.status === "ACTIVE"
                  ? "bg-green-100 text-green-800"
                  : student.status === "TRANSFERRED"
                    ? "bg-blue-100 text-blue-800"
                    : student.status === "WITHDRAWN"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-800"
              }`}
            >
              {student.status.charAt(0) + student.status.slice(1).toLowerCase()}
            </span>
          </p>
        </div>
        <Link href={`/dashboard/students/${student.id}/edit`}>
          <Button variant="outline">Edit Student</Button>
        </Link>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="parents">Parents</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="homework">Homework</TabsTrigger>
          <TabsTrigger value="transport">Transport</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Gender:</span>
                  <span className="capitalize">{student.gender.toLowerCase()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">DOB:</span>
                  <span>{student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : "-"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Blood Group:</span>
                  <span>{student.bloodGroup || "-"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Religion:</span>
                  <span>{student.religion || "-"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Nationality:</span>
                  <span>{student.nationality || "-"}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Phone:</span>
                  <span>{student.phone || "-"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Email:</span>
                  <span>{student.email || "-"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Address:</span>
                  <span>{student.address || "-"}</span>
                </div>
                {(student.city || student.state) && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">City/State:</span>
                    <span>{[student.city, student.state].filter(Boolean).join(", ")}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Enrollment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentEnrollment ? (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Class:</span>
                      <span>{currentEnrollment.class.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Section:</span>
                      <span>{currentEnrollment.section?.name || "-"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Roll No:</span>
                      <span>{currentEnrollment.rollNumber || "-"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Session:</span>
                      <span>{currentEnrollment.academicSession.name}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Not enrolled</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="parents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Parents / Guardians</CardTitle>
            </CardHeader>
            <CardContent>
              {student.parents.length === 0 ? (
                <p className="text-sm text-muted-foreground mb-4">No parents added yet.</p>
              ) : (
                <Table className="mb-6">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Relationship</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Primary</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {student.parents.map((sp) => (
                      <TableRow key={sp.parent.id}>
                        <TableCell className="font-medium">
                          {sp.parent.firstName} {sp.parent.lastName}
                        </TableCell>
                        <TableCell className="capitalize">
                          {sp.parent.relationship.toLowerCase()}
                        </TableCell>
                        <TableCell>{sp.parent.phone || "-"}</TableCell>
                        <TableCell>{sp.parent.email || "-"}</TableCell>
                        <TableCell>{sp.parent.isPrimary ? "Yes" : "No"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <form action={parentAction} className="grid gap-4 max-w-md border-t pt-4">
                <h4 className="text-sm font-medium">Add Parent</h4>
                <p className="text-xs text-muted-foreground">Providing an email will create a portal account for the parent.</p>
                <input type="hidden" name="studentId" value={student.id} />
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input id="firstName" name="firstName" required />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input id="lastName" name="lastName" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <Label htmlFor="relationship">Relationship</Label>
                    <select
                      id="relationship"
                      name="relationship"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      defaultValue="FATHER"
                    >
                      <option value="FATHER">Father</option>
                      <option value="MOTHER">Mother</option>
                      <option value="GUARDIAN">Guardian</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" type="tel" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="occupation">Occupation</Label>
                    <Input id="occupation" name="occupation" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isPrimary" name="isPrimary" className="h-4 w-4" />
                  <Label htmlFor="isPrimary">Primary Contact</Label>
                </div>
                <Button type="submit" size="sm" disabled={parentPending}>
                  {parentPending ? "Adding..." : "Add Parent"}
                </Button>
                {parentState?.error && (
                  <p className="text-sm text-destructive">{parentState.error}</p>
                )}
                {parentState?.success && parentState?.invitationLink && (
                  <div className="rounded-md bg-green-50 p-3 text-sm">
                    <p className="font-medium text-green-800">Parent added successfully!</p>
                    <p className="text-green-700 mt-1">Share this invitation link:</p>
                    <code className="text-xs break-all text-green-600">{parentState.invitationLink}</code>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {student.documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents uploaded.</p>
              ) : (
                <Table className="mb-6">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Uploaded</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {student.documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.documentName}</TableCell>
                        <TableCell>{doc.documentType}</TableCell>
                        <TableCell>
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <p className="text-sm text-muted-foreground border-t pt-4">
                Document upload with Supabase Storage will be available in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Attendance management coming in Phase 6.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees">
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Fee management coming in Phase 7.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Exam results coming in Phase 8.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="homework">
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Homework management coming in Phase 9.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transport">
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Transport management coming in Phase 10.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
