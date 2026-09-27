import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

function validateCsrfOrigin(request: NextRequest): boolean {
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

export async function POST(request: NextRequest) {
  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 })
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { subscription } = body

    if (!subscription) {
      return NextResponse.json({ error: "Subscription required" }, { status: 400 })
    }
    if (typeof subscription !== "object") {
      return NextResponse.json({ error: "Invalid subscription format" }, { status: 400 })
    }
    const subscriptionStr = JSON.stringify(subscription)
    if (subscriptionStr.length > 10000) {
      return NextResponse.json({ error: "Subscription data too large" }, { status: 400 })
    }

    await prisma.notification.upsert({
      where: {
        id: `push-${user.id}`,
      },
      create: {
        id: `push-${user.id}`,
        userId: user.id,
        title: "Push Notifications",
        content: JSON.stringify(subscription),
        type: "PUSH_SUBSCRIPTION",
        category: "SYSTEM",
      },
      update: {
        content: JSON.stringify(subscription),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Push subscription error:", error)
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 })
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.notification.deleteMany({
      where: {
        userId: user.id,
        type: "PUSH_SUBSCRIPTION",
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to remove subscription" }, { status: 500 })
  }
}
