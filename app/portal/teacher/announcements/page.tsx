import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { setRequestContext, clearRequestContext } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Megaphone } from "lucide-react"

async function TeacherAnnouncementsContent() {
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
      select: { schoolId: true, branchId: true },
    })

    if (!profile?.schoolId) return <div className="text-center py-8 text-muted-foreground">School not found.</div>

    const announcements = await prisma.announcement.findMany({
      where: {
        schoolId: profile.schoolId,
        isPublished: true,
        OR: [
          { audience: "ALL" },
          { audience: "TEACHER" },
          { audience: "TEACHERS" },
        ],
      },
      include: {
        author: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Announcements</h2>
          <p className="text-muted-foreground">Latest announcements from administration</p>
        </div>
        {announcements.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No announcements</p>
              <p className="text-sm text-muted-foreground">No announcements found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {announcements.map((a) => (
              <Card key={a.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{a.title}</CardTitle>
                    <Badge variant="outline">{a.audience}</Badge>
                  </div>
                  <CardDescription>
                    By {a.author.firstName} {a.author.lastName} | {new Date(a.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  } finally {
    clearRequestContext()
  }
}

export default function TeacherAnnouncementsPage() {
  return <TeacherAnnouncementsContent />
}
