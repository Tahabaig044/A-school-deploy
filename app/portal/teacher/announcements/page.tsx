import { redirect } from "next/navigation"
import { getCurrentUser, getCurrentProfile } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Megaphone } from "lucide-react"

async function TeacherAnnouncementsContent() {
  const user = await getCurrentUser()
  const profile = await getCurrentProfile()

  if (!user || !profile) redirect("/login")
  if (profile.role !== "TEACHER") redirect("/dashboard")

  const userId = user.id

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
}

export default function TeacherAnnouncementsPage() {
  return <TeacherAnnouncementsContent />
}
