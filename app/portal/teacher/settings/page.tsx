import { redirect } from "next/navigation"
import { getCurrentUser, getCurrentProfile } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Settings } from "lucide-react"

async function TeacherSettingsContent() {
  const user = await getCurrentUser()
  const authProfile = await getCurrentProfile()

  if (!user || !authProfile) redirect("/login")
  if (authProfile.role !== "TEACHER") redirect("/dashboard")

  const userId = user.id

  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      lastLoginAt: true,
      lastLoginIp: true,
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Account settings and security</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Account Details
            </CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Name</p>
              <p className="text-sm">
                {profile?.firstName} {profile?.lastName}
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-muted-foreground text-sm font-medium">Email</p>
              <p className="text-sm">{profile?.email}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Login history and security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Last Login</p>
              <p className="text-sm">
                {profile?.lastLoginAt
                  ? new Date(profile.lastLoginAt).toLocaleString()
                  : "No login recorded"}
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-muted-foreground text-sm font-medium">Last Login IP</p>
              <p className="text-sm">{profile?.lastLoginIp || "Not recorded"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function TeacherSettingsPage() {
  return <TeacherSettingsContent />
}
