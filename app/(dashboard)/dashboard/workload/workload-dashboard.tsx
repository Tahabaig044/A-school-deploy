"use client"

import { useState, useActionState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { updateWorkloadDefaults, updateTeacherWorkloadLimits } from "@/actions/workload.actions"
import { AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, Users, BookOpen, CalendarDays, Settings, Gauge } from "lucide-react"

const DAY_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]

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
  const [settingsState, settingsAction, settingsPending] = useActionState(updateWorkloadDefaults, null)
  const [limitState, limitAction, limitPending] = useActionState(updateTeacherWorkloadLimits, null)
  const [editTeacher, setEditTeacher] = useState<any>(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Teacher Workload</h2>
          <p className="text-muted-foreground">Academic session: {sessionName}</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1"><AlertTriangle className="h-4 w-4 text-red-500" /> {overloadedCount} overloaded</span>
          <span className="flex items-center gap-1"><TrendingDown className="h-4 w-4 text-yellow-500" /> {underloadedCount} underloaded</span>
          <span className="flex items-center gap-1"><BookOpen className="h-4 w-4 text-blue-500" /> {totalPeriods} total periods</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total Teachers</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{teachers.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total Periods</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalPeriods}</div></CardContent>
        </Card>
        <Card className={overloadedCount > 0 ? "border-red-300" : ""}>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Overloaded</CardTitle></CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${overloadedCount > 0 ? "text-red-600" : ""}`}>{overloadedCount}</div>
          </CardContent>
        </Card>
        <Card className={underloadedCount > 0 ? "border-yellow-300" : ""}>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Underloaded</CardTitle></CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${underloadedCount > 0 ? "text-yellow-600" : ""}`}>{underloadedCount}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="teachers">
        <TabsList>
          <TabsTrigger value="teachers"><Users className="h-4 w-4 mr-2" />Teacher Overview</TabsTrigger>
          <TabsTrigger value="departments"><TrendingUp className="h-4 w-4 mr-2" />Department Workload</TabsTrigger>
          <TabsTrigger value="classes"><BookOpen className="h-4 w-4 mr-2" />Class Distribution</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-2" />Limits</TabsTrigger>
        </TabsList>

        <TabsContent value="teachers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Teacher Workload Overview</CardTitle>
              <CardDescription>Periods per teacher calculated from timetable. Warnings shown for over/under loaded.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Classes</TableHead>
                    <TableHead className="text-center">Daily (max)</TableHead>
                    <TableHead className="text-center">Weekly (max)</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No teachers found.</TableCell></TableRow>
                  ) : (
                    teachers.map((t) => (
                      <TableRow key={t.teacherId} className={t.isOverloaded ? "bg-red-50/50" : t.isUnderloaded ? "bg-yellow-50/50" : ""}>
                        <TableCell className="font-medium">{t.firstName} {t.lastName}</TableCell>
                        <TableCell className="text-muted-foreground">{t.department || "—"}</TableCell>
                        <TableCell>{t.totalAssignments}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className={t.overloadedDays.length > 0 ? "text-red-600 font-medium" : ""}>
                              {Object.values(t.periodsByDay as Record<string, number>).reduce((a: number, b: number) => Math.max(a, b), 0)}
                            </span>
                            <span className="text-muted-foreground">/ {t.maxPeriodsPerDay || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className={t.isOverloaded ? "text-red-600 font-medium" : ""}>{t.totalPeriods}</span>
                            <span className="text-muted-foreground">/ {t.maxPeriodsPerWeek || "—"}</span>
                          </div>
                          {t.maxPeriodsPerWeek && (
                            <div className={`h-1.5 w-full rounded-full mt-1 ${t.isOverloaded ? "bg-red-200" : t.isUnderloaded ? "bg-yellow-200" : "bg-secondary"}`}>
                              <div
                                className={`h-full rounded-full ${t.isOverloaded ? "bg-red-500" : t.isUnderloaded ? "bg-yellow-500" : "bg-primary"}`}
                                style={{ width: `${Math.min(100, (t.totalPeriods / t.maxPeriodsPerWeek) * 100)}%` }}
                              />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {t.isOverloaded ? (
                            <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Overloaded</Badge>
                          ) : t.isUnderloaded ? (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 gap-1"><TrendingDown className="h-3 w-3" />Underloaded</Badge>
                          ) : (
                            <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" />Balanced</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog open={editTeacher?.teacherId === t.teacherId} onOpenChange={(o) => { if (!o) setEditTeacher(null) }}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => setEditTeacher(t)}>
                                <Gauge className="h-3 w-3 mr-1" />Limits
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Workload Limits — {t.firstName} {t.lastName}</DialogTitle>
                                <DialogDescription>Set custom limits for this teacher. Leave empty to use school defaults.</DialogDescription>
                              </DialogHeader>
                              <form action={limitAction} className="space-y-4">
                                <input type="hidden" name="teacherId" value={t.teacherId} />
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="maxPeriodsPerDay">Max Periods / Day</Label>
                                    <Input id="maxPeriodsPerDay" name="maxPeriodsPerDay" type="number" min="0" max="16"
                                      defaultValue={t.maxPeriodsPerDay || ""} placeholder={String(defaults.maxPeriodsPerDay)} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="maxPeriodsPerWeek">Max Periods / Week</Label>
                                    <Input id="maxPeriodsPerWeek" name="maxPeriodsPerWeek" type="number" min="0" max="60"
                                      defaultValue={t.maxPeriodsPerWeek || ""} placeholder={String(defaults.maxPeriodsPerWeek)} />
                                  </div>
                                </div>
                                {limitState?.error && <p className="text-sm text-destructive">{limitState.error}</p>}
                                {limitState?.success && <p className="text-sm text-green-600">Limits updated.</p>}
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
              <CardTitle>Department Workload</CardTitle>
              <CardDescription>Average workload per department</CardDescription>
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
                  {departments.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No departments found.</TableCell></TableRow>
                  ) : (
                    departments.map((dept) => (
                      <TableRow key={dept.department}>
                        <TableCell className="font-medium">{dept.department}</TableCell>
                        <TableCell className="text-center">{dept.teacherCount}</TableCell>
                        <TableCell className="text-center">{dept.totalPeriods}</TableCell>
                        <TableCell className="text-center">{dept.avgPeriods}</TableCell>
                        <TableCell className="text-center">
                          {dept.overloaded > 0 ? (
                            <Badge variant="destructive">{dept.overloaded}</Badge>
                          ) : <span className="text-muted-foreground">0</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          {dept.underloaded > 0 ? (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">{dept.underloaded}</Badge>
                          ) : <span className="text-muted-foreground">0</span>}
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
              <CardTitle>Class Distribution</CardTitle>
              <CardDescription>Periods assigned per class</CardDescription>
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
                  {classDistribution.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No classes found.</TableCell></TableRow>
                  ) : (
                    classDistribution.map((c) => (
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
              <CardDescription>Default workload limits applied to all teachers unless overridden per teacher.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={settingsAction} className="max-w-md space-y-4">
                <input type="hidden" name="schoolId" value={schoolId} />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxPeriodsPerDay">Max Periods Per Day</Label>
                    <Input id="maxPeriodsPerDay" name="maxPeriodsPerDay" type="number" min="1" max="16"
                      defaultValue={defaults.maxPeriodsPerDay} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxPeriodsPerWeek">Max Periods Per Week</Label>
                    <Input id="maxPeriodsPerWeek" name="maxPeriodsPerWeek" type="number" min="1" max="60"
                      defaultValue={defaults.maxPeriodsPerWeek} required />
                  </div>
                </div>
                {settingsState?.error && <p className="text-sm text-destructive">{settingsState.error}</p>}
                {settingsState?.success && <p className="text-sm text-green-600">Default limits updated.</p>}
                <Button type="submit" disabled={settingsPending}>Save Defaults</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
