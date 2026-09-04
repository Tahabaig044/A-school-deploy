"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DataTable } from "@/components/ui/data-table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createExpense, updateExpense, deleteExpense } from "@/actions/expenses.actions"
import { useToast } from "@/hooks/use-toast"
import { Pencil, Trash2, Plus } from "lucide-react"

export function ExpenseList({
  expenses,
  total,
  page,
  pageSize,
  profile,
}: {
  expenses: any[]
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
      ? await updateExpense(editItem.id, null, formData)
      : await createExpense(null, formData)
    if (res?.error) {
      setError(res.error)
    } else {
      setOpen(false)
      setEditItem(null)
      setError(null)
      toast({ title: `Expense ${editItem ? "updated" : "created"} successfully` })
      router.refresh()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this expense?")) return
    try {
      const res = await deleteExpense(id)
      if (res.success) {
        toast({ title: "Expense deleted" })
        router.refresh()
      } else {
        toast({ title: "Failed to delete expense", variant: "destructive" })
      }
    } catch {
      toast({ title: "Failed to delete expense", variant: "destructive" })
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6">
      <PageHeader title="Expenses" description="Track branch expenses">
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
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem ? "Edit Expense" : "Add Expense"}</DialogTitle>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  name="category"
                  defaultValue={editItem?.category || ""}
                  required
                />
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
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  defaultValue={editItem?.description || ""}
                />
              </div>
              <div>
                <Label htmlFor="expenseDate">Date</Label>
                <Input
                  id="expenseDate"
                  name="expenseDate"
                  type="date"
                  defaultValue={
                    editItem?.expenseDate?.slice(0, 10) || new Date().toISOString().slice(0, 10)
                  }
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {editItem ? "Update" : "Create"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <DataTable
        columns={[
          { header: "Category", accessorKey: "category" },
          {
            header: "Description",
            accessorKey: "description",
            cell: ({ row }: any) => row.description || "—",
          },
          {
            header: "Amount",
            accessorKey: "amount",
            cell: ({ row }: any) => `$${Number(row.amount).toFixed(2)}`,
          },
          {
            header: "Date",
            accessorKey: "expenseDate",
            cell: ({ row }: any) => new Date(row.expenseDate).toLocaleDateString(),
          },
          {
            header: "Recorded By",
            cell: ({ row }: any) => `${row.recorder.firstName} ${row.recorder.lastName}`,
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
        data={expenses}
      />

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <Button
              key={i}
              variant={page === i + 1 ? "default" : "outline"}
              size="sm"
              onClick={() => router.push(`/dashboard/expenses?page=${i + 1}`)}
            >
              {i + 1}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
