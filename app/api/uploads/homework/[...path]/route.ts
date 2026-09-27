import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

const ALLOWED_EXTENSIONS = new Set(["pdf", "doc", "docx", "jpg", "jpeg", "png", "gif", "webp", "txt"])

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

    const filePath = join(process.cwd(), "uploads", "homework", schoolId, fileName)
    const data = await readFile(filePath)

    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      txt: "text/plain",
    }

    return new NextResponse(data, {
      headers: {
        "Content-Type": mimeTypes[ext] || "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 })
  }
}
