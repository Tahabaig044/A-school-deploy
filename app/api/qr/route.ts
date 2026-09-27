import { NextRequest } from "next/server"
import QRCode from "qrcode"
import { requireRole } from "@/lib/auth"

const WINDOW_MS = 60_000
const MAX_REQUESTS_PER_IP = 120
const ipCounts = new Map<string, { count: number; windowStart: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = ipCounts.get(ip)
  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    ipCounts.set(ip, { count: 1, windowStart: now })
    return false
  }
  entry.count += 1
  return entry.count > MAX_REQUESTS_PER_IP
}

export async function GET(req: NextRequest) {
  const data = req.nextUrl.searchParams.get("data")
  const size = Math.min(1000, Math.max(100, parseInt(req.nextUrl.searchParams.get("size") || "140") || 140))

  if (!data) {
    return new Response("Missing data parameter", { status: 400 })
  }

  if (data.length > 2048) {
    return new Response("Data too long (max 2048 characters)", { status: 400 })
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"

  if (isRateLimited(ip)) {
    return new Response("Too many requests", { status: 429 })
  }

  try {
    await requireRole(
      "SUPER_ADMIN",
      "SCHOOL_ADMIN",
      "BRANCH_ADMIN",
      "ADMISSION_OFFICER",
      "PRINCIPAL",
      "TEACHER",
    )
  } catch (err) {
    const unauthorized = err instanceof Error && err.message === "Unauthorized"
    return new Response(unauthorized ? "Unauthorized" : "Forbidden", {
      status: unauthorized ? 401 : 403,
    })
  }

  try {
    const qrBuffer = await QRCode.toBuffer(data, {
      width: size,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    })

    return new Response(new Uint8Array(qrBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    })
  } catch {
    return new Response("Failed to generate QR code", { status: 500 })
  }
}
