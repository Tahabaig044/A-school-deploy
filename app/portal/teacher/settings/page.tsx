import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { setRequestContext, clearRequestContext } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Settings } from "lucide-react"

async function TeacherSettingsContent() {
  const headerStore = await headers()
  const userId = headerStore.get("X-User-Id")
  const userRole = headerStore.get("X-User-Role")
  const userEmail = headerStore.get("X-User-Email")

  if (!userId || !userRole || !userEmail) redirect("/login")
  if (userRole !== "TEACHER") redirect("/dashboard")

  setRequestContext({
    user: { id: userId, email: userEmail },
    profile: { id: userId, role: "TEACHER" as any, schoolId: null, branchId: null, firstName: null, lastName: null, email: userEmail, phone: null },
  })

  try {
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
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="text-sm">{profile?.firstName} {profile?.lastName}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
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
                <p className="text-sm font-medium text-muted-foreground">Last Login</p>
                <p className="text-sm">
                  {profile?.lastLoginAt
                    ? new Date(profile.lastLoginAt).toLocaleString()
                    : "No login recorded"}
                </p>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Login IP</p>
                <p className="text-sm">{profile?.lastLoginIp || "Not recorded"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  } finally {
    clearRequestContext()
  }
}

export default function TeacherSettingsPage() {
  return <TeacherSettingsContent />
}
