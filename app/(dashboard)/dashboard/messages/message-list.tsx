"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { UserPicker } from "@/components/ui/user-picker"
import {
  sendMessage,
  markMessageAsRead,
  toggleStarMessage,
  deleteMessage,
} from "@/actions/message.actions"
import { useToast } from "@/hooks/use-toast"
import {
  Mail,
  MailOpen,
  Send,
  Star,
  Trash2,
  Archive,
  FileText,
  Search,
  Reply,
  Forward,
} from "lucide-react"

export function MessageList({
  inbox,
  sent,
  drafts,
  archived,
  starred,
  unreadCount,
  profile,
  page,
  totalPages,
  total,
  activeTab,
  tabCounts,
  search,
}: {
  inbox: any[]
  sent: any[]
  drafts: any[]
  archived: any[]
  starred: any[]
  unreadCount: number
  profile: any
  page: number
  totalPages: number
  total: number
  activeTab: string
  tabCounts: Record<string, number>
  search: string
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedMessage, setSelectedMessage] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState(search)
  const [isPending, startTransition] = useTransition()
  const [replyMode, setReplyMode] = useState(false)
  const [replyTo, setReplyTo] = useState<any>(null)
  const [recipients, setRecipients] = useState<string[]>([])

  async function handleSend(formData: FormData) {
    formData.set("schoolId", profile.schoolId || "")
    formData.set("senderId", profile.id || "")
    if (replyTo) {
      formData.set("parentMessageId", replyTo.id)
    }
    if (recipients.length === 0 && replyTo) {
      formData.set("receiverIds", JSON.stringify([replyTo.sender?.id]))
    }
    const res = await sendMessage(null, formData)
    if (res?.error) {
      setError(res.error)
    } else {
      setOpen(false)
      setError(null)
      setReplyMode(false)
      setReplyTo(null)
      setRecipients([])
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

  async function handleStar(messageId: string) {
    await toggleStarMessage(messageId)
    toast({ title: "Message starred" })
    router.refresh()
  }

  async function handleDelete(messageId: string) {
    await deleteMessage(messageId)
    toast({ title: "Message deleted" })
    setSelectedMessage(null)
    router.refresh()
  }

  function handleReply(message: any) {
    setReplyTo(message)
    setReplyMode(true)
    setOpen(true)
  }

  function handleForward(message: any) {
    setReplyTo(null)
    setReplyMode(false)
    setOpen(true)
  }

  function handleSearch() {
    router.push(`/dashboard/messages?tab=${activeTab}&search=${encodeURIComponent(searchQuery)}`)
  }

  const getMessageList = () => {
    switch (activeTab) {
      case "inbox":
        return inbox
      case "sent":
        return sent
      case "drafts":
        return drafts
      case "archived":
        return archived
      case "starred":
        return starred
      default:
        return inbox
    }
  }

  const messages = getMessageList()

  return (
    <div className="space-y-6">
      <PageHeader title="Messages" description="Internal messaging system">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-64 pl-9"
            />
          </div>
          <Dialog
            open={open}
            onOpenChange={(o) => {
              setOpen(o)
              if (!o) {
                setError(null)
                setReplyMode(false)
                setReplyTo(null)
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Send className="mr-2 h-4 w-4" />
                {replyMode ? "Reply" : "New Message"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {replyMode
                    ? `Reply to ${replyTo?.sender?.firstName} ${replyTo?.sender?.lastName}`
                    : "New Message"}
                </DialogTitle>
              </DialogHeader>
              <form action={handleSend} className="space-y-4">
                {error && <p className="text-sm text-red-500">{error}</p>}
                {!replyMode && (
                  <div>
                    <Label>Recipient</Label>
                    <UserPicker
                      name="receiverIds"
                      selected={recipients}
                      onChange={setRecipients}
                      multiple={false}
                      placeholder="Search users by name, email, or ID..."
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    name="subject"
                    defaultValue={replyMode ? `Re: ${replyTo?.subject || "Message"}` : ""}
                  />
                </div>
                <div>
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    name="content"
                    required
                    className="min-h-[100px]"
                    defaultValue={
                      replyMode
                        ? `\n\n--- Original Message ---\nFrom: ${replyTo?.sender?.firstName} ${replyTo?.sender?.lastName}\nDate: ${new Date(replyTo?.createdAt).toLocaleString()}\n\n${replyTo?.content}`
                        : ""
                    }
                  />
                </div>
                <Button type="submit" className="w-full">
                  <Send className="mr-2 h-4 w-4" />
                  {replyMode ? "Send Reply" : "Send"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      <Tabs
        value={activeTab}
        onValueChange={(v) =>
          router.push(`/dashboard/messages?tab=${v}&search=${encodeURIComponent(searchQuery)}`)
        }
      >
        <TabsList>
          <TabsTrigger value="inbox" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Inbox
            {unreadCount > 0 && <Badge className="ml-1">{unreadCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Sent
          </TabsTrigger>
          <TabsTrigger value="drafts" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Drafts
            {tabCounts.drafts > 0 && (
              <Badge variant="secondary" className="ml-1">
                {tabCounts.drafts}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="starred" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Starred
          </TabsTrigger>
          <TabsTrigger value="archived" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Archived
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {messages.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No messages in {activeTab}</p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`hover:bg-muted/50 cursor-pointer rounded-lg border p-4 ${
                  !msg.isRead && msg.receiverId === profile.id ? "border-l-primary border-l-4" : ""
                }`}
                onClick={() => handleRead(msg)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {!msg.isRead && msg.receiverId === profile.id ? (
                        <Mail className="text-primary h-4 w-4" />
                      ) : (
                        <MailOpen className="text-muted-foreground h-4 w-4" />
                      )}
                      <span className="font-medium">
                        {activeTab === "sent" || activeTab === "drafts"
                          ? `To: ${msg.receiver?.firstName} ${msg.receiver?.lastName}`
                          : `From: ${msg.sender?.firstName} ${msg.sender?.lastName}`}
                      </span>
                      <Badge variant="outline">
                        {activeTab === "sent" || activeTab === "drafts"
                          ? msg.receiver?.role
                          : msg.sender?.role}
                      </Badge>
                      {msg.isStarred && (
                        <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                      )}
                    </div>
                    {msg.subject && <p className="mt-1 font-medium">{msg.subject}</p>}
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">{msg.content}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {new Date(msg.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStar(msg.id)
                        }}
                      >
                        <Star
                          className={`h-4 w-4 ${msg.isStarred ? "fill-yellow-500 text-yellow-500" : ""}`}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(msg.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
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
            onClick={() =>
              router.push(
                `/dashboard/messages?tab=${activeTab}&page=${page - 1}&search=${encodeURIComponent(searchQuery)}`,
              )
            }
          >
            Previous
          </Button>
          <span className="text-muted-foreground text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() =>
              router.push(
                `/dashboard/messages?tab=${activeTab}&page=${page + 1}&search=${encodeURIComponent(searchQuery)}`,
              )
            }
          >
            Next
          </Button>
        </div>
      )}

      {selectedMessage && (
        <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedMessage.subject || "Message"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">From:</span>
                  <span>
                    {selectedMessage.sender?.firstName} {selectedMessage.sender?.lastName}
                  </span>
                  <Badge variant="outline">{selectedMessage.sender?.role}</Badge>
                </div>
                <span className="text-muted-foreground text-sm">
                  {new Date(selectedMessage.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="rounded border p-4 whitespace-pre-wrap">
                {selectedMessage.content}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleReply(selectedMessage)
                    setSelectedMessage(null)
                  }}
                >
                  <Reply className="mr-2 h-4 w-4" />
                  Reply
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleForward(selectedMessage)
                    setSelectedMessage(null)
                  }}
                >
                  <Forward className="mr-2 h-4 w-4" />
                  Forward
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleStar(selectedMessage.id)
                    setSelectedMessage(null)
                  }}
                >
                  <Star
                    className={`mr-2 h-4 w-4 ${selectedMessage.isStarred ? "fill-yellow-500 text-yellow-500" : ""}`}
                  />
                  {selectedMessage.isStarred ? "Unstar" : "Star"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleDelete(selectedMessage.id)
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
              {selectedMessage.replies && selectedMessage.replies.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="mb-2 font-medium">Replies ({selectedMessage.replies.length})</h4>
                  <div className="space-y-3">
                    {selectedMessage.replies.map((reply: any) => (
                      <div key={reply.id} className="bg-muted/30 rounded border p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {reply.sender?.firstName} {reply.sender?.lastName}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {new Date(reply.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
