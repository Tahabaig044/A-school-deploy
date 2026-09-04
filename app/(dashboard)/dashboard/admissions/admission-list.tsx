"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Search, Eye, Trash2 } from "lucide-react"
import { deleteAdmission } from "@/actions/admission.actions"
import { useToast } from "@/hooks/use-toast"

interface Admission {
  id: string
  admissionNo: string
  firstName: string
  lastName: string
  status: string
  createdAt: Date
  appliedClass: { name: string }
  academicSession: { name: string }
  _count: { documents: number; guardians: number }
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  UNDER_REVIEW: "bg-blue-100 text-blue-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  WAITLISTED: "bg-purple-100 text-purple-800",
}

interface AdmissionListProps {
  admissions: Admission[]
  total: number
  page: number
  status: string
  search: string
  classId: string
}

export function AdmissionList({
  admissions,
  total,
  page,
  status,
  search,
  classId,
}: AdmissionListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [searchInput, setSearchInput] = useState(search)
  const [deleting, setDeleting] = useState<string | null>(null)

  const totalPages = Math.ceil(total / 20)

  function updateParams(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    if (key !== "page") params.delete("page")
    router.push(`/dashboard/admissions?${params.toString()}`)
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      await deleteAdmission(id)
      toast({ title: "Admission deleted successfully" })
      router.refresh()
    } catch {
      toast({ title: "Failed to delete admission", variant: "destructive" })
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Admissions</h1>
          <p className="text-muted-foreground">
            {total} admission{total !== 1 ? "s" : ""} found
          </p>
        </div>
        <Link href="/dashboard/admissions/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Admission
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="relative max-w-sm min-w-[200px] flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search by name, admission no, or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateParams("search", searchInput)
              }
            }}
            className="pl-10"
          />
        </div>
        <Select value={status} onValueChange={(value) => updateParams("status", value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="WAITLISTED">Waitlisted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Admission No</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Class</TableHead>
              <TableHead className="hidden md:table-cell">Session</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Documents</TableHead>
              <TableHead className="hidden lg:table-cell">Guardians</TableHead>
              <TableHead className="hidden md:table-cell">Applied</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {admissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-muted-foreground py-8 text-center">
                  No admissions found
                </TableCell>
              </TableRow>
            ) : (
              admissions.map((admission) => (
                <TableRow key={admission.id}>
                  <TableCell className="font-mono text-sm">{admission.admissionNo}</TableCell>
                  <TableCell className="font-medium">
                    {admission.firstName} {admission.lastName}
                  </TableCell>
                  <TableCell>{admission.appliedClass.name}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {admission.academicSession.name}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[admission.status] || ""}>
                      {admission.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {admission._count.documents}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {admission._count.guardians}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {new Date(admission.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/dashboard/admissions/${admission.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(admission.id)}
                        disabled={deleting === admission.id}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => updateParams("page", String(page - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => updateParams("page", String(page + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
