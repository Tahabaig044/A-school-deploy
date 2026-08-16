import { NextRequest } from "next/server"
import {
  getMyIdCard,
  getIdCardDataForUser,
  getStudentIdCardData,
  getBulkStudentIdCardData,
} from "@/services/id-card"
import { generateIdCardPdf, generateIdCardsPdfBulk } from "@/lib/id-card-pdf"

const WINDOW_MS = 60_000
const MAX_REQUESTS_PER_IP = 30
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

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  )
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

export async function GET(req: NextRequest) {
  const ip = clientIp(req)
  if (isRateLimited(ip)) {
    return jsonError("Too many requests", 429)
  }

  const search = req.nextUrl.searchParams
  const self = search.get("self") === "1" || search.get("self") === "true"
  const profileId = search.get("profileId")
  const studentId = search.get("studentId")
  const isBulk = search.get("bulk") === "1" || search.get("bulk") === "true"

  try {
    if (isBulk) {
      const schoolId = search.get("schoolId")
      const classId = search.get("classId")
      const sectionId = search.get("sectionId") || undefined
      const sessionId = search.get("sessionId") || undefined
      if (!schoolId || !classId) return jsonError("Missing schoolId or classId", 400)

      const cards = await getBulkStudentIdCardData(schoolId, classId, sectionId, sessionId)
      if (cards.length === 0) return jsonError("No students found", 404)
      const { buffer, filename } = await generateIdCardsPdfBulk(cards)
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      })
    }

    const data = self
      ? await getMyIdCard()
      : profileId
        ? await getIdCardDataForUser(profileId)
        : studentId
          ? await getStudentIdCardData(studentId)
          : null

    if (!data) return jsonError("ID card not found", 404)

    const { buffer, filename } = await generateIdCardPdf(data)
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") return jsonError("Unauthorized", 401)
    if (err instanceof Error && err.message === "Forbidden") return jsonError("Forbidden", 403)
    return jsonError("Failed to generate PDF", 500)
  }
}
