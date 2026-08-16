import jsPDF from "jspdf"
import QRCode from "qrcode"
import type { IdCardData } from "@/services/id-card"

export interface IdCardPdfOptions {
  /** "single" renders one full-page card; "bulk" renders a 2x2 grid per page. */
  layout?: "single" | "bulk"
  watermark?: boolean
}

const PRIMARY = [37, 99, 235] as const // blue-600
const PRIMARY_LIGHT = [219, 234, 254] as const // blue-100
const DARK = [17, 24, 39] as const // gray-900
const MUTED = [107, 114, 128] as const // gray-500
const BORDER = [209, 213, 219] as const // gray-300

function rgb(color: readonly number[]): string {
  return `rgb(${color[0]},${color[1]},${color[2]})`
}

async function fetchImageData(url: string): Promise<{ dataUrl: string; format: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
    if (!res.ok) return null
    const blob = await res.arrayBuffer()
    const type = res.headers.get("content-type") || ""
    const format = type.includes("png") ? "PNG" : type.includes("jpeg") || type.includes("jpg") ? "JPEG" : "PNG"
    const base64 = Buffer.from(blob).toString("base64")
    return { dataUrl: `data:${type || "image/png"};base64,${base64}`, format }
  } catch {
    return null
  }
}

async function addImageSafe(
  pdf: jsPDF,
  url: string | null | undefined,
  x: number,
  y: number,
  w: number,
  h: number
): Promise<boolean> {
  if (!url) return false
  const img = await fetchImageData(url)
  if (!img) return false
  try {
    pdf.addImage(img.dataUrl, img.format as any, x, y, w, h)
    return true
  } catch {
    return false
  }
}

function roleLabel(role: IdCardData["role"]): string {
  switch (role) {
    case "SCHOOL_ADMIN":
      return "School Admin"
    case "SUPER_ADMIN":
      return "Super Admin"
    case "BRANCH_ADMIN":
      return "Branch Admin"
    default:
      return role.charAt(0) + role.slice(1).toLowerCase()
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "N/A"
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function cardStatusStyle(status: IdCardData["cardStatus"]) {
  switch (status) {
    case "ACTIVE":
      return { bg: [220, 252, 231] as const, fg: [22, 101, 52] as const, label: "ACTIVE" }
    case "INACTIVE":
      return { bg: [254, 243, 199] as const, fg: [146, 64, 14] as const, label: "INACTIVE" }
    case "EXPIRED":
      return { bg: [255, 228, 230] as const, fg: [159, 18, 57] as const, label: "EXPIRED" }
    case "REVOKED":
      return { bg: [254, 226, 226] as const, fg: [153, 27, 27] as const, label: "REVOKED" }
  }
}

/**
 * Shared server-side ID card PDF service. Both the web portal and the mobile
 * API call this so card design and output stay consistent across clients.
 */
export async function generateIdCardPdf(
  data: IdCardData,
  options: IdCardPdfOptions = {}
): Promise<{ buffer: Buffer; filename: string }> {
  const { layout = "single" } = options

  if (layout === "bulk") {
    return generateIdCardsPdfBulk([data], options)
  }

  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
  await drawSingleCard(pdf, data, options)

  const filename = `ID_Card_${data.cardNumber.replace(/[^a-zA-Z0-9-]/g, "")}_${new Date().toISOString().split("T")[0]}.pdf`
  return { buffer: Buffer.from(pdf.output("arraybuffer")), filename }
}

export async function generateIdCardsPdfBulk(
  cards: IdCardData[],
  options: IdCardPdfOptions = {}
): Promise<{ buffer: Buffer; filename: string }> {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })

  const colWidth = 130
  const rowHeight = 92
  const colGap = 6
  const rowGap = 8
  const margin = 10
  const perPage = 4

  cards.forEach((card, i) => {
    if (i > 0 && i % perPage === 0) pdf.addPage()
    const slot = i % perPage
    const x = margin + (slot % 2) * (colWidth + colGap)
    const y = margin + Math.floor(slot / 2) * (rowHeight + rowGap)
    drawMiniCard(pdf, card, x, y, colWidth, rowHeight)
  })

  const filename = `ID_Cards_${cards.length}_${new Date().toISOString().split("T")[0]}.pdf`
  return { buffer: Buffer.from(pdf.output("arraybuffer")), filename }
}

// ─── Single (full-page) card ─────────────────────────────────────────────

async function drawSingleCard(pdf: jsPDF, data: IdCardData, options: IdCardPdfOptions): Promise<void> {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const m = 10

  // Header band
  pdf.setFillColor(248, 250, 252)
  pdf.rect(0, 0, pageWidth, 46, "F")

  const logoDrawn = await addImageSafe(pdf, data.school.logoUrl, m + 2, 9, 15, 15)
  if (!logoDrawn) {
    pdf.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2])
    pdf.roundedRect(m + 2, 9, 15, 15, 2, 2, "F")
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(8)
    pdf.setFont("helvetica", "bold")
    pdf.text(data.school.name.substring(0, 3).toUpperCase(), m + 2 + 7.5, 9 + 9.5, { align: "center" })
  }

  pdf.setTextColor(DARK[0], DARK[1], DARK[2])
  pdf.setFontSize(18)
  pdf.setFont("helvetica", "bold")
  pdf.text(data.school.name, pageWidth / 2, 20, { align: "center" })

  pdf.setFontSize(9.5)
  pdf.setFont("helvetica", "normal")
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2])
  if (data.school.address) pdf.text(data.school.address, pageWidth / 2, 29, { align: "center" })
  if (data.school.phone) pdf.text(`Phone: ${data.school.phone}`, pageWidth / 2, 36, { align: "center" })

  pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2])
  pdf.line(m, 44, pageWidth - m, 44)

  const bodyY = 52

  // Photo
  const photoX = m + 4
  const photoY = bodyY + 4
  const photoW = 52
  const photoH = 66
  pdf.setFillColor(255, 255, 255)
  pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2])
  pdf.roundedRect(photoX, photoY, photoW, photoH, 3, 3, "FD")
  const photoDrawn = await addImageSafe(pdf, data.photo, photoX + 1, photoY + 1, photoW - 2, photoH - 2)
  if (!photoDrawn) {
    pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2])
    pdf.setFontSize(10)
    pdf.setFont("helvetica", "normal")
    pdf.text("PHOTO", photoX + photoW / 2, photoY + photoH / 2, { align: "center" })
  }
  pdf.setFontSize(8)
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2])
  pdf.text(roleLabel(data.role), photoX + photoW / 2, photoY + photoH + 5, { align: "center" })

  // Right column
  const textX = photoX + photoW + 14
  const textW = 150

  pdf.setTextColor(DARK[0], DARK[1], DARK[2])
  pdf.setFontSize(20)
  pdf.setFont("helvetica", "bold")
  const nameLines = pdf.splitTextToSize(data.name, textW)
  pdf.text(nameLines, textX, bodyY + 8)

  // Role + status badges
  const roleLabelText = roleLabel(data.role)
  pdf.setFontSize(9)
  pdf.setFont("helvetica", "bold")
  pdf.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2])
  pdf.roundedRect(textX, bodyY + 16, pdf.getTextWidth(roleLabelText) + 8, 7, 3.5, 3.5, "F")
  pdf.setTextColor(255, 255, 255)
  pdf.text(roleLabelText, textX + 4, bodyY + 21.5)

  const status = cardStatusStyle(data.cardStatus)
  const statusLabel = status.label
  const statusX = textX + pdf.getTextWidth(roleLabelText) + 16
  pdf.setFillColor(status.bg[0], status.bg[1], status.bg[2])
  pdf.roundedRect(statusX, bodyY + 16, pdf.getTextWidth(statusLabel) + 8, 7, 3.5, 3.5, "F")
  pdf.setTextColor(status.fg[0], status.fg[1], status.fg[2])
  pdf.text(statusLabel, statusX + 4, bodyY + 21.5)

  // Card number
  pdf.setFontSize(12)
  pdf.setTextColor(DARK[0], DARK[1], DARK[2])
  pdf.setFont("helvetica", "bold")
  pdf.text(`Card No: ${data.cardNumber}`, textX, bodyY + 30)

  // Validity
  pdf.setFontSize(8.5)
  pdf.setFont("helvetica", "normal")
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2])
  pdf.text(
    `Issued: ${formatDate(data.issuedAt)}    Valid: ${formatDate(data.expiresAt)}`,
    textX,
    bodyY + 36
  )

  // Divider
  pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2])
  pdf.line(textX, bodyY + 42, pageWidth - m, bodyY + 42)

  // Details
  let dy = bodyY + 52
  pdf.setFontSize(9.5)
  const row: Array<[string, string]> = [
    [data.identity.label, data.identity.value],
    ...data.details.filter((d): d is { label: string; value: string } => !!d.value).map((d) => [d.label, d.value] as [string, string]),
  ]
  if (data.branch) row.push(["Branch", data.branch.name])
  for (const [label, value] of row) {
    pdf.setFont("helvetica", "normal")
    pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2])
    pdf.text(label, textX, dy)
    pdf.setFont("helvetica", "bold")
    pdf.setTextColor(DARK[0], DARK[1], DARK[2])
    const valueLines = pdf.splitTextToSize(value, textW - 60)
    pdf.text(valueLines, textX + 60, dy)
    dy += (valueLines.length > 1 ? 5 : 8)
  }

  // Children (parent cards)
  if (data.children.length > 0) {
    dy += 2
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(9)
    pdf.setTextColor(DARK[0], DARK[1], DARK[2])
    pdf.text("Children", textX, dy)
    dy += 5
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(8.5)
    pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2])
    for (const child of data.children) {
      pdf.text(`• ${child.name}  ${child.className}`, textX + 2, dy)
      dy += 5
    }
  }

  // Attendance eligibility
  pdf.setFont("helvetica", "italic")
  pdf.setFontSize(8.5)
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2])
  pdf.text(
    data.attendanceEligible ? "This card is eligible for attendance" : "This card is not eligible for attendance",
    textX,
    pageHeight - 18
  )

  // QR code
  if (data.qrToken) {
    const qrDataUrl = await QRCode.toDataURL(data.qrToken, {
      width: 220,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    })
    const qrSize = 40
    const qrX = pageWidth - m - qrSize
    const qrY = photoY + photoH - qrSize
    pdf.setFillColor(255, 255, 255)
    pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2])
    pdf.roundedRect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4, 2, 2, "FD")
    pdf.addImage(qrDataUrl as any, "PNG", qrX, qrY, qrSize, qrSize)
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(7)
    pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2])
    pdf.text("Scan to verify", qrX + qrSize / 2, qrY + qrSize + 7, { align: "center" })
  }

  if (options.watermark) {
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(48)
    pdf.setTextColor(241, 245, 249)
    pdf.text("OFFICIAL ID CARD", pageWidth / 2, pageHeight - 20, { align: "center", angle: 25 })
  }
}

// ─── Mini (bulk) card ────────────────────────────────────────────────────

async function drawMiniCard(pdf: jsPDF, data: IdCardData, x: number, y: number, w: number, h: number): Promise<void> {
  const pad = 5

  pdf.setFillColor(255, 255, 255)
  pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2])
  pdf.roundedRect(x, y, w, h, 3, 3, "FD")

  // Top brand bar
  pdf.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2])
  pdf.roundedRect(x, y, w, 7, 3, 3, "F")
  pdf.rect(x, y + 3.5, w, 3.5, "F")
  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(6.5)
  pdf.setTextColor(255, 255, 255)
  const brand = data.school.name
  const brandLines = pdf.splitTextToSize(brand, w - pad * 2 - 14)
  pdf.text(brandLines[0], x + pad, y + 5)

  // Photo
  const photoW = 24
  const photoH = 32
  const photoX = x + pad
  const photoY = y + 12
  pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2])
  pdf.setFillColor(248, 250, 252)
  pdf.roundedRect(photoX, photoY, photoW, photoH, 2, 2, "FD")
  await addImageSafe(pdf, data.photo, photoX + 0.5, photoY + 0.5, photoW - 1, photoH - 1)

  // Text
  const textX = photoX + photoW + 6
  const textW = x + w - pad - textX
  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(8.5)
  pdf.setTextColor(DARK[0], DARK[1], DARK[2])
  const nameLines = pdf.splitTextToSize(data.name, textW)
  pdf.text(nameLines, textX, y + 15)

  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(6.5)
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2])
  pdf.text(roleLabel(data.role), textX, y + 20)

  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(6.5)
  pdf.setTextColor(DARK[0], DARK[1], DARK[2])
  pdf.text(data.cardNumber, textX, y + 25)

  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(6.5)
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2])
  const topDetail = data.details.find((d) => d.value && d.label !== "Section")?.value
  if (topDetail) {
    pdf.text(pdf.splitTextToSize(topDetail, textW)[0], textX, y + 30)
  }

  // QR
  if (data.qrToken) {
    const qrDataUrl = await QRCode.toDataURL(data.qrToken, {
      width: 120,
      margin: 1,
    })
    const qrSize = 22
    const qrX = x + w - pad - qrSize
    const qrY = y + h - pad - qrSize
    pdf.setFillColor(255, 255, 255)
    pdf.rect(qrX, qrY, qrSize, qrSize, "F")
    pdf.addImage(qrDataUrl as any, "PNG", qrX, qrY, qrSize, qrSize)
  } else {
    pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2])
    pdf.setFillColor(248, 250, 252)
    pdf.roundedRect(x + w - pad - 22, y + h - pad - 22, 22, 22, 2, 2, "FD")
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(5.5)
    pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2])
    pdf.text("No QR", x + w - pad - 11, y + h - pad - 11, { align: "center" })
  }

  // Footer line
  pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2])
  pdf.line(x + pad, y + h - 8, x + w - pad, y + h - 8)
  pdf.setFontSize(5.5)
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2])
  pdf.text(`Valid: ${formatDate(data.expiresAt)}`, x + pad, y + h - 3.5)
}
