"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createExamSchedule, deleteExamSchedule } from "@/actions/exam.actions"
import { useToast } from "@/hooks/use-toast"
import { Trash2, Plus } from "lucide-react"

export function ScheduleList({
  schedules,
  profile,
}: {
  schedules: any[]
  profile: any
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    const res = await createExamSchedule(null, formData)
    if (res?.error) {
      setError(res.error)
    } else {
      setOpen(false)
      setError(null)
      toast({ title: "Schedule created successfully" })
      router.refresh()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this schedule?")) return
    const res = await deleteExamSchedule(id)
    if (res.success) {
      toast({ title: "Schedule deleted" })
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Exam Schedule" description="View and manage exam schedules">
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setError(null) }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Schedule</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Exam Schedule</DialogTitle>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div>
                <Label htmlFor="examId">Exam ID</Label>
                <Input id="examId" name="examId" required />
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input id="date" name="date" type="date" required />
              </div>
              <div>
                <Label htmlFor="startTime">Start Time</Label>
                <Input id="startTime" name="startTime" type="time" required />
              </div>
              <div>
                <Label htmlFor="endTime">End Time</Label>
                <Input id="endTime" name="endTime" type="time" required />
              </div>
              <div>
                <Label htmlFor="room">Room</Label>
                <Input id="room" name="room" />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" />
              </div>
              <Button type="submit" className="w-full">Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <DataTable
        columns={[
          { header: "Date", accessorKey: "date", cell: ({ row }: any) => new Date(row.date).toLocaleDateString() },
          { header: "Exam", accessorKey: "exam", cell: ({ row }: any) => row.exam?.name },
          { header: "Type", accessorKey: "exam", cell: ({ row }: any) => row.exam?.examType?.name },
          { header: "Class", accessorKey: "exam", cell: ({ row }: any) => row.exam?.class?.name },
          { header: "Subject", accessorKey: "exam", cell: ({ row }: any) => row.exam?.subject?.name },
          { header: "Time", accessorKey: "startTime", cell: ({ row }: any) => `${row.startTime} - ${row.endTime}` },
          { header: "Room", accessorKey: "room", cell: ({ row }: any) => row.room || "-" },
          { header: "Notes", accessorKey: "notes", cell: ({ row }: any) => row.notes || "-" },
          {
            header: "Actions",
            cell: ({ row }: any) => (
              <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            ),
          },
        ]}
        data={schedules}
      />
    </div>
  )
}
