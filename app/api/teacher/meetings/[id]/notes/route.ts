import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { isValidUuid } from "@/lib/validate-uuid"

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

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 })
  }

  try {
    const { profile } = await requireRole("TEACHER")
    const { id } = await params

    if (!isValidUuid(id)) {
      return NextResponse.json({ error: "Invalid meeting ID format" }, { status: 400 })
    }

    const meeting = await prisma.meeting.findFirst({
      where: { id, schoolId: profile.schoolId! },
      select: { id: true },
    })
    if (!meeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 })

    if (profile.role === "TEACHER") {
      const participant = await prisma.meeting.findFirst({
        where: {
          id,
          OR: [
            { createdById: profile.id },
            { attendees: { some: { profileId: profile.id } } },
          ],
        },
        select: { id: true },
      })
      if (!participant) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()

    if (!body.content || typeof body.content !== "string" || body.content.trim().length === 0) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }
    if (body.content.length > 5000) {
      return NextResponse.json({ error: "Content must be 5000 characters or fewer" }, { status: 400 })
    }

    const note = await prisma.meetingNote.create({
      data: {
        meetingId: id,
        authorId: profile.id,
        content: body.content.trim(),
      },
    })

    return NextResponse.json(note)
  } catch {
    return NextResponse.json({ error: "Failed to add note" }, { status: 500 })
  }
}
