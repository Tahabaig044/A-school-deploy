"use client"

import { useState, useActionState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { updateWorkloadDefaults, updateTeacherWorkloadLimits } from "@/actions/workload.actions"
import {
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Users,
  BookOpen,
  CalendarDays,
  Settings,
  Gauge,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react"

const DAY_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]

type SortField = "name" | "department" | "classes" | "daily" | "weekly" | "status"

function SortHeader({
  field,
  sortField,
  sortDir,
  toggleSort,
  children,
  className,
}: {
  field: SortField
  sortField: string
  sortDir: "asc" | "desc"
  toggleSort: (f: SortField) => void
  children: React.ReactNode
  className?: string
}) {
  const active = sortField === field
  return (
    <TableHead className={className}>
      <button
        onClick={() => toggleSort(field)}
        className="hover:text-foreground inline-flex items-center gap-1 transition-colors"
      >
        {children}
        {active ? (
          sortDir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </button>
    </TableHead>
  )
}

export function WorkloadDashboard({
  teachers,
  departments,
  classDistribution,
  defaults,
  schoolId,
  sessionName,
  totalPeriods,
  overloadedCount,
  underloadedCount,
}: {
  teachers: any[]
  departments: any[]
  classDistribution: any[]
  defaults: { maxPeriodsPerDay: number; maxPeriodsPerWeek: number }
  schoolId: string
  sessionName: string
  totalPeriods: number
  overloadedCount: number
  underloadedCount: number
}) {
  const [settingsState, settingsAction, settingsPending] = useActionState(
    updateWorkloadDefaults,
    null,
  )
  const [limitState, limitAction, limitPending] = useActionState(updateTeacherWorkloadLimits, null)
  const [editTeacher, setEditTeacher] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [deptSearch, setDeptSearch] = useState("")
  const [classSearch, setClassSearch] = useState("")

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("asc")
    }
  }

  const filteredTeachers = useMemo(() => {
    let filtered = teachers
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = teachers.filter(
        (t: any) =>
          `${t.firstName} ${t.lastName}`.toLowerCase().includes(q) ||
          (t.department || "").toLowerCase().includes(q) ||
          (t.employeeCode || "").toLowerCase().includes(q),
      )
    }
    return [...filtered].sort((a: any, b: any) => {
      let cmp = 0
      switch (sortField) {
        case "name":
          cmp = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
          break
        case "department":
          cmp = (a.department || "").localeCompare(b.department || "")
          break
        case "classes":
          cmp = a.totalAssignments - b.totalAssignments
          break
        case "daily":
          const maxA = Object.values(a.periodsByDay || {}).reduce(
            (s: number, v: any) => Math.max(s, v),
            0,
          )
          const maxB = Object.values(b.periodsByDay || {}).reduce(
            (s: number, v: any) => Math.max(s, v),
            0,
          )
          cmp = maxA - maxB
          break
        case "weekly":
          cmp = a.totalPeriods - b.totalPeriods
          break
        case "status":
          const statusOrder: any = { overloaded: 0, balanced: 1, underloaded: 2 }
          const statusA: string = a.isOverloaded
            ? "overloaded"
            : a.isUnderloaded
              ? "underloaded"
              : "balanced"
          const statusB: string = b.isOverloaded
            ? "overloaded"
            : b.isUnderloaded
              ? "underloaded"
              : "balanced"
          cmp = statusOrder[statusA] - statusOrder[statusB]
          break
      }
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [teachers, searchQuery, sortField, sortDir])

  const filteredDepartments = useMemo(() => {
    if (!deptSearch.trim()) return departments
    const q = deptSearch.toLowerCase()
    return departments.filter((d: any) => d.department.toLowerCase().includes(q))
  }, [departments, deptSearch])

  const filteredClasses = useMemo(() => {
    if (!classSearch.trim()) return classDistribution
    const q = classSearch.toLowerCase()
    return classDistribution.filter((c: any) => c.className.toLowerCase().includes(q))
  }, [classDistribution, classSearch])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Teacher Workload</h2>
          <p className="text-muted-foreground">Academic session: {sessionName}</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4 text-red-500" /> {overloadedCount} overloaded
          </span>
          <span className="flex items-center gap-1">
            <TrendingDown className="h-4 w-4 text-yellow-500" /> {underloadedCount} underloaded
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="h-4 w-4 text-blue-500" /> {totalPeriods} total periods
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Teachers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teachers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Periods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPeriods}</div>
          </CardContent>
        </Card>
        <Card className={overloadedCount > 0 ? "border-red-300" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Overloaded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${overloadedCount > 0 ? "text-red-600" : ""}`}>
              {overloadedCount}
            </div>
          </CardContent>
        </Card>
        <Card className={underloadedCount > 0 ? "border-yellow-300" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Underloaded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${underloadedCount > 0 ? "text-yellow-600" : ""}`}>
              {underloadedCount}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="teachers">
        <TabsList>
          <TabsTrigger value="teachers">
            <Users className="mr-2 h-4 w-4" />
            Teacher Overview
          </TabsTrigger>
          <TabsTrigger value="departments">
            <TrendingUp className="mr-2 h-4 w-4" />
            Department Workload
          </TabsTrigger>
          <TabsTrigger value="classes">
            <BookOpen className="mr-2 h-4 w-4" />
            Class Distribution
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            Limits
          </TabsTrigger>
        </TabsList>

        <TabsContent value="teachers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Teacher Workload Overview</CardTitle>
                  <CardDescription>
                    Periods per teacher calculated from timetable. Click column headers to sort.
                  </CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                  <Input
                    placeholder="Search teachers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHeader
                      field="name"
                      sortField={sortField}
                      sortDir={sortDir}
                      toggleSort={toggleSort}
                    >
                      Teacher
                    </SortHeader>
                    <SortHeader
                      field="department"
                      sortField={sortField}
                      sortDir={sortDir}
                      toggleSort={toggleSort}
                    >
                      Department
                    </SortHeader>
                    <SortHeader
                      field="classes"
                      sortField={sortField}
                      sortDir={sortDir}
                      toggleSort={toggleSort}
                      className="text-center"
                    >
                      Classes
                    </SortHeader>
                    <SortHeader
                      field="daily"
                      sortField={sortField}
                      sortDir={sortDir}
                      toggleSort={toggleSort}
                      className="text-center"
                    >
                      Daily (max)
                    </SortHeader>
                    <SortHeader
                      field="weekly"
                      sortField={sortField}
                      sortDir={sortDir}
                      toggleSort={toggleSort}
                      className="text-center"
                    >
                      Weekly (max)
                    </SortHeader>
                    <SortHeader
                      field="status"
                      sortField={sortField}
                      sortDir={sortDir}
                      toggleSort={toggleSort}
                      className="text-center"
                    >
                      Status
                    </SortHeader>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeachers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                        {searchQuery ? "No teachers match your search." : "No teachers found."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTeachers.map((t: any) => (
                      <TableRow
                        key={t.teacherId}
                        className={
                          t.isOverloaded ? "bg-red-50/50" : t.isUnderloaded ? "bg-yellow-50/50" : ""
                        }
                      >
                        <TableCell className="font-medium">
                          {t.firstName} {t.lastName}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {t.department || "\u2014"}
                        </TableCell>
                        <TableCell className="text-center">{t.totalAssignments}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span
                              className={
                                t.overloadedDays.length > 0 ? "font-medium text-red-600" : ""
                              }
                            >
                              {Object.values(t.periodsByDay as Record<string, number>).reduce(
                                (a: number, b: number) => Math.max(a, b),
                                0,
                              )}
                            </span>
                            <span className="text-muted-foreground">
                              / {t.maxPeriodsPerDay || "\u2014"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className={t.isOverloaded ? "font-medium text-red-600" : ""}>
                              {t.totalPeriods}
                            </span>
                            <span className="text-muted-foreground">
                              / {t.maxPeriodsPerWeek || "\u2014"}
                            </span>
                          </div>
                          {t.maxPeriodsPerWeek && (
                            <div
                              className={`mt-1 h-1.5 w-full rounded-full ${t.isOverloaded ? "bg-red-200" : t.isUnderloaded ? "bg-yellow-200" : "bg-secondary"}`}
                            >
                              <div
                                className={`h-full rounded-full ${t.isOverloaded ? "bg-red-500" : t.isUnderloaded ? "bg-yellow-500" : "bg-primary"}`}
                                style={{
                                  width: `${Math.min(100, (t.totalPeriods / t.maxPeriodsPerWeek) * 100)}%`,
                                }}
                              />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {t.isOverloaded ? (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Overloaded
                            </Badge>
                          ) : t.isUnderloaded ? (
                            <Badge
                              variant="secondary"
                              className="gap-1 bg-yellow-100 text-yellow-800"
                            >
                              <TrendingDown className="h-3 w-3" />
                              Underloaded
                            </Badge>
                          ) : (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Balanced
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog
                            open={editTeacher?.teacherId === t.teacherId}
                            onOpenChange={(o) => {
                              if (!o) setEditTeacher(null)
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => setEditTeacher(t)}>
                                <Gauge className="mr-1 h-3 w-3" />
                                Limits
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>
                                  Workload Limits &mdash; {t.firstName} {t.lastName}
                                </DialogTitle>
                                <DialogDescription>
                                  Set custom limits for this teacher. Leave empty to use school
                                  defaults.
                                </DialogDescription>
                              </DialogHeader>
                              <form action={limitAction} className="space-y-4">
                                <input type="hidden" name="teacherId" value={t.teacherId} />
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="maxPeriodsPerDay">Max Periods / Day</Label>
                                    <Input
                                      id="maxPeriodsPerDay"
                                      name="maxPeriodsPerDay"
                                      type="number"
                                      min="0"
                                      max="16"
                                      defaultValue={t.maxPeriodsPerDay || ""}
                                      placeholder={String(defaults.maxPeriodsPerDay)}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="maxPeriodsPerWeek">Max Periods / Week</Label>
                                    <Input
                                      id="maxPeriodsPerWeek"
                                      name="maxPeriodsPerWeek"
                                      type="number"
                                      min="0"
                                      max="60"
                                      defaultValue={t.maxPeriodsPerWeek || ""}
                                      placeholder={String(defaults.maxPeriodsPerWeek)}
                                    />
                                  </div>
                                </div>
                                {limitState?.error && (
                                  <p className="text-destructive text-sm">{limitState.error}</p>
                                )}
                                {limitState?.success && (
                                  <p className="text-sm text-green-600">Limits updated.</p>
                                )}
                                <Button type="submit" disabled={limitPending} className="w-full">
                                  {limitPending ? "Saving..." : "Save Limits"}
                                </Button>
                              </form>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Department Workload</CardTitle>
                  <CardDescription>Average workload per department</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                  <Input
                    placeholder="Search departments..."
                    value={deptSearch}
                    onChange={(e) => setDeptSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-center">Teachers</TableHead>
                    <TableHead className="text-center">Total Periods</TableHead>
                    <TableHead className="text-center">Avg Periods</TableHead>
                    <TableHead className="text-center">Overloaded</TableHead>
                    <TableHead className="text-center">Underloaded</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDepartments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                        {deptSearch ? "No departments match your search." : "No departments found."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDepartments.map((dept: any) => (
                      <TableRow key={dept.department}>
                        <TableCell className="font-medium">{dept.department}</TableCell>
                        <TableCell className="text-center">{dept.teacherCount}</TableCell>
                        <TableCell className="text-center">{dept.totalPeriods}</TableCell>
                        <TableCell className="text-center">{dept.avgPeriods}</TableCell>
                        <TableCell className="text-center">
                          {dept.overloaded > 0 ? (
                            <Badge variant="destructive">{dept.overloaded}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {dept.underloaded > 0 ? (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                              {dept.underloaded}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classes" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Class Distribution</CardTitle>
                  <CardDescription>Periods assigned per class</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                  <Input
                    placeholder="Search classes..."
                    value={classSearch}
                    onChange={(e) => setClassSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead className="text-center">Total Periods</TableHead>
                    <TableHead className="text-center">Teachers Assigned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClasses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground py-8 text-center">
                        {classSearch ? "No classes match your search." : "No classes found."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClasses.map((c: any) => (
                      <TableRow key={c.className}>
                        <TableCell className="font-medium">{c.className}</TableCell>
                        <TableCell className="text-center">{c.totalPeriods}</TableCell>
                        <TableCell className="text-center">{c.teacherCount}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>School Default Limits</CardTitle>
              <CardDescription>
                Default workload limits applied to all teachers unless overridden per teacher.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={settingsAction} className="max-w-md space-y-4">
                <input type="hidden" name="schoolId" value={schoolId} />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxPeriodsPerDay">Max Periods Per Day</Label>
                    <Input
                      id="maxPeriodsPerDay"
                      name="maxPeriodsPerDay"
                      type="number"
                      min="1"
                      max="16"
                      defaultValue={defaults.maxPeriodsPerDay}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxPeriodsPerWeek">Max Periods Per Week</Label>
                    <Input
                      id="maxPeriodsPerWeek"
                      name="maxPeriodsPerWeek"
                      type="number"
                      min="1"
                      max="60"
                      defaultValue={defaults.maxPeriodsPerWeek}
                      required
                    />
                  </div>
                </div>
                {settingsState?.error && (
                  <p className="text-destructive text-sm">{settingsState.error}</p>
                )}
                {settingsState?.success && (
                  <p className="text-sm text-green-600">Default limits updated.</p>
                )}
                <Button type="submit" disabled={settingsPending}>
                  Save Defaults
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
