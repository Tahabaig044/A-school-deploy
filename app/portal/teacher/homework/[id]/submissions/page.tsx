import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GradeForm } from "./grade-form"
import { ReturnForm } from "./return-form"
import { ArrowLeft, Download, FileText } from "lucide-react"
import Link from "next/link"

const statusStyles: Record<string, string> = {
  SUBMITTED: "bg-blue-100 text-blue-800",
  LATE: "bg-orange-100 text-orange-800",
  GRADED: "bg-green-100 text-green-800",
  RETURNED: "bg-purple-100 text-purple-800",
}

export default async function HomeworkSubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { profile } = await requireRole("TEACHER")
  const { id } = await params

  const teacher = await prisma.teacher.findFirst({
    where: { profileId: profile.id },
    select: { id: true },
  })
  if (!teacher) return <p>Teacher record not found.</p>

  const homework = await prisma.homework.findFirst({
    where: { id, teacherId: teacher.id },
    include: {
      class: { select: { name: true } },
      section: { select: { name: true } },
      subject: { select: { name: true, code: true } },
    },
  })
  if (!homework) notFound()

  const submissions = await prisma.homeworkSubmission.findMany({
    where: { homeworkId: id },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, admissionNo: true } },
      attachments: true,
    },
    orderBy: { submittedAt: "desc" },
  })

  const gradedCount = submissions.filter((s) => s.status === "GRADED").length
  const pendingCount = submissions.filter((s) => s.status === "SUBMITTED" || s.status === "LATE").length
  const returnedCount = submissions.filter((s) => s.status === "RETURNED").length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/portal/teacher/homework">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{homework.title} — Submissions</h2>
          <p className="text-muted-foreground">
            {homework.subject?.name ?? "General"} — {homework.class.name}{homework.section ? ` - ${homework.section.name}` : ""}
            {homework.totalMarks ? ` — Total: ${homework.totalMarks}` : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{submissions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Graded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{gradedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Returned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{returnedCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No submissions yet.</p>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub) => (
                <div key={sub.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium">
                        {sub.student.firstName} {sub.student.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sub.student.admissionNo} — Submitted {new Date(sub.submittedAt).toLocaleString()}
                        {sub.isLate && <span className="text-orange-600 font-medium"> (Late)</span>}
                      </p>
                    </div>
                    <Badge className={statusStyles[sub.status]}>
                      {sub.status === "GRADED" ? "Graded" : sub.status === "RETURNED" ? "Returned" : sub.status === "LATE" ? "Late" : "Submitted"}
                    </Badge>
                  </div>

                  {sub.content && (
                    <div className="mb-3 rounded bg-muted/30 p-3 text-sm">
                      <p className="font-medium text-xs text-muted-foreground mb-1">Submission Content:</p>
                      <p className="whitespace-pre-wrap">{sub.content}</p>
                    </div>
                  )}

                  {sub.attachments.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Attachments:</p>
                      <div className="flex flex-wrap gap-2">
                        {sub.attachments.map((att) => (
                          <a
                            key={att.id}
                            href={att.filePath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-muted"
                          >
                            <FileText className="h-3 w-3" />
                            {att.fileName}
                            <Download className="h-3 w-3 ml-1" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {sub.status === "RETURNED" && sub.returnReason && (
                    <div className="mb-3 rounded border border-purple-200 bg-purple-50 p-3 text-sm">
                      <p className="font-medium text-xs text-purple-700 mb-1">Return Reason:</p>
                      <p className="text-purple-800">{sub.returnReason}</p>
                    </div>
                  )}

                  <div className="border-t pt-3">
                    {sub.status === "GRADED" ? (
                      <GradeForm
                        submissionId={sub.id}
                        currentMarks={sub.marksObtained}
                        currentFeedback={sub.feedback}
                        totalMarks={homework.totalMarks}
                      />
                    ) : sub.status === "RETURNED" ? (
                      <GradeForm
                        submissionId={sub.id}
                        currentMarks={null}
                        currentFeedback={null}
                        totalMarks={homework.totalMarks}
                      />
                    ) : (
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <GradeForm
                            submissionId={sub.id}
                            currentMarks={null}
                            currentFeedback={null}
                            totalMarks={homework.totalMarks}
                          />
                        </div>
                        <ReturnForm submissionId={sub.id} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
