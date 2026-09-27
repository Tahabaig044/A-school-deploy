"use server"

import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"

export async function getDashboardStats(schoolId?: string, branchId?: string) {
  const { profile } = await requireRole(
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "TEACHER",
    "PARENT",
  )
  const statsStart = performance.now()

  const effectiveSchoolId =
    profile.role === "SUPER_ADMIN" ? schoolId || profile.schoolId : profile.schoolId
  const effectiveBranchId =
    profile.role === "SUPER_ADMIN" ? branchId || profile.branchId : profile.branchId

  const whereClause: any = {}
  if (effectiveSchoolId) whereClause.schoolId = effectiveSchoolId
  if (effectiveBranchId) whereClause.branchId = effectiveBranchId

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

  const classWhere: any = {}
  if (effectiveSchoolId) classWhere.schoolId = effectiveSchoolId
  if (effectiveBranchId) classWhere.branchId = effectiveBranchId

  const [
    totalStudents,
    totalTeachers,
    totalParents,
    totalClasses,
    totalSections,
    todayAttendance,
    totalStudentsCount,
    monthlyFeeCollection,
    pendingFeeAmount,
    newAdmissions,
    pendingLeaveRequests,
    upcomingExams,
    teachersOnLeave,
    upcomingMeetings,
    unreadNotifications,
    timetableConflicts,
  ] = await Promise.all([
    prisma.student.count({ where: { ...whereClause, status: "ACTIVE" } }),
    prisma.teacher.count({ where: { ...whereClause, status: "ACTIVE" } }),
    prisma.parent.count({ where: effectiveSchoolId ? { schoolId: effectiveSchoolId } : {} }),
    prisma.class.count({ where: classWhere }),
    prisma.section.count({
      where: classWhere.schoolId
        ? {
            class: {
              schoolId: classWhere.schoolId,
              ...(classWhere.branchId ? { branchId: classWhere.branchId } : {}),
            },
          }
        : {},
    }),
    prisma.studentAttendance.count({
      where: {
        class: {
          ...(effectiveSchoolId && { schoolId: effectiveSchoolId }),
          ...(effectiveBranchId && { branchId: effectiveBranchId }),
        },
        date: { gte: today, lt: tomorrow },
      },
    }),
    prisma.student.count({ where: { ...whereClause } }),
    prisma.payment.aggregate({
      where: {
        paymentDate: { gte: firstDayOfMonth, lte: lastDayOfMonth },
        invoice: {
          student: {
            ...(effectiveSchoolId ? { schoolId: effectiveSchoolId } : {}),
            ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
          },
        },
      },
      _sum: { amount: true },
    }),
    prisma.feeInvoice.aggregate({
      where: {
        status: { in: ["PENDING", "PARTIAL"] },
        student: {
          ...(effectiveSchoolId ? { schoolId: effectiveSchoolId } : {}),
          ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
        },
      },
      _sum: { totalAmount: true, paidAmount: true },
    }),
    prisma.student.count({
      where: {
        ...whereClause,
        admissionDate: { gte: firstDayOfMonth, lte: lastDayOfMonth },
      },
    }),
    prisma.leaveRequest.count({
      where: {
        status: "PENDING",
        ...(effectiveSchoolId || effectiveBranchId
          ? {
              profile: {
                ...(effectiveSchoolId ? { schoolId: effectiveSchoolId } : {}),
                ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
              },
            }
          : {}),
      },
    }),
    prisma.exam.count({
      where: {
        ...whereClause,
        examDate: { gte: today },
        isPublished: true,
      },
    }),
    prisma.leaveRequest.count({
      where: {
        status: "APPROVED",
        startDate: { lte: today },
        endDate: { gte: today },
        ...(effectiveSchoolId || effectiveBranchId
          ? {
              profile: {
                ...(effectiveSchoolId ? { schoolId: effectiveSchoolId } : {}),
                ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
              },
            }
          : {}),
      },
    }),
    prisma.meeting.count({
      where: {
        startDateTime: { gte: today },
        status: { in: ["PENDING", "APPROVED"] },
        ...(effectiveSchoolId ? { schoolId: effectiveSchoolId } : {}),
        ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
      },
    }),
    prisma.notification.count({
      where: {
        userId: profile.id,
        isRead: false,
      },
    }),
    // Timetable conflicts: count slots where same teacher has overlapping time
    prisma
      .$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM (
        SELECT t1.id FROM timetables t1
        INNER JOIN timetables t2 ON t1.teacher_id = t2.teacher_id
          AND t1.day_of_week = t2.day_of_week
          AND t1.id < t2.id
          AND t1.start_time < t2.end_time
          AND t2.start_time < t1.end_time
          AND t1.academic_session_id = t2.academic_session_id
        WHERE (t1.school_id = ${effectiveSchoolId ?? null} OR ${effectiveSchoolId ?? null} IS NULL)
          AND (t1.branch_id = ${effectiveBranchId ?? null} OR ${effectiveBranchId ?? null} IS NULL)
      ) conflicts
      `
      .then((r) => Number(r[0]?.count || 0))
      .catch(() => 0),
  ])

  if (process.env.NODE_ENV !== "production") {
    console.log(`[PERF] dashboardStats: ${(performance.now() - statsStart).toFixed(0)}ms`)
  }

  const pendingFee =
    Number(pendingFeeAmount._sum.totalAmount || 0) - Number(pendingFeeAmount._sum.paidAmount || 0)
  const attendanceRate =
    totalStudentsCount > 0 ? Math.round((todayAttendance / totalStudentsCount) * 100) : 0

  return {
    totalStudents,
    totalTeachers,
    totalParents,
    totalClasses,
    totalSections,
    todayAttendance,
    attendanceRate,
    totalStudentsCount,
    monthlyFeeCollection: Number(monthlyFeeCollection._sum.amount || 0),
    pendingFeeAmount: pendingFee,
    newAdmissions,
    pendingLeaveRequests,
    upcomingExams,
    teachersOnLeave,
    upcomingMeetings,
    unreadNotifications,
    timetableConflicts,
  }
}

export async function getStudentEnrollmentReport(
  schoolId: string,
  branchId?: string,
  academicSessionId?: string,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")
  const effectiveSchoolId = profile.role === "SUPER_ADMIN" ? schoolId : profile.schoolId!

  const enrollments = await prisma.studentEnrollment.groupBy({
    by: ["classId"],
    where: {
      student: { schoolId: effectiveSchoolId, ...(branchId && { branchId }) },
      ...(academicSessionId && { academicSessionId }),
    },
    _count: { id: true },
  })

  const classes = await prisma.class.findMany({
    where: { schoolId: effectiveSchoolId, ...(branchId && { branchId }) },
    select: { id: true, name: true },
  })

  const classMap = classes.reduce(
    (acc, c) => ({ ...acc, [c.id]: c.name }),
    {} as Record<string, string>,
  )

  return enrollments.map((e) => ({
    className: classMap[e.classId] || "Unknown",
    count: e._count.id,
  }))
}

export async function getAttendanceReport(
  schoolId: string,
  branchId?: string,
  fromDate?: string,
  toDate?: string,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")
  const effectiveSchoolId = profile.role === "SUPER_ADMIN" ? schoolId : profile.schoolId!

  const start = fromDate
    ? new Date(fromDate)
    : new Date(new Date().setDate(new Date().getDate() - 30))
  const end = toDate ? new Date(toDate) : new Date()

  const whereClause: any = {
    date: { gte: start, lte: end },
  }
  if (effectiveSchoolId) whereClause.class = { schoolId: effectiveSchoolId, ...(branchId && { branchId }) }

  const attendance = await prisma.studentAttendance.groupBy({
    by: ["date", "status"],
    where: whereClause,
    _count: { id: true },
    orderBy: { date: "asc" },
  })

  const grouped = attendance.reduce(
    (acc, a) => {
      const dateStr = a.date.toISOString().split("T")[0]
      if (!acc[dateStr]) acc[dateStr] = { date: dateStr, PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0 }
      const record = acc[dateStr]
      if (a.status === "PRESENT") record.PRESENT = a._count.id
      else if (a.status === "ABSENT") record.ABSENT = a._count.id
      else if (a.status === "LATE") record.LATE = a._count.id
      else if (a.status === "LEAVE") record.LEAVE = a._count.id
      return acc
    },
    {} as Record<
      string,
      { date: string; PRESENT: number; ABSENT: number; LATE: number; LEAVE: number }
    >,
  )

  return Object.values(grouped)
}

export async function getFeeCollectionReport(
  schoolId: string,
  branchId?: string,
  fromDate?: string,
  toDate?: string,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT")

  const start = fromDate
    ? new Date(fromDate)
    : new Date(new Date().setDate(new Date().getDate() - 30))
  const end = toDate ? new Date(toDate) : new Date()

  const payments = await prisma.payment.findMany({
    where: {
      paymentDate: { gte: start, lte: end },
      invoice: {
        student: {
          ...(profile.role === "SUPER_ADMIN" && branchId ? { branchId } : {}),
          ...(profile.role !== "SUPER_ADMIN" ? { schoolId: profile.schoolId! } : {}),
        },
      },
    },
    include: {
      invoice: {
        include: {
          student: { select: { firstName: true, lastName: true, admissionNo: true } },
        },
      },
    },
    orderBy: { paymentDate: "desc" },
  })

  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0)

  const byMode = payments.reduce<Record<string, number>>((acc, p) => {
    acc[p.paymentMode] = (acc[p.paymentMode] || 0) + Number(p.amount)
    return acc
  }, {})

  const byDate = payments.reduce<Record<string, number>>((acc, p) => {
    const dateStr = p.paymentDate.toISOString().split("T")[0]
    acc[dateStr] = (acc[dateStr] || 0) + Number(p.amount)
    return acc
  }, {})

  return {
    payments,
    totalCollected,
    byMode,
    byDate: Object.entries(byDate).map(([date, amount]) => ({ date, amount })),
  }
}

export async function getFeeDefaulterReport(schoolId: string, branchId?: string) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT")
  const effectiveSchoolId = profile.role === "SUPER_ADMIN" ? schoolId : profile.schoolId!

  const whereClause: any = {
    status: { in: ["PENDING", "PARTIAL"] },
    student: { schoolId: effectiveSchoolId, ...(branchId && { branchId }) },
  }

  const defaulters = await prisma.feeInvoice.findMany({
    where: whereClause,
    include: {
      student: {
        select: { id: true, firstName: true, lastName: true, admissionNo: true, phone: true },
      },
    },
    orderBy: { dueDate: "asc" },
  })

  return defaulters.map((d) => ({
    student: d.student,
    invoiceNumber: d.invoiceNumber,
    totalAmount: Number(d.totalAmount),
    paidAmount: Number(d.paidAmount),
    dueAmount: Number(d.totalAmount) - Number(d.paidAmount) + Number(d.lateFee),
    dueDate: d.dueDate,
    status: d.status,
    daysOverdue: Math.max(
      0,
      Math.ceil((new Date().getTime() - new Date(d.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
    ),
  }))
}

export async function getClassStrengthReport(
  schoolId: string,
  branchId?: string,
  academicSessionId?: string,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")
  const effectiveSchoolId = profile.role === "SUPER_ADMIN" ? schoolId : profile.schoolId!

  const whereClause: any = { schoolId: effectiveSchoolId }
  if (branchId) whereClause.branchId = branchId

  const classes = await prisma.class.findMany({
    where: whereClause,
    include: {
      sections: {
        include: {
          _count: {
            select: {
              enrollments: {
                where: {
                  status: "ACTIVE",
                  ...(academicSessionId && { academicSessionId }),
                },
              },
            },
          },
        },
      },
    },
    orderBy: { order: "asc" },
  })

  return classes.map((c) => ({
    className: c.name,
    sections: c.sections.map((s) => ({
      sectionName: s.name,
      studentCount: s._count.enrollments,
    })),
    totalStudents: c.sections.reduce((sum, s) => sum + s._count.enrollments, 0),
  }))
}

export async function getExamPerformanceReport(
  schoolId: string,
  branchId?: string,
  examId?: string,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER")
  const effectiveSchoolId = profile.role === "SUPER_ADMIN" ? schoolId : profile.schoolId!

  const whereClause: any = { schoolId: effectiveSchoolId }
  if (branchId) whereClause.branchId = branchId
  if (examId) whereClause.id = examId

  const exams = await prisma.exam.findMany({
    where: whereClause,
    include: {
      examType: true,
      class: true,
      subject: true,
      results: {
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { examDate: "desc" },
  })

  return exams.map((exam) => {
    const results = exam.results.filter((r) => r.marksObtained !== null)
    const totalStudents = results.length
    const passed = results.filter((r) => Number(r.marksObtained) >= exam.passingMarks).length
    const avgMarks =
      totalStudents > 0
        ? results.reduce((sum, r) => sum + Number(r.marksObtained), 0) / totalStudents
        : 0

    return {
      id: exam.id,
      name: exam.name,
      examType: exam.examType.name,
      className: exam.class.name,
      subject: exam.subject.name,
      totalMarks: exam.totalMarks,
      passingMarks: exam.passingMarks,
      totalStudents,
      passed,
      failed: totalStudents - passed,
      passRate: totalStudents > 0 ? (passed / totalStudents) * 100 : 0,
      avgMarks,
    }
  })
}

export async function getExpenseReport(
  schoolId: string,
  branchId?: string,
  fromDate?: string,
  toDate?: string,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT")
  const effectiveSchoolId = profile.role === "SUPER_ADMIN" ? schoolId : profile.schoolId!

  const start = fromDate
    ? new Date(fromDate)
    : new Date(new Date().setDate(new Date().getDate() - 30))
  const end = toDate ? new Date(toDate) : new Date()

  const expenses = await prisma.expense.findMany({
    where: {
      schoolId: effectiveSchoolId,
      expenseDate: { gte: start, lte: end },
      ...(branchId && { branchId }),
    },
    orderBy: { expenseDate: "desc" },
  })

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount)
    return acc
  }, {})

  const byDate = expenses.reduce<Record<string, number>>((acc, e) => {
    const dateStr = e.expenseDate.toISOString().split("T")[0]
    acc[dateStr] = (acc[dateStr] || 0) + Number(e.amount)
    return acc
  }, {})

  return {
    expenses,
    totalExpenses,
    byCategory,
    byDate: Object.entries(byDate).map(([date, amount]) => ({ date, amount })),
  }
}

export async function getIncomeVsExpenseReport(
  schoolId: string,
  branchId?: string,
  fromDate?: string,
  toDate?: string,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT")
  const effectiveSchoolId = profile.role === "SUPER_ADMIN" ? schoolId : profile.schoolId!

  const start = fromDate
    ? new Date(fromDate)
    : new Date(new Date().setFullYear(new Date().getFullYear() - 1))
  const end = toDate ? new Date(toDate) : new Date()

  const [payments, expenses] = await Promise.all([
    prisma.payment.findMany({
      where: {
        paymentDate: { gte: start, lte: end },
        ...(branchId && {
          invoice: { student: { branchId } },
        }),
        invoice: {
          student: {
            schoolId: effectiveSchoolId,
          },
        },
      },
      select: { amount: true, paymentDate: true },
    }),
    prisma.expense.findMany({
      where: {
        schoolId: effectiveSchoolId,
        expenseDate: { gte: start, lte: end },
        ...(branchId && { branchId }),
      },
      select: { amount: true, expenseDate: true },
    }),
  ])

  const monthlyData = payments.reduce<Record<string, { income: number; expense: number }>>(
    (acc, p) => {
      const month = p.paymentDate.toISOString().substring(0, 7)
      if (!acc[month]) acc[month] = { income: 0, expense: 0 }
      acc[month].income += Number(p.amount)
      return acc
    },
    {},
  )

  expenses.forEach((e) => {
    const month = e.expenseDate.toISOString().substring(0, 7)
    if (!monthlyData[month]) monthlyData[month] = { income: 0, expense: 0 }
    monthlyData[month].expense += Number(e.amount)
  })

  const sortedData = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data }))

  const totalIncome = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  return {
    data: sortedData,
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense,
  }
}

export async function getTeacherAttendanceReport(
  schoolId: string,
  branchId?: string,
  fromDate?: string,
  toDate?: string,
) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN")
  const effectiveSchoolId = profile.role === "SUPER_ADMIN" ? schoolId : profile.schoolId!

  const start = fromDate
    ? new Date(fromDate)
    : new Date(new Date().setDate(new Date().getDate() - 30))
  const end = toDate ? new Date(toDate) : new Date()

  const attendance = await prisma.staffAttendance.findMany({
    where: {
      staff: { schoolId: effectiveSchoolId, ...(branchId && { branchId }) },
      date: { gte: start, lte: end },
    },
    include: {
      staff: { select: { id: true, firstName: true, lastName: true, designation: true } },
    },
    orderBy: { date: "desc" },
  })

  return attendance
}
