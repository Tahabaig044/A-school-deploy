"use client"

import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]
const DAY_LABELS: Record<string, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
}

type Slot = {
  id: string
  dayOfWeek: string
  startTime: string
  endTime: string
  room: string | null
  class: { name: string }
  section: { name: string } | null
  subject: { name: string } | null
  teacher: { firstName: string; lastName: string } | null
  isFree?: boolean
  freePeriodReason?: string | null
}

export function TimetablePrintButton({ slots, title }: { slots: Slot[]; title?: string }) {
  function handlePrint() {
    const grouped = DAYS.map((day) => ({
      day,
      slots: slots
        .filter((s) => s.dayOfWeek === day)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    }))

    const rows = grouped
      .filter((g) => g.slots.length > 0)
      .map(
        (g) => `
        <tr>
          <td style="font-weight:bold;padding:8px;border:1px solid #ccc;background:#f5f5f5;vertical-align:top;width:100px">
            ${DAY_LABELS[g.day]}
          </td>
          <td style="padding:0;border:1px solid #ccc">
            ${g.slots
              .map(
                (s) => `
              <div style="padding:6px 8px;border-bottom:1px solid #eee;display:flex;gap:12px;align-items:center">
                <span style="font-weight:500;min-width:100px">${s.startTime} - ${s.endTime}</span>
                <span style="min-width:120px">${s.isFree ? "FREE" : s.subject?.name || "-"}${s.freePeriodReason ? ` (${s.freePeriodReason})` : ""}</span>
                <span style="min-width:120px">${s.isFree ? "-" : `${s.teacher?.firstName || ""} ${s.teacher?.lastName || ""}`}</span>
                <span style="min-width:80px">${s.room || "-"}</span>
              </div>`,
              )
              .join("")}
          </td>
        </tr>`,
      )
      .join("")

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title || "Timetable"}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          .subtitle { color: #666; font-size: 13px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; }
          @media print {
            body { margin: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="text-align:right;margin-bottom:12px">
          <button onclick="window.print()" style="padding:8px 16px;background:#000;color:#fff;border:none;border-radius:4px;cursor:pointer">
            Print
          </button>
        </div>
        <h1>${title || "Timetable"}</h1>
        <p class="subtitle">Generated ${new Date().toLocaleDateString()}</p>
        <table>
          <tbody>${rows}</tbody>
        </table>
      </body>
      </html>`

    const w = window.open("", "_blank")
    if (w) {
      w.document.write(html)
      w.document.close()
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handlePrint} type="button">
      <Printer className="mr-1 h-4 w-4" />
      Print
    </Button>
  )
}
