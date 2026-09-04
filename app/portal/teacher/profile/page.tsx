"use client"

import { useEffect, useState } from "react"
import { useActionState } from "react"
import { User, Save, Mail, Calendar, Briefcase } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getTeacherProfile, updateTeacherProfile } from "@/actions/teacher-portal.actions"

interface TeacherData {
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  role: string
  createdAt: Date
  teacher: {
    employeeCode: string
    specialization: string | null
    qualification: string | null
  } | null
}

export default function TeacherProfilePage() {
  const [profile, setProfile] = useState<TeacherData | null>(null)
  const [loading, setLoading] = useState(true)

  const [state, formAction] = useActionState(updateTeacherProfile, {
    success: false,
    error: undefined as string | undefined,
  })

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await getTeacherProfile()
        setProfile(data)
      } catch {
        console.error("Failed to load profile")
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [])

  useEffect(() => {
    if (state.success && profile) {
      const form = document.getElementById("profile-form") as HTMLFormElement
      if (form) {
        const formData = new FormData(form)
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                firstName: (formData.get("firstName") as string) || prev.firstName,
                lastName: (formData.get("lastName") as string) || prev.lastName,
                phone: (formData.get("phone") as string) || prev.phone,
              }
            : prev,
        )
      }
    }
  }, [state.success, profile])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-destructive">Failed to load profile data.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">View and update your profile information</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="text-muted-foreground h-4 w-4" />
              <div>
                <p className="text-muted-foreground text-sm">Email</p>
                <p className="font-medium">{profile.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Briefcase className="text-muted-foreground h-4 w-4" />
              <div>
                <p className="text-muted-foreground text-sm">Role</p>
                <p className="font-medium">{profile.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <User className="text-muted-foreground h-4 w-4" />
              <div>
                <p className="text-muted-foreground text-sm">Employee Code</p>
                <p className="font-medium">{profile.teacher?.employeeCode || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Briefcase className="text-muted-foreground h-4 w-4" />
              <div>
                <p className="text-muted-foreground text-sm">Specialization</p>
                <p className="font-medium">{profile.teacher?.specialization || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <User className="text-muted-foreground h-4 w-4" />
              <div>
                <p className="text-muted-foreground text-sm">Qualification</p>
                <p className="font-medium">{profile.teacher?.qualification || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="text-muted-foreground h-4 w-4" />
              <div>
                <p className="text-muted-foreground text-sm">Member Since</p>
                <p className="font-medium">
                  {new Date(profile.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Save className="h-5 w-5" />
              Edit Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form id="profile-form" action={formAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  defaultValue={profile.firstName ?? ""}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  defaultValue={profile.lastName ?? ""}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" type="tel" defaultValue={profile.phone ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={profile.email ?? ""} disabled />
                <p className="text-muted-foreground text-xs">Email cannot be changed</p>
              </div>

              {state.error && <p className="text-destructive text-sm">{state.error}</p>}
              {state.success && (
                <p className="text-sm text-green-600">Profile updated successfully</p>
              )}

              <Button type="submit" className="w-full">
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
