"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createFeeStructure, updateFeeStructure, deleteFeeStructure } from "@/actions/fees.actions"
import { useToast } from "@/hooks/use-toast"
import { Pencil, Trash2, Plus } from "lucide-react"

const frequencies = ["MONTHLY", "QUARTERLY", "YEARLY", "ONE_TIME"] as const
const categories = [
  "TUITION",
  "ADMISSION",
  "SPORTS",
  "LIBRARY",
  "TRANSPORT",
  "LAB",
  "OTHER",
] as const

export function FeeStructureList({
  feeStructures,
  total,
  page,
  pageSize,
  profile,
}: {
  feeStructures: any[]
  total: number
  page: number
  pageSize: number
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
      ? await updateFeeStructure(editItem.id, null, formData)
      : await createFeeStructure(null, formData)
    if (res?.error) {
      setError(res.error)
    } else {
      setOpen(false)
      setEditItem(null)
      setError(null)
      toast({ title: `Fee structure ${editItem ? "updated" : "created"} successfully` })
      router.refresh()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this fee structure?")) return
    try {
      const res = await deleteFeeStructure(id)
      if (res.success) {
        toast({ title: "Fee structure deleted" })
        router.refresh()
      } else {
        toast({ title: "Failed to delete fee structure", variant: "destructive" })
      }
    } catch {
      toast({ title: "Failed to delete fee structure", variant: "destructive" })
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6">
      <PageHeader title="Fee Structures" description="Manage fee types and amounts">
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o)
            if (!o) {
              setEditItem(null)
              setError(null)
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Fee Structure
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem ? "Edit Fee Structure" : "Add Fee Structure"}</DialogTitle>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={editItem?.name || ""} required />
              </div>
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  defaultValue={editItem?.amount || ""}
                  required
                />
              </div>
              <div>
                <Label htmlFor="frequency">Frequency</Label>
                <Select name="frequency" defaultValue={editItem?.frequency || "MONTHLY"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {frequencies.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select name="category" defaultValue={editItem?.category || "TUITION"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editItem && (
                <div>
                  <Label htmlFor="isActive">Active</Label>
                  <Select name="isActive" defaultValue={editItem?.isActive ? "true" : "false"}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button type="submit" className="w-full">
                {editItem ? "Update" : "Create"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <DataTable
        columns={[
          { header: "Name", accessorKey: "name" },
          {
            header: "Amount",
            accessorKey: "amount",
            cell: ({ row }: any) => `$${Number(row.amount).toFixed(2)}`,
          },
          {
            header: "Frequency",
            accessorKey: "frequency",
            cell: ({ row }: any) => (
              <Badge variant="outline">{row.frequency.replace(/_/g, " ")}</Badge>
            ),
          },
          {
            header: "Category",
            accessorKey: "category",
            cell: ({ row }: any) => <Badge>{row.category.replace(/_/g, " ")}</Badge>,
          },
          {
            header: "Status",
            accessorKey: "isActive",
            cell: ({ row }: any) => (
              <Badge variant={row.isActive ? "default" : "secondary"}>
                {row.isActive ? "Active" : "Inactive"}
              </Badge>
            ),
          },
          {
            header: "Actions",
            cell: ({ row }: any) => (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditItem(row)
                    setOpen(true)
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          },
        ]}
        data={feeStructures}
      />

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <Button
              key={i}
              variant={page === i + 1 ? "default" : "outline"}
              size="sm"
              onClick={() => router.push(`/dashboard/fees/fee-structures?page=${i + 1}`)}
            >
              {i + 1}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
