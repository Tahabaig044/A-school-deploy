import { cn } from "@/lib/utils"

import type { LimitNotice } from "@/lib/demo/limits"

/**
 * The demo "running low" banner.
 *
 * Presentational only: it takes notices that are already computed and renders them.
 * It queries nothing, so it is safe to drop into a page without dragging the database
 * client into a component tree. Mounting happens in Phase 9.
 *
 * Renders nothing when there is nothing to say, so callers do not need to guard it.
 */

const PERIOD_LABEL: Record<string, string> = {
  TOTAL: "total",
  PER_DAY: "today",
}

/** `STUDENT_MAX`-style keys are not shown; the metric is what a person recognises. */
const METRIC_LABEL: Record<string, string> = {
  STUDENT: "students",
  TEACHER: "teachers",
  STAFF: "staff",
  PARENT: "parents",
  BRANCH: "branches",
  CLASS: "classes",
  SUBJECT: "subjects",
  SCHOOL: "schools",
  FEE_INVOICE_PER_DAY: "fee invoices",
  ATTENDANCE_SCAN_PER_DAY: "attendance scans",
}

function metricLabel(metric: string): string {
  return METRIC_LABEL[metric] ?? metric.toLowerCase().replace(/_/g, " ")
}

export interface LimitNoticeProps {
  notices: readonly LimitNotice[]
  className?: string
}

export function LimitNotice({ notices, className }: LimitNoticeProps) {
  if (notices.length === 0) return null

  // Over the cap first, then closest to it. buildLimitNotices already sorts by
  // remaining, but the over-limit entries must lead regardless.
  const ordered = [...notices].sort((a, b) => a.remaining - b.remaining)
  const blocking = ordered.filter((notice) => notice.remaining <= 0)

  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        blocking.length > 0
          ? "border-amber-500/40 bg-amber-50 text-amber-900"
          : "border-border bg-muted/40 text-foreground",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <p className="font-medium">
        {blocking.length > 0
          ? "This demo has reached its limit"
          : "This demo is approaching its limit"}
      </p>
      <ul className="mt-1 space-y-0.5">
        {ordered.map((notice) => {
          const label = metricLabel(notice.metric)
          const period = PERIOD_LABEL[notice.period] ?? notice.period.toLowerCase()

          return (
            <li key={notice.metric}>
              {notice.remaining > 0 ? (
                <>
                  {notice.remaining} {label} left ({period})
                </>
              ) : (
                <>
                  {label} cap reached ({notice.current} of {notice.limit})
                </>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
