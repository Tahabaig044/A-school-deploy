import { getMeetings } from "@/actions/meeting.actions"
import { MeetingList } from "./meeting-list"

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const params = await searchParams
  const meetingType = params.type || undefined

  const meetings = await getMeetings(meetingType)

  return (
    <MeetingList
      meetings={JSON.parse(JSON.stringify(meetings))}
      activeType={meetingType || "all"}
    />
  )
}
