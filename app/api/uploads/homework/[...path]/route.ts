import { NextRequest, NextResponse } from "next/server"
import { createServiceClient, createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { env } from "@/lib/env"

const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "txt",
])

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { schoolId: true, role: true },
    })
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { path } = await params
    if (!path || path.length < 2) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 })
    }

    const [schoolId, ...fileParts] = path
    const fileName = fileParts.join("/")

    if (profile.role !== "SUPER_ADMIN" && profile.schoolId !== schoolId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const ext = fileName.split(".").pop()?.toLowerCase() || ""
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 })
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.\w+$/i.test(fileName)) {
      return NextResponse.json({ error: "Invalid file name" }, { status: 400 })
    }

    const objectPath = `${schoolId}/${fileName}`
    const { data, error } = await (
      await createServiceClient()
    ).storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .createSignedUrl(objectPath, 3600)

    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    return NextResponse.redirect(data.signedUrl)
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 })
  }
}
