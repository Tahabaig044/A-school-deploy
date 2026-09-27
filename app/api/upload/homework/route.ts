import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { randomUUID } from "crypto"
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

const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "application/msword": ["doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/gif": ["gif"],
  "image/webp": ["webp"],
  "text/plain": ["txt"],
}

const ALLOWED_MIME_TYPES = Object.keys(ALLOWED_EXTENSIONS)
const MAX_SIZE = 10 * 1024 * 1024

export async function POST(request: Request) {
  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 })
  }

  let ctx: Awaited<ReturnType<typeof requireRole>>
  try {
    ctx = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "STUDENT")
  } catch (err) {
    const unauthorized = err instanceof Error && err.message === "Unauthorized"
    return NextResponse.json(
      { error: unauthorized ? "Unauthorized" : "Forbidden" },
      { status: unauthorized ? 401 : 403 },
    )
  }
  if (!ctx.profile.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed. Accepted: PDF, DOCX, DOC, Images, TXT" },
        { status: 400 },
      )
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large. Max 10MB" }, { status: 400 })
    }

    const originalExt = file.name.split(".").pop()?.toLowerCase() || ""
    const allowedExts = ALLOWED_EXTENSIONS[file.type]
    if (!originalExt || !allowedExts.includes(originalExt)) {
      return NextResponse.json(
        { error: "File extension does not match declared file type" },
        { status: 400 },
      )
    }

    const safeName = `${randomUUID()}.${originalExt}`
    const uploadDir = join(process.cwd(), "uploads", "homework", ctx.profile.schoolId)
    const filePath = join(uploadDir, safeName)

    await mkdir(uploadDir, { recursive: true })
    const bytes = await file.arrayBuffer()
    await writeFile(filePath, Buffer.from(bytes))

    return NextResponse.json({
      url: `/api/uploads/homework/${ctx.profile.schoolId}/${safeName}`,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    })
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
