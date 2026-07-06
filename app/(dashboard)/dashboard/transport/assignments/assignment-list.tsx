"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { assignStudentTransport, removeStudentTransport } from "@/actions/transport.actions"
import { useToast } from "@/hooks/use-toast"
import { Trash2, Plus } from "lucide-react"

export function AssignmentList({
  assignments,
  profile,
}: {
  assignments: any[]
  profile: any
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAssign(formData: FormData) {
    const res = await assignStudentTransport(null, formData)
    if (res?.error) {
      setError(res.error)
    } else {
      setOpen(false)
      setError(null)
      toast({ title: "Student assigned to transport" })
      router.refresh()
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("Are you sure you want to remove this assignment?")) return
    const res = await removeStudentTransport(id)
    if (res.success) {
      toast({ title: "Assignment removed" })
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Transport Assignments" description="Assign students to transport routes">
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setError(null) }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Assign Student</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Student to Transport</DialogTitle>
            </DialogHeader>
            <form action={handleAssign} className="space-y-4">
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div>
                <Label htmlFor="studentId">Student ID</Label>
                <Input id="studentId" name="studentId" required />
              </div>
              <div>
                <Label htmlFor="routeId">Route ID</Label>
                <Input id="routeId" name="routeId" required />
              </div>
              <div>
                <Label htmlFor="vehicleId">Vehicle ID</Label>
                <Input id="vehicleId" name="vehicleId" required />
              </div>
              <div>
                <Label htmlFor="academicSessionId">Academic Session ID</Label>
                <Input id="academicSessionId" name="academicSessionId" required />
              </div>
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input id="startDate" name="startDate" type="date" required />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input id="endDate" name="endDate" type="date" />
              </div>
              <Button type="submit" className="w-full">Assign</Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <DataTable
        columns={[
          { header: "Student", accessorKey: "student", cell: ({ row }: any) => `${row.student?.firstName} ${row.student?.lastName}` },
          { header: "Admission No", accessorKey: "student", cell: ({ row }: any) => row.student?.admissionNo },
          { header: "Route", accessorKey: "route", cell: ({ row }: any) => row.route?.name },
          { header: "Vehicle", accessorKey: "vehicle", cell: ({ row }: any) => `${row.vehicle?.plateNumber} (${row.vehicle?.vehicleType})` },
          { header: "Start Location", accessorKey: "route", cell: ({ row }: any) => row.route?.startLocation },
          { header: "End Location", accessorKey: "route", cell: ({ row }: any) => row.route?.endLocation },
          { header: "Monthly Fee", accessorKey: "route", cell: ({ row }: any) => row.route?.monthlyFee ? `$${row.route.monthlyFee}` : "-" },
          { header: "Start Date", accessorKey: "startDate", cell: ({ row }: any) => new Date(row.startDate).toLocaleDateString() },
          { header: "Status", accessorKey: "isActive", cell: ({ row }: any) => (
            <Badge variant={row.isActive ? "default" : "secondary"}>
              {row.isActive ? "Active" : "Inactive"}
            </Badge>
          )},
          {
            header: "Actions",
            cell: ({ row }: any) => (
              <Button variant="ghost" size="icon" onClick={() => handleRemove(row.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            ),
          },
        ]}
        data={assignments}
      />
    </div>
  )
}
