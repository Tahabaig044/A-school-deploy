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
import { createTransportRoute, updateTransportRoute, deleteTransportRoute } from "@/actions/transport.actions"
import { useToast } from "@/hooks/use-toast"
import { Pencil, Trash2, Plus } from "lucide-react"

export function RouteList({
  routes,
  profile,
}: {
  routes: any[]
  profile: any
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    formData.set("schoolId", profile.schoolId || "")
    formData.set("branchId", profile.branchId || "")
    const res = editItem
      ? await updateTransportRoute(editItem.id, null, formData)
      : await createTransportRoute(null, formData)
    if (res?.error) {
      setError(res.error)
    } else {
      setOpen(false)
      setEditItem(null)
      setError(null)
      toast({ title: `Route ${editItem ? "updated" : "created"} successfully` })
      router.refresh()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this route?")) return
    try {
      const res = await deleteTransportRoute(id)
      if (res.success) {
        toast({ title: "Route deleted" })
        router.refresh()
      } else {
        toast({ title: "Failed to delete route", variant: "destructive" })
      }
    } catch {
      toast({ title: "Failed to delete route", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Transport Routes" description="Manage transport routes">
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditItem(null); setError(null) } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Route</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editItem ? "Edit Route" : "Add Route"}</DialogTitle>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Route Name</Label>
                  <Input id="name" name="name" defaultValue={editItem?.name || ""} required />
                </div>
                <div>
                  <Label htmlFor="vehicleId">Vehicle ID</Label>
                  <Input id="vehicleId" name="vehicleId" defaultValue={editItem?.vehicleId || ""} required />
                </div>
                <div>
                  <Label htmlFor="startLocation">Start Location</Label>
                  <Input id="startLocation" name="startLocation" defaultValue={editItem?.startLocation || ""} required />
                </div>
                <div>
                  <Label htmlFor="endLocation">End Location</Label>
                  <Input id="endLocation" name="endLocation" defaultValue={editItem?.endLocation || ""} required />
                </div>
                <div>
                  <Label htmlFor="pickupTime">Pickup Time</Label>
                  <Input id="pickupTime" name="pickupTime" type="time" defaultValue={editItem?.pickupTime || ""} />
                </div>
                <div>
                  <Label htmlFor="dropTime">Drop Time</Label>
                  <Input id="dropTime" name="dropTime" type="time" defaultValue={editItem?.dropTime || ""} />
                </div>
                <div>
                  <Label htmlFor="monthlyFee">Monthly Fee</Label>
                  <Input id="monthlyFee" name="monthlyFee" type="number" step="0.01" defaultValue={editItem?.monthlyFee || ""} />
                </div>
              </div>
              <div>
                <Label htmlFor="stops">Stops (comma separated)</Label>
                <Input id="stops" name="stops" defaultValue={editItem?.stops || ""} />
              </div>
              {editItem && (
                <div>
                  <Label htmlFor="isActive">Active</Label>
                  <select name="isActive" defaultValue={editItem?.isActive ? "true" : "false"} className="w-full border rounded p-2">
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              )}
              <Button type="submit" className="w-full">{editItem ? "Update" : "Create Route"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <DataTable
        columns={[
          { header: "Name", accessorKey: "name" },
          { header: "Vehicle", accessorKey: "vehicle", cell: ({ row }: any) => `${row.vehicle?.plateNumber} (${row.vehicle?.vehicleType})` },
          { header: "Start", accessorKey: "startLocation" },
          { header: "End", accessorKey: "endLocation" },
          { header: "Pickup", accessorKey: "pickupTime", cell: ({ row }: any) => row.pickupTime || "-" },
          { header: "Drop", accessorKey: "dropTime", cell: ({ row }: any) => row.dropTime || "-" },
          { header: "Fee", accessorKey: "monthlyFee", cell: ({ row }: any) => row.monthlyFee ? `$${row.monthlyFee}` : "-" },
          { header: "Students", accessorKey: "_count", cell: ({ row }: any) => row._count?.assignments || 0 },
          { header: "Status", accessorKey: "isActive", cell: ({ row }: any) => (
            <Badge variant={row.isActive ? "default" : "secondary"}>
              {row.isActive ? "Active" : "Inactive"}
            </Badge>
          )},
          {
            header: "Actions",
            cell: ({ row }: any) => (
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => { setEditItem(row); setOpen(true) }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          },
        ]}
        data={routes}
      />
    </div>
  )
}
