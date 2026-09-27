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

const MEETING_STATUSES = ["PENDING", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED", "RESCHEDULED"] as const

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 })
  }

  try {
    const { profile } = await requireRole("TEACHER")
    const { id } = await params

    if (!isValidUuid(id)) {
      return NextResponse.json({ error: "Invalid meeting ID format" }, { status: 400 })
    }

    const body = await request.json()
    const { status } = body

    if (!status || !MEETING_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed: ${MEETING_STATUSES.join(", ")}` },
        { status: 400 },
      )
    }

    const meeting = await prisma.meeting.findFirst({
      where: { id, createdById: profile.id },
    })
    if (!meeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 })

    await prisma.meeting.update({
      where: { id },
      data: { status },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}
