"use client"

import { useActionState, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CheckCircle, Copy, Mail } from "lucide-react"
import { createStudent } from "@/actions/student.actions"
import { enrollStudent } from "@/actions/parent.actions"

type ClassItem = { id: string; name: string; sections: { id: string; name: string }[] }
type SessionItem = { id: string; name: string }

export function StudentForm({
  classes,
  sessions,
}: {
  classes: ClassItem[]
  sessions: SessionItem[]
}) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(createStudent, null)
  const [selectedClassId, setSelectedClassId] = useState("")
  const [sections, setSections] = useState<{ id: string; name: string }[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const cls = classes.find((c) => c.id === selectedClassId)
    setSections(cls?.sections || [])
  }, [selectedClassId, classes])

  const handleCopyLink = async () => {
    if (state?.invitationLink) {
      await navigator.clipboard.writeText(state.invitationLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (state?.success && state?.invitationLink) {
    return (
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Student Created Successfully!
          </CardTitle>
          <CardDescription>
            Share this invitation link with the student to set their password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <code className="text-sm break-all flex-1">{state.invitationLink}</code>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="shrink-0"
            >
              {copied ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy Link
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            This link expires in 24 hours. The student will set their password and activate their account.
          </p>
          <Button variant="outline" onClick={() => router.push("/dashboard/students")}>
            View All Students
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Information</CardTitle>
        <CardDescription>
          Creating a student will also create their portal account if an email is provided.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input id="firstName" name="firstName" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input id="lastName" name="lastName" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input id="dateOfBirth" name="dateOfBirth" type="date" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                name="gender"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue="MALE"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bloodGroup">Blood Group</Label>
              <Input id="bloodGroup" name="bloodGroup" placeholder="e.g. A+" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="religion">Religion</Label>
              <Input id="religion" name="religion" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nationality">Nationality</Label>
              <Input id="nationality" name="nationality" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" name="state" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input id="postalCode" name="postalCode" />
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="mb-4 text-lg font-medium">Admission Information</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="admissionNo">Admission No</Label>
                <Input id="admissionNo" name="admissionNo" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="admissionDate">Admission Date</Label>
                <Input id="admissionDate" name="admissionDate" type="date" />
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="mb-4 text-lg font-medium">Enrollment</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="grid gap-2">
                <Label htmlFor="classId">Class</Label>
                <select
                  id="classId"
                  name="classId"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                >
                  <option value="">Select class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sectionId">Section</Label>
                <select
                  id="sectionId"
                  name="sectionId"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select section</option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="academicSessionId">Academic Session</Label>
                <select
                  id="academicSessionId"
                  name="academicSessionId"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select session</option>
                  {sessions.map((ses) => (
                    <option key={ses.id} value={ses.id}>
                      {ses.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rollNumber">Roll Number</Label>
                <Input id="rollNumber" name="rollNumber" />
              </div>
            </div>
          </div>

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <div className="flex gap-4">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save Student"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
