"use client"

import { useActionState, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { updateStudent } from "@/actions/student.actions"

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
  postalCode: string | null
  admissionNo: string | null
  admissionDate: string | null
  status: string
}

export function EditStudentForm({
  student,
  classes,
}: {
  student: StudentData
  classes: { id: string; name: string; sections: { id: string; name: string }[] }[]
}) {
  const router = useRouter()
  const updateStudentBind = updateStudent.bind(null, student.id)
  const [state, formAction, pending] = useActionState(updateStudentBind, null)

  useEffect(() => {
    if (state?.success) {
      router.push(`/dashboard/students/${student.id}`)
      router.refresh()
    }
  }, [state, router, student.id])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input id="firstName" name="firstName" defaultValue={student.firstName} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input id="lastName" name="lastName" defaultValue={student.lastName} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                defaultValue={student.dateOfBirth?.split("T")[0] || ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                name="gender"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue={student.gender}
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bloodGroup">Blood Group</Label>
              <Input id="bloodGroup" name="bloodGroup" defaultValue={student.bloodGroup || ""} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="religion">Religion</Label>
              <Input id="religion" name="religion" defaultValue={student.religion || ""} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nationality">Nationality</Label>
              <Input id="nationality" name="nationality" defaultValue={student.nationality || ""} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" defaultValue={student.phone || ""} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={student.email || ""} />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" defaultValue={student.address || ""} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" defaultValue={student.city || ""} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" name="state" defaultValue={student.state || ""} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input id="postalCode" name="postalCode" defaultValue={student.postalCode || ""} />
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="mb-4 text-lg font-medium">Admission & Status</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="admissionNo">Admission No</Label>
                <Input id="admissionNo" name="admissionNo" defaultValue={student.admissionNo || ""} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="admissionDate">Admission Date</Label>
                <Input
                  id="admissionDate"
                  name="admissionDate"
                  type="date"
                  defaultValue={student.admissionDate?.split("T")[0] || ""}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  defaultValue={student.status}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="TRANSFERRED">Transferred</option>
                  <option value="WITHDRAWN">Withdrawn</option>
                  <option value="GRADUATED">Graduated</option>
                </select>
              </div>
            </div>
          </div>

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <div className="flex gap-4">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
