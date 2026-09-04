import { getEvents } from "@/actions/event.actions"
import { EventList } from "./event-list"

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const params = await searchParams
  const eventType = params.type || undefined

  const events = await getEvents(eventType)

  return <EventList events={JSON.parse(JSON.stringify(events))} activeType={eventType || "all"} />
}
