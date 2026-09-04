import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  CalendarDays,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Award,
  Clock,
} from "lucide-react"
import Link from "next/link"

export default async function TeacherProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL")
  const { id } = await params

  const teacher = await prisma.teacher.findFirst({
    where: {
      id,
      ...(profile.role !== "SUPER_ADMIN" ? { schoolId: profile.schoolId! } : {}),
    },
    include: {
      school: { select: { name: true } },
      branch: { select: { name: true } },
      profile: { select: { email: true, phone: true, status: true, isActive: true } },
      assignments: {
        include: {
          class: { select: { name: true } },
          section: { select: { name: true } },
          subject: { select: { name: true, code: true } },
          academicSession: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      timetableSlots: {
        include: {
          class: { select: { name: true } },
          section: { select: { name: true } },
          subject: { select: { name: true } },
        },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        take: 20,
      },
      _count: {
        select: {
          assignments: true,
          timetableSlots: true,
        },
      },
    },
  })

  if (!teacher) notFound()

  const timetableByDay = teacher.timetableSlots.reduce<
    Record<string, typeof teacher.timetableSlots>
  >((acc, slot) => {
    const day = slot.dayOfWeek
    if (!acc[day]) acc[day] = []
    acc[day].push(slot)
    return acc
  }, {})

  const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Teacher Profile</h2>
          <p className="text-muted-foreground">
            {teacher.school.name} — {teacher.branch.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/teachers">Back to Teachers</Link>
          </Button>
          <Button asChild>
            <Link href={`/dashboard/teachers/${id}/edit`}>Edit Teacher</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>
              {teacher.firstName} {teacher.lastName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center text-center">
              <div className="bg-primary/10 mb-3 flex h-24 w-24 items-center justify-center rounded-full">
                <span className="text-primary text-3xl font-bold">
                  {teacher.firstName[0]}
                  {teacher.lastName[0]}
                </span>
              </div>
              <Badge variant={teacher.status === "ACTIVE" ? "default" : "secondary"}>
                {teacher.status}
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Briefcase className="text-muted-foreground h-4 w-4" />
                <span>
                  Employee Code: <strong>{teacher.employeeCode}</strong>
                </span>
              </div>
              {teacher.designation && (
                <div className="flex items-center gap-2 text-sm">
                  <Award className="text-muted-foreground h-4 w-4" />
                  <span>
                    Designation: <strong>{teacher.designation}</strong>
                  </span>
                </div>
              )}
              {teacher.department && (
                <div className="flex items-center gap-2 text-sm">
                  <GraduationCap className="text-muted-foreground h-4 w-4" />
                  <span>
                    Department: <strong>{teacher.department}</strong>
                  </span>
                </div>
              )}
              {teacher.qualification && (
                <div className="flex items-center gap-2 text-sm">
                  <Award className="text-muted-foreground h-4 w-4" />
                  <span>
                    Qualification: <strong>{teacher.qualification}</strong>
                  </span>
                </div>
              )}
              {teacher.experience != null && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="text-muted-foreground h-4 w-4" />
                  <span>
                    Experience: <strong>{teacher.experience} years</strong>
                  </span>
                </div>
              )}
              {teacher.joiningDate && (
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="text-muted-foreground h-4 w-4" />
                  <span>
                    Joined: <strong>{new Date(teacher.joiningDate).toLocaleDateString()}</strong>
                  </span>
                </div>
              )}
              {teacher.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="text-muted-foreground h-4 w-4" />
                  <span>{teacher.email}</span>
                </div>
              )}
              {teacher.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="text-muted-foreground h-4 w-4" />
                  <span>{teacher.phone}</span>
                </div>
              )}
              {teacher.address && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="text-muted-foreground h-4 w-4" />
                  <span>{teacher.address}</span>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{teacher._count.assignments}</div>
                  <div className="text-muted-foreground text-xs">Assignments</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{teacher._count.timetableSlots}</div>
                  <div className="text-muted-foreground text-xs">Weekly Periods</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Subject Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              {teacher.assignments.length === 0 ? (
                <p className="text-muted-foreground text-sm">No assignments yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Session</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teacher.assignments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.class.name}</TableCell>
                        <TableCell>{a.section?.name || "All"}</TableCell>
                        <TableCell>
                          {a.subject.name} ({a.subject.code})
                        </TableCell>
                        <TableCell>{a.academicSession.name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timetable ({teacher._count.timetableSlots} periods)</CardTitle>
            </CardHeader>
            <CardContent>
              {teacher.timetableSlots.length === 0 ? (
                <p className="text-muted-foreground text-sm">No timetable slots.</p>
              ) : (
                <div className="space-y-4">
                  {days.map((day) => {
                    const slots = timetableByDay[day] || []
                    if (slots.length === 0) return null
                    return (
                      <div key={day}>
                        <h4 className="mb-2 text-sm font-semibold capitalize">
                          {day.toLowerCase()}
                        </h4>
                        <div className="grid gap-2">
                          {slots.map((slot) => (
                            <div
                              key={slot.id}
                              className="bg-muted flex items-center justify-between rounded-md p-2 text-sm"
                            >
                              <div>
                                <span className="font-medium">
                                  {slot.startTime} - {slot.endTime}
                                </span>
                                <span className="text-muted-foreground ml-2">
                                  {slot.isFree ? "Free Period" : slot.subject?.name}
                                </span>
                              </div>
                              <div className="text-muted-foreground">
                                {slot.class.name}
                                {slot.section ? ` - ${slot.section.name}` : ""}
                                {slot.room ? ` | ${slot.room}` : ""}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
