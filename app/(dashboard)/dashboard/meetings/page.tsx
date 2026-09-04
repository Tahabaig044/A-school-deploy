import { getMeetings } from "@/actions/meeting.actions"
import { MeetingList } from "./meeting-list"
import { requireRole } from "@/lib/auth"

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const params = await searchParams
  const meetingType = params.type || undefined
  const { profile } = await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "PRINCIPAL",
    "TEACHER",
    "PARENT",
  )

  const meetings = await getMeetings(meetingType)
  const canApprove = ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "PRINCIPAL"].includes(
    profile.role,
  )

  return (
    <MeetingList
      meetings={JSON.parse(JSON.stringify(meetings))}
      activeType={meetingType || "all"}
      canApprove={canApprove}
    />
  )
}
