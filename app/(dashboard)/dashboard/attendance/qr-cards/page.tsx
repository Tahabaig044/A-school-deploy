import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { QrCardGenerator } from "./qr-card-generator"

export default async function QrCardsPage() {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL", "TEACHER")

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
        <h2 className="text-3xl font-bold tracking-tight">QR Attendance Cards</h2>
        <p className="text-muted-foreground">Generate printable QR cards for students. Scan to mark attendance.</p>
      </div>
      <QrCardGenerator
        classes={JSON.parse(JSON.stringify(classes))}
        sessions={JSON.parse(JSON.stringify(sessions))}
        schoolId={schoolId}
      />
    </div>
  )
}