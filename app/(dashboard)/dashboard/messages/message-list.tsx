"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { sendMessage, markMessageAsRead } from "@/actions/message.actions"
import { useToast } from "@/hooks/use-toast"
import { Mail, MailOpen, Send } from "lucide-react"

export function MessageList({
  inbox,
  sent,
  unreadCount,
  profile,
  page,
  totalPages,
  total,
  activeTab,
}: {
  inbox: any[]
  sent: any[]
  unreadCount: number
  profile: any
  page: number
  totalPages: number
  total: number
  activeTab: string
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedMessage, setSelectedMessage] = useState<any>(null)

  async function handleSend(formData: FormData) {
    formData.set("schoolId", profile.schoolId || "")
    formData.set("senderId", profile.id || "")
    const res = await sendMessage(null, formData)
    if (res?.error) {
      setError(res.error)
    } else {
      setOpen(false)
      setError(null)
      toast({ title: "Message sent" })
      router.refresh()
    }
  }

  async function handleRead(message: any) {
    setSelectedMessage(message)
    if (!message.isRead && message.receiverId === profile.id) {
      await markMessageAsRead(message.id)
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Messages" description="Internal messaging system">
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setError(null) }}>
          <DialogTrigger asChild>
            <Button><Send className="mr-2 h-4 w-4" />New Message</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Message</DialogTitle>
            </DialogHeader>
            <form action={handleSend} className="space-y-4">
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div>
                <Label htmlFor="receiverId">Receiver ID</Label>
                <Input id="receiverId" name="receiverId" required />
              </div>
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" name="subject" />
              </div>
              <div>
                <Label htmlFor="content">Content</Label>
                <textarea
                  id="content"
                  name="content"
                  required
                  className="w-full border rounded p-2 min-h-[100px]"
                />
              </div>
              <Button type="submit" className="w-full">Send</Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={(v) => router.push(`/dashboard/messages?tab=${v}`)}>
        <TabsList>
          <TabsTrigger value="inbox" className="flex items-center gap-2">
            Inbox
            {unreadCount > 0 && <Badge className="ml-1">{unreadCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-4">
          {inbox.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No messages in inbox</p>
          ) : (
            inbox.map((msg) => (
              <div
                key={msg.id}
                className={`p-4 border rounded-lg cursor-pointer hover:bg-muted/50 ${!msg.isRead ? "border-l-4 border-l-primary" : ""}`}
                onClick={() => handleRead(msg)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      {!msg.isRead ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
                      <span className="font-medium">{msg.sender?.firstName} {msg.sender?.lastName}</span>
                      <Badge variant="outline">{msg.sender?.role}</Badge>
                    </div>
                    {msg.subject && <p className="font-medium mt-1">{msg.subject}</p>}
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{msg.content}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(msg.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-4">
          {sent.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No sent messages</p>
          ) : (
            sent.map((msg) => (
              <div key={msg.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      <span className="font-medium">To: {msg.receiver?.firstName} {msg.receiver?.lastName}</span>
                      <Badge variant="outline">{msg.receiver?.role}</Badge>
                    </div>
                    {msg.subject && <p className="font-medium mt-1">{msg.subject}</p>}
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{msg.content}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(msg.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => router.push(`/dashboard/messages?tab=${activeTab}&page=${page - 1}`)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => router.push(`/dashboard/messages?tab=${activeTab}&page=${page + 1}`)}
          >
            Next
          </Button>
        </div>
      )}

      {selectedMessage && (
        <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedMessage.subject || "Message"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">From:</span>
                <span>{selectedMessage.sender?.firstName} {selectedMessage.sender?.lastName}</span>
                <Badge variant="outline">{selectedMessage.sender?.role}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Date:</span>
                <span>{new Date(selectedMessage.createdAt).toLocaleString()}</span>
              </div>
              <div className="border rounded p-4 whitespace-pre-wrap">
                {selectedMessage.content}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
