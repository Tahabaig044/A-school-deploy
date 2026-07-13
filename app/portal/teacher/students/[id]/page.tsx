import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { setRequestContext, clearRequestContext } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  User, Mail, Phone, MapPin, CalendarDays, Users, GraduationCap, TrendingUp, Activity, AlertTriangle
} from "lucide-react"
import Link from "next/link"

async function TeacherStudentDetailContent({ studentId }: { studentId: string }) {
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
    const teacher = await prisma.teacher.findFirst({ where: { profileId: userId } })
    if (!teacher) return <div className="text-center py-8 text-muted-foreground">Teacher record not found.</div>

    const activeSession = await prisma.academicSession.findFirst({
      where: { schoolId: teacher.schoolId, isCurrent: true },
      select: { id: true },
    })

    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: teacher.schoolId },
      include: {
        enrollments: {
          where: activeSession ? { academicSessionId: activeSession.id, status: "ACTIVE" } : {},
          include: { class: true, section: true },
        },
        parents: { include: { parent: true } },
      },
    })

    if (!student) return <div className="text-center py-8 text-muted-foreground">Student not found.</div>

    const enrollment = student.enrollments[0]

    const attendanceRecords = await prisma.studentAttendance.findMany({
      where: { studentId, academicSessionId: activeSession?.id },
      select: { status: true, date: true },
      orderBy: { date: "desc" },
    })

    const presentCount = attendanceRecords.filter((a) => a.status === "PRESENT").length
    const totalCount = attendanceRecords.length
    const attendancePercent = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0

    const examResults = await prisma.examResult.findMany({
      where: { studentId },
      include: {
        exam: { select: { name: true, totalMarks: true, passingMarks: true, subject: { select: { name: true } } } },
      },
      orderBy: { exam: { examDate: "desc" } },
      take: 10,
    })

    const passedCount = examResults.filter((r) => Number(r.marksObtained) >= r.exam.passingMarks).length
    const avgMarks = examResults.length > 0
      ? Math.round(examResults.reduce((s, r) => s + Number(r.marksObtained), 0) / examResults.length)
      : 0

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/portal/teacher/students" className="text-sm text-muted-foreground hover:text-primary">&larr; Back to Students</Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardContent className="flex flex-col items-center py-6">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={student.photoUrl || undefined} />
                <AvatarFallback className="text-2xl">{student.firstName[0]}{student.lastName[0]}</AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-bold">{student.firstName} {student.lastName}</h3>
              {enrollment && (
                <p className="text-sm text-muted-foreground">{enrollment.class.name}{enrollment.section ? ` - ${enrollment.section.name}` : ""}</p>
              )}
              <p className="text-sm text-muted-foreground">{student.admissionNo || "No admission no"}</p>
              <div className="flex flex-wrap gap-2 mt-3 justify-center">
                <Badge variant="secondary">{student.gender || "N/A"}</Badge>
                <Badge variant="outline">{student.religion || "N/A"}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
            <CardContent className="grid gap-3 text-sm">
              {student.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{student.email}</div>}
              {student.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{student.phone}</div>}
              {student.address && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{student.address}</div>}
              {student.dateOfBirth && <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-muted-foreground" />{new Date(student.dateOfBirth).toLocaleDateString()}</div>}
              {student.bloodGroup && <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-muted-foreground" />Blood Group: {student.bloodGroup}</div>}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Attendance</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attendancePercent}%</div>
              <p className="text-xs text-muted-foreground">{presentCount}/{totalCount} days present</p>
              <div className="w-full bg-secondary h-2 rounded-full mt-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: `${attendancePercent}%` }} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Exam Performance</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgMarks}%</div>
              <p className="text-xs text-muted-foreground">{passedCount}/{examResults.length} exams passed</p>
              <div className="w-full bg-secondary h-2 rounded-full mt-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: `${avgMarks}%` }} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Parents</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{student.parents.length}</div>
              <p className="text-xs text-muted-foreground">Registered parents</p>
            </CardContent>
          </Card>
        </div>

        {student.parents.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Parents</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {student.parents.map((sp) => (
                  <div key={sp.parentId} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">{sp.parent.firstName} {sp.parent.lastName}</p>
                      <p className="text-xs text-muted-foreground">{sp.parent.relationship || "Parent"}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {sp.parent.email && <div>{sp.parent.email}</div>}
                      {sp.parent.phone && <div>{sp.parent.phone}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {examResults.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Recent Exam Results</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">Exam</th>
                      <th className="text-left py-2 font-medium">Subject</th>
                      <th className="text-right py-2 font-medium">Marks</th>
                      <th className="text-center py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examResults.map((r) => (
                      <tr key={r.id} className="border-b hover:bg-muted/50">
                        <td className="py-2">{r.exam.name}</td>
                        <td className="py-2 text-muted-foreground">{r.exam.subject.name}</td>
                        <td className="py-2 text-right">{Number(r.marksObtained)}/{r.exam.totalMarks}</td>
                        <td className="py-2 text-center">
                          {Number(r.marksObtained) >= r.exam.passingMarks ? (
                            <Badge className="bg-green-100 text-green-800">Pass</Badge>
                          ) : (
                            <Badge variant="destructive">Fail</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  } finally {
    clearRequestContext()
  }
}

export default async function TeacherStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <TeacherStudentDetailContent studentId={id} />
}
