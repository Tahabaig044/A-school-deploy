import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const { profile } = await requireRole("TEACHER")

    const teacher = await prisma.teacher.findFirst({
      where: { profileId: profile.id },
      select: { id: true, schoolId: true, branchId: true },
    })
    if (!teacher) return NextResponse.json([])

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    const where: any = {
      createdById: profile.id,
    }
    if (status) where.status = status

    const meetings = await prisma.meeting.findMany({
      where,
      include: {
        createdBy: { select: { firstName: true, lastName: true, role: true } },
        attendees: {
          include: {
            profile: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
        },
        notes: {
          include: { author: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: "desc" },
          take: 3,
        },
        _count: { select: { notes: true } },
      },
      orderBy: { startDateTime: "desc" },
    })

    return NextResponse.json(meetings)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  try {
    const { profile } = await requireRole("TEACHER")

    const teacher = await prisma.teacher.findFirst({
      where: { profileId: profile.id },
      select: { id: true, schoolId: true, branchId: true },
    })
    if (!teacher) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

    const body = await request.json()

    const meeting = await prisma.meeting.create({
      data: {
        schoolId: teacher.schoolId,
        branchId: teacher.branchId,
        createdById: profile.id,
        title: body.title,
        description: body.description || "",
        meetingType: body.meetingType || "PARENT_TEACHER",
        startDateTime: new Date(body.startDateTime),
        endDateTime: new Date(body.endDateTime),
        location: body.location || null,
      },
    })

    return NextResponse.json(meeting)
  } catch {
    return NextResponse.json({ error: "Failed to create meeting" }, { status: 500 })
  }
}
