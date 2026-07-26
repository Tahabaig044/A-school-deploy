import { getTeacherTimetable } from "@/actions/teacher-portal.actions"
import { TimetableViewer } from "./timetable-viewer"

export default async function TeacherTimetablePage() {
  const timetable = await getTeacherTimetable()

  return <TimetableViewer timetable={timetable as any} />
}
