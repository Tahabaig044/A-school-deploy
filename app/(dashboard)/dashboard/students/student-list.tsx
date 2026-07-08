"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Search, Pencil, Trash2 } from "lucide-react"
import { deleteStudent } from "@/actions/student.actions"
import { useToast } from "@/hooks/use-toast"

type StudentListItem = {
  id: string
  firstName: string
  lastName: string
  admissionNo: string | null
  status: string
  photoUrl: string | null
  enrollments: {
    class: { name: string }
    section: { name: string } | null
    academicSession: { name: string }
  }[]
}

type ClassItem = {
  id: string
  name: string
}

export function StudentList({
  students,
  classes,
  currentPage,
  totalPages,
  total,
  search: initialSearch,
  status: initialStatus,
  classId: initialClassId,
}: {
  students: StudentListItem[]
  classes: ClassItem[]
  currentPage: number
  totalPages: number
  total: number
  search: string
  status: string
  classId: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchValue, setSearchValue] = useState(initialSearch)
  const { toast } = useToast()

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete student "${name}"?`)) return
    try {
      await deleteStudent(id)
      toast({ title: "Student deleted" })
      router.refresh()
    } catch {
      toast({ title: "Failed to delete student", variant: "destructive" })
    }
  }

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    if (key !== "page") params.delete("page")
    router.push(`/dashboard/students?${params.toString()}`)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    updateParam("search", searchValue)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle>All Students ({total})</CardTitle>
          <Link href="/dashboard/students/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Student
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-60 pl-8"
              />
            </div>
            <Button type="submit" size="sm" variant="secondary">
              Search
            </Button>
          </form>

          <Select
            value={initialStatus || "all"}
            onValueChange={(v: string | null) => updateParam("status", v === "all" || v === null ? "" : v)}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="TRANSFERRED">Transferred</SelectItem>
              <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
              <SelectItem value="GRADUATED">Graduated</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={initialClassId || "all"}
            onValueChange={(v: string | null) => updateParam("classId", v === "all" || v === null ? "" : v)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {students.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No students found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Admission No</TableHead>
                  <TableHead>Class/Section</TableHead>
                  <TableHead className="hidden lg:table-cell">Session</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/students/${student.id}`}
                        className="hover:underline"
                      >
                        {student.firstName} {student.lastName}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{student.admissionNo || "-"}</TableCell>
                    <TableCell>
                      {student.enrollments[0]
                        ? `${student.enrollments[0].class.name}${student.enrollments[0].section ? ` - ${student.enrollments[0].section.name}` : ""}`
                        : "-"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {student.enrollments[0]?.academicSession.name || "-"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          student.status === "ACTIVE"
                            ? "bg-green-100 text-green-800"
                            : student.status === "TRANSFERRED"
                              ? "bg-blue-100 text-blue-800"
                              : student.status === "WITHDRAWN"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {student.status.charAt(0) + student.status.slice(1).toLowerCase()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link href={`/dashboard/students/${student.id}/edit`}>
                          <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(student.id, `${student.firstName} ${student.lastName}`)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => updateParam("page", String(currentPage - 1))}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => updateParam("page", String(currentPage + 1))}
            >
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
