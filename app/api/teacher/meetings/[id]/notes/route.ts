import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profile } = await requireRole("TEACHER")
    const { id } = await params

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

    const note = await prisma.meetingNote.create({
      data: {
        meetingId: id,
        authorId: profile.id,
        content: body.content,
      },
    })

    return NextResponse.json(note)
  } catch {
    return NextResponse.json({ error: "Failed to add note" }, { status: 500 })
  }
}
