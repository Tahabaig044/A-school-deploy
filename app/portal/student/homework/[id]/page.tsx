"use client"

import { useState, useEffect, useActionState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getHomeworkDetail, submitHomework } from "@/actions/student-portal.actions"
import { ArrowLeft, Upload, FileText, X, Download, Clock, CheckCircle2, AlertCircle, RotateCcw } from "lucide-react"
import Link from "next/link"

type AttachmentFile = {
  url: string
  fileName: string
  fileType: string
  fileSize: number
}

const statusBadge: Record<string, { class: string; label: string }> = {
  NOT_SUBMITTED: { class: "bg-gray-100 text-gray-800", label: "Not Submitted" },
  SUBMITTED: { class: "bg-blue-100 text-blue-800", label: "Submitted" },
  LATE: { class: "bg-orange-100 text-orange-800", label: "Late" },
  GRADED: { class: "bg-green-100 text-green-800", label: "Graded" },
  RETURNED: { class: "bg-purple-100 text-purple-800", label: "Returned" },
}

export default function StudentHomeworkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const [homeworkId, setHomeworkId] = useState<string>("")
  const [homework, setHomework] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [files, setFiles] = useState<File[]>([])
  const [uploaded, setUploaded] = useState<AttachmentFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [state, formAction, pending] = useActionState(submitHomework, null)

  useEffect(() => {
    params.then((p) => setHomeworkId(p.id))
  }, [params])

  useEffect(() => {
    if (!homeworkId) return
    setLoading(true)
    getHomeworkDetail(homeworkId).then((data) => {
      setHomework(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [homeworkId])

  useEffect(() => {
    if (state?.success) {
      getHomeworkDetail(homeworkId).then(setHomework)
    }
  }, [state?.success, homeworkId])

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files
    if (!selected || selected.length === 0) return

    setUploading(true)
    for (const file of Array.from(selected)) {
      const fd = new FormData()
      fd.append("file", file)
      try {
        const res = await fetch("/api/upload/homework", { method: "POST", body: fd })
        if (res.ok) {
          const data = await res.json()
          setUploaded((prev) => [...prev, data])
          setFiles((prev) => [...prev, file])
        }
      } catch { }
    }
    setUploading(false)
  }

  function removeFile(index: number) {
    setUploaded((prev) => prev.filter((_, i) => i !== index))
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-4 w-48 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (!homework) {
    return <p className="text-muted-foreground">Homework not found.</p>
  }

  const latest = homework.latestSubmission

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-3xl font-bold tracking-tight">{homework.title}</h2>
          <p className="text-muted-foreground">
            {homework.subject?.name ?? "General"} — {homework.teacher?.firstName ?? "Unknown"} {homework.teacher?.lastName ?? ""}
          </p>
        </div>
        <Badge className={statusBadge[homework.submissionStatus]?.class || "bg-gray-100"}>
          {statusBadge[homework.submissionStatus]?.label || homework.submissionStatus}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {homework.description && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Description</p>
                <p className="text-sm whitespace-pre-wrap">{homework.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Class</p>
                <p className="font-medium">{homework.class.name}{homework.section ? ` - ${homework.section.name}` : ""}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Subject</p>
                <p className="font-medium">{homework.subject?.name ?? "General"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Due Date</p>
                <p className="font-medium">{new Date(homework.dueDate).toLocaleDateString()}</p>
              </div>
              {homework.totalMarks && (
                <div>
                  <p className="text-muted-foreground">Total Marks</p>
                  <p className="font-medium">{homework.totalMarks}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest Submission</CardTitle>
          </CardHeader>
          <CardContent>
            {!latest ? (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">No submission yet</p>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className={statusBadge[latest.status === "GRADED" ? "GRADED" : latest.isLate ? "LATE" : "SUBMITTED"]?.class}>
                    {latest.status === "GRADED" ? "Graded" : latest.isLate ? "Late" : "Submitted"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Submitted</span>
                  <span>{new Date(latest.submittedAt).toLocaleString()}</span>
                </div>
                {latest.marksObtained != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Marks</span>
                    <span className="font-bold text-lg">{latest.marksObtained}{homework.totalMarks ? ` / ${homework.totalMarks}` : ""}</span>
                  </div>
                )}
                {latest.feedback && (
                  <div className="rounded bg-muted/30 p-2">
                    <p className="text-xs text-muted-foreground mb-1">Feedback</p>
                    <p>{latest.feedback}</p>
                  </div>
                )}
                {latest.returnReason && (
                  <div className="rounded border border-purple-200 bg-purple-50 p-2">
                    <p className="text-xs text-purple-700 mb-1">Return Reason</p>
                    <p className="text-purple-800">{latest.returnReason}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {homework.canSubmit && !homework.isPastDue && (
        <Card>
          <CardHeader>
            <CardTitle>{latest?.status === "RETURNED" ? "Resubmit Homework" : "Submit Homework"}</CardTitle>
            {latest?.status === "RETURNED" && (
              <p className="text-sm text-purple-600">Your submission was returned. Please review the feedback and resubmit.</p>
            )}
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-4">
              <input type="hidden" name="homeworkId" value={homeworkId} />
              <input type="hidden" name="attachments" value={JSON.stringify(uploaded)} />

              <div className="space-y-2">
                <Label htmlFor="content">Your Answer</Label>
                <Textarea
                  id="content"
                  name="content"
                  rows={6}
                  placeholder="Type your answer here..."
                  defaultValue={latest?.content || ""}
                />
              </div>

              <div className="space-y-2">
                <Label>Attachments (PDF, DOCX, Images — max 10MB each)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.txt"
                    multiple
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="flex-1"
                  />
                  {uploading && <span className="text-sm text-muted-foreground">Uploading...</span>}
                </div>
                {uploaded.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {uploaded.map((f, i) => (
                      <div key={i} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span>{f.fileName}</span>
                          <span className="text-xs text-muted-foreground">({formatFileSize(f.fileSize)})</span>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(i)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {homework.isPastDue && (
                <p className="text-sm text-orange-600">
                  <AlertCircle className="h-3 w-3 inline mr-1" />
                  The due date has passed. Submissions may be marked as late.
                </p>
              )}

              <Button type="submit" disabled={pending}>
                {pending ? "Submitting..." : latest?.status === "RETURNED" ? "Resubmit" : "Submit"}
              </Button>
              {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
            </form>
          </CardContent>
        </Card>
      )}

      {homework.isPastDue && !homework.canSubmit && (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>The due date has passed and submissions are locked.</p>
          </CardContent>
        </Card>
      )}

      {homework.submissions.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Submission History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {homework.statusHistory.map((entry: any) => (
                <div key={entry.id} className="flex items-start gap-3 rounded-lg border p-3">
                  <div className="mt-0.5">
                    {entry.status === "GRADED" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : entry.isLate ? (
                      <Clock className="h-5 w-5 text-orange-500" />
                    ) : (
                      <FileText className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {entry.status === "GRADED" ? "Graded" : entry.status === "RETURNED" ? "Returned" : entry.isLate ? "Late Submission" : "Submitted"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.submittedAt).toLocaleString()}
                      </span>
                    </div>
                    {entry.marksObtained != null && (
                      <p className="text-muted-foreground">Marks: {entry.marksObtained}</p>
                    )}
                    {entry.feedback && (
                      <p className="text-muted-foreground">Feedback: {entry.feedback}</p>
                    )}
                    {entry.returnReason && (
                      <p className="text-purple-600">Return reason: {entry.returnReason}</p>
                    )}
                    {entry.attachments?.length > 0 && (
                      <div className="flex gap-2 mt-1">
                        {entry.attachments.map((att: any) => (
                          <a key={att.id} href={att.filePath} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            <Download className="h-3 w-3" />{att.fileName}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
