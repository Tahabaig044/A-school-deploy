import * as React from "react"

import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

export interface ColumnDef<T> {
  header: string | React.ReactNode
  accessorKey?: string
  cell?: (info: { row: T; getValue: (key: string) => any }) => React.ReactNode
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  pagination?: {
    page: number
    totalPages: number
    total: number
  }
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  pagination,
}: DataTableProps<T>) {
  function getValue(row: T, accessorKey?: string) {
    if (!accessorKey) return undefined
    return accessorKey.split(".").reduce((obj: any, key) => obj?.[key], row)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col, i) => (
                <TableHead key={i}>
                  {typeof col.header === "string" ? col.header : col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, rowIndex) => (
                <TableRow key={row.id ?? rowIndex}>
                  {columns.map((col, colIndex) => (
                    <TableCell key={colIndex}>
                      {col.cell
                        ? col.cell({ row, getValue: (key: string) => getValue(row, key) })
                        : getValue(row, col.accessorKey)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => {
                const url = new URL(window.location.href)
                url.searchParams.set("page", String(pagination.page - 1))
                window.location.href = url.toString()
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => {
                const url = new URL(window.location.href)
                url.searchParams.set("page", String(pagination.page + 1))
                window.location.href = url.toString()
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}