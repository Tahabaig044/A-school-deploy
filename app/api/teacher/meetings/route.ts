import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"

function validateCsrfOrigin(request: Request): boolean {
  const origin = request.headers.get("origin")
  const host = request.headers.get("host")
  if (!origin && !host) return true
  const allowed = process.env.NEXT_PUBLIC_APP_URL
  if (!allowed) return true
  if (origin) {
    return origin === allowed || origin.endsWith(`.${new URL(allowed).hostname}`)
  }
  if (host) {
    return host === new URL(allowed).host
  }
  return true
}

const MAX_TITLE = 100
const MAX_DESCRIPTION = 1000
const MAX_MEETING_TYPE = 50
const MAX_LOCATION = 200

function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string") return false
  const parsed = new Date(value)
  return !Number.isNaN(parsed.getTime())
}

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
  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 })
  }

  try {
    const { profile } = await requireRole("TEACHER")

    const teacher = await prisma.teacher.findFirst({
      where: { profileId: profile.id },
      select: { id: true, schoolId: true, branchId: true },
    })
    if (!teacher) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

    const body = await request.json()

    if (!body.title || typeof body.title !== "string" || body.title.trim().length === 0) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }
    if (body.title.length > MAX_TITLE) {
      return NextResponse.json({ error: `Title must be ${MAX_TITLE} characters or fewer` }, { status: 400 })
    }
    if (body.description && typeof body.description === "string" && body.description.length > MAX_DESCRIPTION) {
      return NextResponse.json({ error: `Description must be ${MAX_DESCRIPTION} characters or fewer` }, { status: 400 })
    }
    if (body.meetingType && typeof body.meetingType === "string" && body.meetingType.length > MAX_MEETING_TYPE) {
      return NextResponse.json({ error: `Meeting type must be ${MAX_MEETING_TYPE} characters or fewer` }, { status: 400 })
    }
    if (body.location && typeof body.location === "string" && body.location.length > MAX_LOCATION) {
      return NextResponse.json({ error: `Location must be ${MAX_LOCATION} characters or fewer` }, { status: 400 })
    }
    if (!body.startDateTime || !isValidIsoDate(body.startDateTime)) {
      return NextResponse.json({ error: "Valid start date/time is required" }, { status: 400 })
    }
    if (!body.endDateTime || !isValidIsoDate(body.endDateTime)) {
      return NextResponse.json({ error: "Valid end date/time is required" }, { status: 400 })
    }

    const meeting = await prisma.meeting.create({
      data: {
        schoolId: teacher.schoolId,
        branchId: teacher.branchId,
        createdById: profile.id,
        title: body.title.trim(),
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
