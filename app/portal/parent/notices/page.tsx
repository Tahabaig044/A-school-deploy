import { getParentAnnouncements } from "@/actions/parent-portal.actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bell, User, Calendar } from "lucide-react"

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function truncateContent(content: string, maxLength = 150) {
  if (content.length <= maxLength) return content
  return content.slice(0, maxLength).trimEnd() + "..."
}

export default async function ParentNoticesPage() {
  const announcements = await getParentAnnouncements()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="h-6 w-6" />
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Notices</h2>
          <p className="text-muted-foreground">School announcements and updates</p>
        </div>
      </div>

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
            <p className="text-muted-foreground">No announcements at this time.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <CardTitle className="text-lg">{announcement.title}</CardTitle>
                  <Badge variant="secondary" className="shrink-0">
                    {announcement.audience}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  {truncateContent(announcement.content)}
                </p>
                <div className="text-muted-foreground flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {announcement.author.firstName} {announcement.author.lastName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(announcement.publishedAt || announcement.createdAt)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
