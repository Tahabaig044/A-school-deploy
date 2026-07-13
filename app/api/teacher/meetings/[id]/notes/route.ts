import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { profile } = await requireRole("TEACHER")
    const { id } = await params

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
