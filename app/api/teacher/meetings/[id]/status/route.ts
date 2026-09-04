import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profile } = await requireRole("TEACHER")
    const { id } = await params

    const body = await request.json()
    const { status } = body

    const meeting = await prisma.meeting.findFirst({
      where: { id, createdById: profile.id },
    })
    if (!meeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 })

    await prisma.meeting.update({
      where: { id },
      data: { status: status as any },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}
