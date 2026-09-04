import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { QrScanner } from "./qr-scanner"

export default async function ScanAttendancePage() {
  const { profile } = await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "PRINCIPAL",
    "TEACHER",
  )

  const schoolId = profile.schoolId!
  const [classes, sessions] = await Promise.all([
    prisma.class.findMany({
      where: profile.role === "SUPER_ADMIN" ? {} : { schoolId },
      include: { sections: { select: { id: true, name: true } } },
      orderBy: { order: "asc" },
    }),
    prisma.academicSession.findMany({
      where: { schoolId, isCurrent: true },
      select: { id: true, name: true },
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Scan QR Attendance</h2>
        <p className="text-muted-foreground">Point camera at student QR card to mark attendance</p>
      </div>
      <QrScanner
        classes={JSON.parse(JSON.stringify(classes))}
        sessions={JSON.parse(JSON.stringify(sessions))}
        schoolId={schoolId}
      />
    </div>
  )
}
