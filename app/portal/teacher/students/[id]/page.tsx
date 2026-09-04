import { redirect } from "next/navigation"
import { getCurrentUser, getCurrentProfile } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  User,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  Users,
  GraduationCap,
  TrendingUp,
  Activity,
  AlertTriangle,
} from "lucide-react"
import Link from "next/link"

async function TeacherStudentDetailContent({ studentId }: { studentId: string }) {
  const user = await getCurrentUser()
  const profile = await getCurrentProfile()

  if (!user || !profile) redirect("/login")
  if (profile.role !== "TEACHER") redirect("/dashboard")

  const userId = user.id

  const teacher = await prisma.teacher.findFirst({ where: { profileId: userId } })
  if (!teacher)
    return <div className="text-muted-foreground py-8 text-center">Teacher record not found.</div>

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

  if (!student)
    return <div className="text-muted-foreground py-8 text-center">Student not found.</div>

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
      exam: {
        select: {
          name: true,
          totalMarks: true,
          passingMarks: true,
          subject: { select: { name: true } },
        },
      },
    },
    orderBy: { exam: { examDate: "desc" } },
    take: 10,
  })

  const passedCount = examResults.filter(
    (r) => Number(r.marksObtained) >= r.exam.passingMarks,
  ).length
  const avgMarks =
    examResults.length > 0
      ? Math.round(
          examResults.reduce((s, r) => s + Number(r.marksObtained), 0) / examResults.length,
        )
      : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/portal/teacher/students"
          className="text-muted-foreground hover:text-primary text-sm"
        >
          &larr; Back to Students
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardContent className="flex flex-col items-center py-6">
            <Avatar className="mb-4 h-24 w-24">
              <AvatarImage src={student.photoUrl || undefined} />
              <AvatarFallback className="text-2xl">
                {student.firstName[0]}
                {student.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-xl font-bold">
              {student.firstName} {student.lastName}
            </h3>
            {enrollment && (
              <p className="text-muted-foreground text-sm">
                {enrollment.class.name}
                {enrollment.section ? ` - ${enrollment.section.name}` : ""}
              </p>
            )}
            <p className="text-muted-foreground text-sm">
              {student.admissionNo || "No admission no"}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Badge variant="secondary">{student.gender || "N/A"}</Badge>
              <Badge variant="outline">{student.religion || "N/A"}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            {student.email && (
              <div className="flex items-center gap-2">
                <Mail className="text-muted-foreground h-4 w-4" />
                {student.email}
              </div>
            )}
            {student.phone && (
              <div className="flex items-center gap-2">
                <Phone className="text-muted-foreground h-4 w-4" />
                {student.phone}
              </div>
            )}
            {student.address && (
              <div className="flex items-center gap-2">
                <MapPin className="text-muted-foreground h-4 w-4" />
                {student.address}
              </div>
            )}
            {student.dateOfBirth && (
              <div className="flex items-center gap-2">
                <CalendarDays className="text-muted-foreground h-4 w-4" />
                {new Date(student.dateOfBirth).toLocaleDateString()}
              </div>
            )}
            {student.bloodGroup && (
              <div className="flex items-center gap-2">
                <Activity className="text-muted-foreground h-4 w-4" />
                Blood Group: {student.bloodGroup}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendancePercent}%</div>
            <p className="text-muted-foreground text-xs">
              {presentCount}/{totalCount} days present
            </p>
            <div className="bg-secondary mt-2 h-2 w-full rounded-full">
              <div
                className="bg-primary h-2 rounded-full"
                style={{ width: `${attendancePercent}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Exam Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgMarks}%</div>
            <p className="text-muted-foreground text-xs">
              {passedCount}/{examResults.length} exams passed
            </p>
            <div className="bg-secondary mt-2 h-2 w-full rounded-full">
              <div className="bg-primary h-2 rounded-full" style={{ width: `${avgMarks}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Parents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{student.parents.length}</div>
            <p className="text-muted-foreground text-xs">Registered parents</p>
          </CardContent>
        </Card>
      </div>

      {student.parents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Parents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {student.parents.map((sp) => (
                <div
                  key={sp.parentId}
                  className="flex items-center justify-between border-b pb-2 last:border-0"
                >
                  <div>
                    <p className="font-medium">
                      {sp.parent.firstName} {sp.parent.lastName}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {sp.parent.relationship || "Parent"}
                    </p>
                  </div>
                  <div className="text-muted-foreground text-sm">
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Exam Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left font-medium">Exam</th>
                    <th className="py-2 text-left font-medium">Subject</th>
                    <th className="py-2 text-right font-medium">Marks</th>
                    <th className="py-2 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {examResults.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/50 border-b">
                      <td className="py-2">{r.exam.name}</td>
                      <td className="text-muted-foreground py-2">{r.exam.subject.name}</td>
                      <td className="py-2 text-right">
                        {Number(r.marksObtained)}/{r.exam.totalMarks}
                      </td>
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
}

export default async function TeacherStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <TeacherStudentDetailContent studentId={id} />
}
