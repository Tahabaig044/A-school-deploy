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
import { createVehicle, updateVehicle, deleteVehicle } from "@/actions/transport.actions"
import { useToast } from "@/hooks/use-toast"
import { Pencil, Trash2, Plus } from "lucide-react"

const vehicleTypes = ["BUS", "VAN", "CAR", "MINIBUS", "OTHER"] as const

export function VehicleList({
  vehicles,
  profile,
}: {
  vehicles: any[]
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
      ? await updateVehicle(editItem.id, null, formData)
      : await createVehicle(null, formData)
    if (res?.error) {
      setError(res.error)
    } else {
      setOpen(false)
      setEditItem(null)
      setError(null)
      toast({ title: `Vehicle ${editItem ? "updated" : "added"} successfully` })
      router.refresh()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this vehicle?")) return
    try {
      const res = await deleteVehicle(id)
      if (res.success) {
        toast({ title: "Vehicle deleted" })
        router.refresh()
      } else {
        toast({ title: "Failed to delete vehicle", variant: "destructive" })
      }
    } catch {
      toast({ title: "Failed to delete vehicle", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Vehicles" description="Manage transport vehicles">
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditItem(null); setError(null) } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Vehicle</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div>
                <Label htmlFor="plateNumber">Plate Number</Label>
                <Input id="plateNumber" name="plateNumber" defaultValue={editItem?.plateNumber || ""} required />
              </div>
              <div>
                <Label htmlFor="vehicleType">Vehicle Type</Label>
                <select name="vehicleType" defaultValue={editItem?.vehicleType || "BUS"} className="w-full border rounded p-2">
                  {vehicleTypes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="capacity">Capacity</Label>
                <Input id="capacity" name="capacity" type="number" defaultValue={editItem?.capacity || ""} required />
              </div>
              <div>
                <Label htmlFor="driverName">Driver Name</Label>
                <Input id="driverName" name="driverName" defaultValue={editItem?.driverName || ""} />
              </div>
              <div>
                <Label htmlFor="driverPhone">Driver Phone</Label>
                <Input id="driverPhone" name="driverPhone" defaultValue={editItem?.driverPhone || ""} />
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
              <Button type="submit" className="w-full">{editItem ? "Update" : "Add Vehicle"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <DataTable
        columns={[
          { header: "Plate Number", accessorKey: "plateNumber" },
          { header: "Type", accessorKey: "vehicleType" },
          { header: "Capacity", accessorKey: "capacity" },
          { header: "Driver", accessorKey: "driverName", cell: ({ row }: any) => row.driverName || "-" },
          { header: "Driver Phone", accessorKey: "driverPhone", cell: ({ row }: any) => row.driverPhone || "-" },
          { header: "Routes", accessorKey: "_count", cell: ({ row }: any) => row._count?.routes || 0 },
          { header: "Assignments", accessorKey: "_count", cell: ({ row }: any) => row._count?.assignments || 0 },
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
        data={vehicles}
      />
    </div>
  )
}
