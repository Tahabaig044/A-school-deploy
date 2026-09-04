import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
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
