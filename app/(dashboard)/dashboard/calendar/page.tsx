import { getCalendarEvents, getHolidays, getExamSchedule } from "@/actions/calendar.actions"
import { CalendarView } from "./calendar-view"

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; month?: string; year?: string }>
}) {
  const params = await searchParams
  const view = params.view || "month"
  const now = new Date()
  const month = params.month ? parseInt(params.month) : now.getMonth()
  const year = params.year ? parseInt(params.year) : now.getFullYear()

  const startDate = new Date(year, month, 1)
  const endDate = new Date(year, month + 1, 0)

  const [events, holidays, exams] = await Promise.all([
    getCalendarEvents(startDate.toISOString(), endDate.toISOString()),
    getHolidays(),
    getExamSchedule(),
  ])

  return (
    <CalendarView
      events={JSON.parse(JSON.stringify(events))}
      holidays={JSON.parse(JSON.stringify(holidays))}
      exams={JSON.parse(JSON.stringify(exams))}
      currentMonth={month}
      currentYear={year}
      view={view}
    />
  )
}
