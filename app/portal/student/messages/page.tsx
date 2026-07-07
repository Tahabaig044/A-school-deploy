import { getStudentMessages } from "@/actions/student-portal.actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Mail, MailOpen, User } from "lucide-react";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function getRoleBadgeVariant(
  role: string
): "default" | "secondary" | "outline" | "success" | "warning" | "info" {
  switch (role) {
    case "TEACHER":
      return "info";
    case "SCHOOL_ADMIN":
    case "BRANCH_ADMIN":
      return "warning";
    default:
      return "secondary";
  }
}

export default async function StudentMessagesPage() {
  const messages = await getStudentMessages();

  const unreadCount = messages.filter((m) => !m.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        </div>
        {unreadCount > 0 && <Badge>{unreadCount} unread</Badge>}
      </div>

      {messages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Mail className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No messages yet</p>
            <p className="text-sm">Messages from teachers and admin will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {messages.map((message) => (
            <Card
              key={message.id}
              className={message.isRead ? "" : "border-l-4 border-l-primary bg-primary/5"}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    {message.isRead ? (
                      <MailOpen className="h-5 w-5 text-muted-foreground shrink-0" />
                    ) : (
                      <Mail className="h-5 w-5 text-primary shrink-0" />
                    )}
                    <CardTitle
                      className={
                        message.isRead
                          ? "text-base font-medium"
                          : "text-base font-semibold"
                      }
                    >
                      {message.subject}
                    </CardTitle>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(message.createdAt)}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <User className="h-4 w-4" />
                  <span>
                    {message.sender.firstName} {message.sender.lastName}
                  </span>
                  <Badge variant={getRoleBadgeVariant(message.sender.role)}>
                    {message.sender.role.replace("_", " ")}
                  </Badge>
                </div>
                <p className="text-sm line-clamp-2 text-muted-foreground">
                  {message.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
