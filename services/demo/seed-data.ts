/**
 * Seed data for a demo tenant.
 *
 * Covers the academic core of the plan's catalog (§17.1 and the academic portion of
 * §17.3): the school skeleton, the subject/class catalog, people, assignments,
 * a weekly timetable, and attendance.
 *
 * Phases A-F build the academic core (school, catalog, people, assignments,
 * timetable, attendance); G-L add homework, exams and report cards, fees, expenses,
 * the library, and id cards. Nothing from §17.3 is left unimplemented.
 *
 * Every insert is either scoped by `schoolId` or written with a slug-prefixed unique
 * value, because several of these tables have global unique indexes and no
 * `schoolId` column of their own. That is the whole reason `seed-values.ts` exists.
 *
 * IDs are generated up front with `crypto.randomUUID()` and then referenced
 * explicitly, so a phase can build child rows without re-reading what it just wrote.
 * That keeps the phases independent, which is what makes resume work.
 */

import { randomUUID } from "crypto"

import {
  DayOfWeek,
  FeeCategory,
  FeeFrequency,
  Gender,
  Grade,
  InvoiceStatus,
  ParentRelationship,
  PaymentMode,
  SubjectType,
} from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { Prng } from "./prng"
import { type SeedPhase } from "./seed-phases"
import type { SeedContext } from "./seed-runner"
import {
  BLOOD_GROUPS,
  FIRST_NAMES_FEMALE,
  FIRST_NAMES_MALE,
  LAST_NAMES,
  SUBJECT_NAMES,
  admissionNo,
  branchCode,
  branchEmail,
  cardNumber,
  className,
  employeeCode,
  invoiceNumber,
  isbn,
  profileEmail,
  receiptNumber,
  schoolCode,
  schoolName,
  sectionName,
} from "./seed-values"
import {
  ATTENDANCE_DAYS,
  ATTENDANCE_PRESENT_RATE,
  GRADES,
  SEED_VOLUMES,
  SECTIONS_PER_CLASS,
  type SeedVolume,
} from "./seed-config"

/**
 * Volumes live in `seed-config.ts` so `scripts/demo-verify.ts` can check the result
 * against the same numbers. Nothing below hardcodes a count.
 */
const volumes = Object.fromEntries(SEED_VOLUMES.map((v) => [v.table, v.count])) as Record<
  SeedVolume["table"],
  number
>

const { subject: SUBJECT_COUNT } = volumes
const { teacher: TEACHER_COUNT } = volumes
const { staff: STAFF_COUNT } = volumes
const { student: STUDENT_COUNT } = volumes
const { parent: PARENT_COUNT } = volumes

/** Electives, per the plan's catalog: taught from Grade 6 up. */
const LANGUAGE_SUBJECTS = new Set(["Urdu", "Spanish"])

const DAYS: DayOfWeek[] = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
]

/** Five 45-minute periods, seeded from a plausible start time. */
const PERIODS: Array<{ start: string; end: string }> = [
  { start: "08:00", end: "08:45" },
  { start: "08:50", end: "09:35" },
  { start: "09:40", end: "10:25" },
  { start: "10:45", end: "11:30" },
  { start: "11:35", end: "12:20" },
]

/** Everything a later phase needs from an earlier one, keyed by phase name. */
type Carry = {
  schoolId: string
  branchId: string
  sessionId: string
  classIds: string[]
  sectionIds: string[]
  subjectIds: string[]
  studentIds: string[]
  teacherIds: string[]
  /**
   * `Payment.recordedBy` and `Expense.recordedBy` are required FKs to `Profile`, so
   * finance needs a real staff profile to attribute to. Personas come later in Phase 5;
   * this is the underlying account, not a demo persona.
   */
  adminProfileId: string
}

const carry = new WeakMap<SeedContext, Carry>()

function stateOf(context: SeedContext): Carry {
  const value = carry.get(context)
  if (!value) throw new Error("Seed phases ran out of order: earlier state is missing")
  return value
}

/** The academic year containing `now`, so the demo always looks current. */
function academicYear(now: Date): { start: Date; end: Date; name: string } {
  const year = now.getUTCFullYear()
  // Starts in April: enough of the year has elapsed for term data to look plausible.
  return {
    start: new Date(Date.UTC(year, 3, 1)),
    end: new Date(Date.UTC(year + 1, 2, 31)),
    name: `${year}-${year + 1}`,
  }
}

/** Share of students who submit a given piece of homework. */
const SUBMISSION_RATE = 0.88
/** Share of a class's subjects that get a paper in a given term. */
const EXAM_SUBJECT_RATE = 0.7
const EXPENSES_PER_CATEGORY = 6
const LIBRARY_BOOK_COUNT = 40
const BOOK_ISSUES_PER_BOOK = 2

const GRADE_FEEDBACK = [
  "Well structured, keep it up.",
  "Good effort. Watch your signs.",
  "Careless arithmetic — please redo.",
  "Strong explanation of the method.",
] as const

const RESULT_REMARKS = [
  "Excellent performance",
  "Very good",
  "Satisfactory",
  "Needs improvement",
] as const

const PAYMENT_MODES = [
  PaymentMode.CASH,
  PaymentMode.ONLINE,
  PaymentMode.BANK_TRANSFER,
  PaymentMode.CHEQUE,
] as const

const EXPENSE_CATEGORIES = [
  "Salaries",
  "Utilities",
  "Maintenance",
  "Supplies",
  "Transport",
] as const

const EXPENSE_DESCRIPTIONS: Record<string, readonly string[]> = {
  Salaries: ["Staff payroll", "Temporary cover"],
  Utilities: ["Electricity bill", "Water bill", "Internet and phone"],
  Maintenance: ["Classroom repairs", "Furniture repair", "Painting"],
  Supplies: ["Stationery", "Laboratory chemicals", "Sports equipment"],
  Transport: ["Fuel", "Vehicle servicing", "Route maintenance"],
}

const LIBRARY_CATEGORIES = ["Fiction", "Science", "History", "Reference"] as const
const BOOK_TITLES_FALLBACK = "Fiction"
const BOOK_TITLES: Record<string, readonly string[]> = {
  Fiction: ["The Smallest Room", "A Year of Rain", "The Long Field", "Harbour Lights"],
  Science: ["Introduction to Physics", "Living Systems", "The Periodic Table", "Orbital Mechanics"],
  History: ["The Riverside Chronicle", "Ancient Trade Routes", "A Century of Borders"],
  Reference: ["Student Atlas", "Concise Encyclopedia", "World Almanac"],
}

/**
 * Letter grade from a percentage, cut at the boundaries the plan's §17.3 grade table
 * uses. Written as a descending ladder so the first matching band wins, which keeps
 * the cut-offs in one readable place instead of scattered through the seed.
 */
function gradeFor(percentage: number): Grade {
  if (percentage >= 90) return Grade.A_PLUS
  if (percentage >= 80) return Grade.A
  if (percentage >= 70) return Grade.B_PLUS
  if (percentage >= 60) return Grade.B
  if (percentage >= 50) return Grade.C_PLUS
  if (percentage >= 40) return Grade.C
  if (percentage >= 33) return Grade.D
  return Grade.F
}

function randomDateOfBirth(prng: Prng, grade: number): Date {
  // Older for higher grades, so a Grade 10 student reads as older than a Grade 1 one.
  const age = 5 + grade
  const year = new Date().getUTCFullYear() - age
  return new Date(Date.UTC(year, prng.int(0, 11), prng.int(1, 28)))
}

export const seedPhases: readonly SeedPhase<SeedContext>[] = [
  {
    // ── A. School skeleton ────────────────────────────────────────────────
    name: "school",
    weight: 0.1,
    run: async (context) => {
      const now = new Date()
      const year = academicYear(now)
      const schoolId = randomUUID()
      const branchId = randomUUID()
      const sessionId = randomUUID()

      await prisma.school.create({
        data: {
          id: schoolId,
          name: schoolName(context.prefix),
          code: schoolCode(context.prefix),
          // `School.email` is not in the plan's uniqueness table, so it only has to
          // differ from `Branch.email`. Indexed form, for exactly that reason.
          email: branchEmail(context.prefix, 0),
          phone: "+1-555-0100",
          address: "1 Riverside Way",
        },
      })
      carry.set(context, {
        schoolId,
        branchId,
        sessionId,
        classIds: [],
        sectionIds: [],
        subjectIds: [],
        studentIds: [],
        teacherIds: [],
        adminProfileId: "",
      })

      await prisma.branch.create({
        data: {
          id: branchId,
          schoolId,
          name: "Main Campus",
          code: branchCode(context.prefix, 1),
          // Exactly `branch.<slug>@demo.invalid`, as pinned by plan §11.2.
          email: branchEmail(context.prefix),
          address: "1 Riverside Way",
        },
      })

      await prisma.academicSession.create({
        data: {
          id: sessionId,
          schoolId,
          branchId,
          name: year.name,
          startDate: year.start,
          endDate: year.end,
          isCurrent: true,
        },
      })

      // The tenant now owns a school; record it so the request flow can find it.
      await prisma.demoTenant.update({
        where: { id: context.tenantId },
        data: { schoolId },
      })
    },
  },

  {
    // ── B. Catalog: subjects, classes, sections ──────────────────────────
    name: "catalog",
    weight: 0.15,
    run: async (context) => {
      const state = stateOf(context)
      const { prng } = context

      if (SUBJECT_NAMES.length < SUBJECT_COUNT) {
        throw new Error(
          `SUBJECT_NAMES has ${SUBJECT_NAMES.length} entries but the §17.2 volume is ${SUBJECT_COUNT}`,
        )
      }

      const subjects = SUBJECT_NAMES.slice(0, SUBJECT_COUNT).map((subject) => ({
        id: randomUUID(),
        schoolId: state.schoolId,
        branchId: state.branchId,
        name: subject.name,
        code: subject.code,
        // `SubjectType` is only CORE | ELECTIVE, so a language is an elective here.
        type: LANGUAGE_SUBJECTS.has(subject.name) ? SubjectType.ELECTIVE : SubjectType.CORE,
      }))

      await prisma.subject.createMany({ data: subjects })
      state.subjectIds = subjects.map((s) => s.id)

      // Nine core subjects per class; languages only from Grade 6 up, which is what
      // makes the catalog look like a real one rather than a uniform grid.
      const coreSubjects = subjects.filter((s) => s.type === SubjectType.CORE).slice(0, 9)

      const electiveSubjects = subjects.filter((s) => s.type === SubjectType.ELECTIVE)

      const classRows: Array<{ id: string; order: number; grade: number }> = []
      const sectionRows: Array<{
        id: string
        classId: string
        name: string
        capacity: number
      }> = []
      const classSubjectRows: Array<{ classId: string; subjectId: string }> = []

      for (let grade = 1; grade <= GRADES; grade++) {
        const classId = randomUUID()

        classRows.push({ id: classId, grade, order: grade })
        sectionRows.push(
          ...Array.from({ length: SECTIONS_PER_CLASS }, (_, index) => ({
            id: randomUUID(),
            classId,
            name: sectionName(index),
            capacity: 30,
          })),
        )

        for (const subject of coreSubjects) {
          classSubjectRows.push({ classId, subjectId: subject.id })
        }

        // Languages from Grade 6.
        if (grade >= 6) {
          for (const subject of electiveSubjects) {
            classSubjectRows.push({ classId, subjectId: subject.id })
          }
        }
      }

      await prisma.class.createMany({
        data: classRows.map((row) => ({
          id: row.id,
          schoolId: state.schoolId,
          branchId: state.branchId,
          name: className(row.grade),
          code: `G${String(row.grade).padStart(2, "0")}`,
          order: row.order,
        })),
      })

      await prisma.section.createMany({ data: sectionRows })
      await prisma.classSubject.createMany({ data: classSubjectRows })

      state.classIds = classRows.map((c) => c.id)
      state.sectionIds = sectionRows.map((s) => s.id)

      // Consume one draw so the stream stays aligned with later phases.
      void prng.next()
    },
  },

  {
    // ── C. People ─────────────────────────────────────────────────────────
    name: "people",
    weight: 0.3,
    run: async (context) => {
      const state = stateOf(context)
      const { prng, prefix } = context

      const pickName = () => {
        const male = prng.bool(0.5)
        const first = prng.pick(male ? FIRST_NAMES_MALE : FIRST_NAMES_FEMALE)
        return { first, last: prng.pick(LAST_NAMES), gender: male }
      }

      // Teachers, each with a Profile so teacher-portal scoping has something to
      // resolve. Profiles are created here rather than in Phase 5 because the
      // relational link is part of the teacher row, not a persona.
      // Teachers are seeded WITHOUT a `Profile`.
      //
      // `app/portal/teacher/page.tsx:59` resolves the teacher with
      // `prisma.teacher.findFirst({ where: { profileId: userId } })`, where `userId` is
      // the Supabase auth user's id. A `Profile` invented here would have a random UUID
      // that no auth user will ever have, so the persona provisioner would have to
      // either replace it or leave the portal resolving nothing. Leaving `profileId`
      // null and letting Phase 5 point it at a real auth user keeps one link and one
      // truth.
      const teachers = Array.from({ length: TEACHER_COUNT }, (_, index) => {
        const person = pickName()

        return {
          id: randomUUID(),
          schoolId: state.schoolId,
          branchId: state.branchId,
          employeeCode: employeeCode(prefix, index + 1),
          firstName: person.first,
          lastName: person.last,
          email: profileEmail(`teacher${index + 1}`, prefix),
          designation: index === 0 ? "Senior Teacher" : "Teacher",
          department: "Academics",
        }
      })

      await prisma.teacher.createMany({ data: teachers })
      state.teacherIds = teachers.map((t) => t.id)

      const staff = Array.from({ length: STAFF_COUNT }, (_, index) => {
        const person = pickName()
        return {
          id: randomUUID(),
          schoolId: state.schoolId,
          branchId: state.branchId,
          employeeCode: employeeCode(prefix, 100 + index),
          firstName: person.first,
          lastName: person.last,
          email: profileEmail(`staff${index + 1}`, prefix),
          department: index % 2 === 0 ? "Administration" : "Operations",
          designation: index === 0 ? "Principal" : "Staff",
        }
      })

      await prisma.staff.createMany({ data: staff })

      // An audit-attribution account, not a login.
      //
      // `Payment.recordedBy` and `Expense.recordedBy` are required FKs to `Profile`,
      // and the finance phases run before any persona exists, so something has to own
      // those rows. This profile is never an auth user; the ADMIN persona provisions
      // its own separate `Profile` in Phase 5.
      //
      // The email is deliberately `office+`, not `admin+`: `Profile.email` is globally
      // unique, and the ADMIN persona claims `admin+<slug>@demo.invalid`. Sharing the
      // address would make persona provisioning fail on a unique violation.
      const adminProfileId = randomUUID()
      await prisma.profile.create({
        data: {
          id: adminProfileId,
          schoolId: state.schoolId,
          branchId: state.branchId,
          role: "SCHOOL_ADMIN",
          firstName: "Office",
          lastName: "Account",
          email: profileEmail("office", prefix),
          phone: "+1-555-0101",
        },
      })
      state.adminProfileId = adminProfileId

      const students = Array.from({ length: STUDENT_COUNT }, (_, index) => {
        const person = pickName()
        const grade = (index % GRADES) + 1

        return {
          id: randomUUID(),
          schoolId: state.schoolId,
          branchId: state.branchId,
          admissionNo: admissionNo(prefix, index + 1),
          firstName: person.first,
          lastName: person.last,
          gender: person.gender ? Gender.MALE : Gender.FEMALE,
          dateOfBirth: randomDateOfBirth(prng, grade),
          bloodGroup: prng.pick(BLOOD_GROUPS),
          religion: "Islam",
          nationality: "Pakistani",
          address: `${prng.int(1, 200)} Riverside Lane`,
        }
      })

      await prisma.student.createMany({ data: students })
      state.studentIds = students.map((s) => s.id)

      // One parent per student, so the count matches §17.2's 60.
      const parents = Array.from({ length: PARENT_COUNT }, (_, index) => {
        const person = pickName()
        return {
          id: randomUUID(),
          schoolId: state.schoolId,
          firstName: person.first,
          lastName: person.last,
          email: profileEmail(`parent${index + 1}`, prefix),
          relationship: prng.bool(0.5) ? ParentRelationship.FATHER : ParentRelationship.MOTHER,
          phone: `+1-555-0${String(200 + index).padStart(3, "0")}`,
          isPrimary: true,
        }
      })

      await prisma.parent.createMany({ data: parents })

      await prisma.studentParent.createMany({
        data: students.map((student, index) => ({
          studentId: student.id,
          parentId: parents[index % parents.length].id,
        })),
      })
    },
  },

  {
    // ── D. Assignments and enrollments ───────────────────────────────────
    name: "assignments",
    weight: 0.15,
    run: async (context) => {
      const state = stateOf(context)
      const { prng } = context

      const classSubjects = await prisma.classSubject.findMany({
        where: { classId: { in: state.classIds } },
        select: { classId: true, subjectId: true },
      })

      const sectionsByClass = await prisma.section.findMany({
        where: { classId: { in: state.classIds } },
        select: { id: true, classId: true },
      })

      // One teacher per class-subject. A teacher may hold several; the unique index
      // on (teacher, class, section, subject, session) is what stops a double write.
      const rows: Array<{
        id: string
        teacherId: string
        classId: string
        sectionId: string
        subjectId: string
        academicSessionId: string
      }> = []

      for (const link of classSubjects) {
        const teacher = prng.pick(state.teacherIds)
        const sections = sectionsByClass.filter((s) => s.classId === link.classId)

        for (const section of sections) {
          rows.push({
            id: randomUUID(),
            teacherId: teacher,
            classId: link.classId,
            sectionId: section.id,
            subjectId: link.subjectId,
            academicSessionId: state.sessionId,
          })
        }
      }

      // Dedupe: the same teacher can land on the same class-subject twice by chance.
      const seen = new Set<string>()
      const unique = rows.filter((row) => {
        const key = `${row.teacherId}|${row.classId}|${row.sectionId}|${row.subjectId}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      await prisma.teacherAssignment.createMany({ data: unique })

      const students = await prisma.student.findMany({
        where: { id: { in: state.studentIds } },
        select: { id: true },
      })

      const allSections = await prisma.section.findMany({
        where: { id: { in: state.sectionIds } },
        select: { id: true, classId: true },
      })

      const enrollments = students.map((student, index) => {
        const section = allSections[index % allSections.length]
        return {
          id: randomUUID(),
          studentId: student.id,
          classId: section.classId,
          sectionId: section.id,
          academicSessionId: state.sessionId,
          rollNumber: String((index % 30) + 1).padStart(2, "0"),
        }
      })

      await prisma.studentEnrollment.createMany({ data: enrollments })
    },
  },

  {
    // ── E. Weekly timetable ───────────────────────────────────────────────
    name: "timetable",
    weight: 0.15,
    run: async (context) => {
      const state = stateOf(context)

      const classSubjects = await prisma.classSubject.findMany({
        where: { classId: { in: state.classIds } },
        select: { classId: true, subjectId: true },
      })

      const sections = await prisma.section.findMany({
        where: { id: { in: state.sectionIds } },
        select: { id: true, classId: true },
      })

      const subjectsByClass = new Map<string, string[]>()
      for (const link of classSubjects) {
        const list = subjectsByClass.get(link.classId) ?? []
        list.push(link.subjectId)
        subjectsByClass.set(link.classId, list)
      }

      const assignments = await prisma.teacherAssignment.findMany({
        where: { academicSessionId: state.sessionId },
        select: { teacherId: true, classId: true, sectionId: true, subjectId: true },
      })

      const teacherFor = new Map<string, string>()
      for (const row of assignments) {
        if (row.sectionId) teacherFor.set(`${row.sectionId}|${row.subjectId}`, row.teacherId)
      }

      const rows: Array<{
        schoolId: string
        branchId: string
        classId: string
        sectionId: string
        subjectId: string
        teacherId: string | null
        dayOfWeek: DayOfWeek
        startTime: string
        endTime: string
        room: string
        academicSessionId: string
      }> = []

      for (const section of sections) {
        const subjects = subjectsByClass.get(section.classId) ?? []
        if (subjects.length === 0) continue

        // A real timetable does not repeat the same subject every period.
        const rotation = context.prng.shuffle(subjects)

        DAYS.forEach((day, dayIndex) => {
          PERIODS.forEach((period, periodIndex) => {
            const subjectId = rotation[(dayIndex * PERIODS.length + periodIndex) % rotation.length]

            rows.push({
              schoolId: state.schoolId,
              branchId: state.branchId,
              classId: section.classId,
              sectionId: section.id,
              subjectId,
              teacherId: teacherFor.get(`${section.id}|${subjectId}`) ?? null,
              dayOfWeek: day,
              startTime: period.start,
              endTime: period.end,
              room: `R-${1 + (dayIndex % 8)}`,
              academicSessionId: state.sessionId,
            })
          })
        })
      }

      await prisma.timetable.createMany({ data: rows })
    },
  },

  {
    // ── F. Attendance ─────────────────────────────────────────────────────
    name: "attendance",
    weight: 0.15,
    run: async (context) => {
      const state = stateOf(context)
      const { prng } = context

      const enrollments = await prisma.studentEnrollment.findMany({
        where: { academicSessionId: state.sessionId },
        select: { studentId: true, classId: true, sectionId: true },
      })

      if (enrollments.length === 0) return

      // The teacher who marked a given class on a given day, so attendance is not
      // attributed to a random teacher.
      const assignments = await prisma.teacherAssignment.findMany({
        where: { academicSessionId: state.sessionId },
        select: { teacherId: true, classId: true, sectionId: true },
      })

      const markerFor = new Map<string, string>()
      for (const row of assignments) {
        if (row.sectionId) markerFor.set(row.sectionId, row.teacherId)
      }

      const rows: Array<{
        studentId: string
        classId: string
        sectionId: string | null
        academicSessionId: string
        date: Date
        status: "PRESENT" | "ABSENT" | "LATE"
        markedById: string
        remarks: string | null
      }> = []

      const today = new Date()
      // Walk backwards from today so the most recent days are populated.
      const dayOffsets: string[] = []
      for (let offset = 0; offset < ATTENDANCE_DAYS; offset++) {
        const date = new Date(today)
        date.setUTCDate(date.getUTCDate() - offset)
        // Skip weekends; a school with Sunday attendance looks wrong.
        if (date.getUTCDay() === 0 || date.getUTCDay() === 6) continue
        dayOffsets.push(date.toISOString().slice(0, 10))
      }

      for (const day of dayOffsets) {
        const date = new Date(`${day}T00:00:00.000Z`)

        for (const enrollment of enrollments) {
          const marker = enrollment.sectionId ? markerFor.get(enrollment.sectionId) : undefined

          if (!marker) continue

          // A unique index on (student, date, session) means each student gets one
          // row per day, so this must not fan out per section.
          if (prng.next() > ATTENDANCE_PRESENT_RATE) {
            rows.push({
              studentId: enrollment.studentId,
              classId: enrollment.classId,
              sectionId: enrollment.sectionId,
              academicSessionId: state.sessionId,
              date,
              status: prng.bool(0.8) ? "ABSENT" : "LATE",
              markedById: marker,
              remarks: null,
            })
            continue
          }

          if (prng.bool(0.04)) {
            rows.push({
              studentId: enrollment.studentId,
              classId: enrollment.classId,
              sectionId: enrollment.sectionId,
              academicSessionId: state.sessionId,
              date,
              status: "LATE",
              markedById: marker,
              remarks: "Bus delay",
            })
            continue
          }

          rows.push({
            studentId: enrollment.studentId,
            classId: enrollment.classId,
            sectionId: enrollment.sectionId,
            academicSessionId: state.sessionId,
            date,
            status: "PRESENT",
            markedById: marker,
            remarks: null,
          })
        }
      }

      // Dedupe defensively: one row per (student, date) is a hard unique index, and
      // an accidental duplicate would abort the whole insert.
      const seen = new Set<string>()
      const unique = rows.filter((row) => {
        const key = `${row.studentId}|${row.date.toISOString()}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      // Chunked: attendance is the largest insert in the seed, and a single
      // unbounded createMany can exceed the parameter limit.
      const CHUNK = 2000
      for (let i = 0; i < unique.length; i += CHUNK) {
        await prisma.studentAttendance.createMany({ data: unique.slice(i, i + CHUNK) })
      }
    },
  },

  {
    // ── G. Homework and submissions ───────────────────────────────────────
    name: "homework",
    weight: 0.1,
    run: async (context) => {
      const state = stateOf(context)
      const { prng } = context

      const assignments = await prisma.teacherAssignment.findMany({
        where: { academicSessionId: state.sessionId },
        select: { teacherId: true, classId: true, sectionId: true, subjectId: true },
      })

      const subjects = await prisma.subject.findMany({
        where: { id: { in: state.subjectIds } },
        select: { id: true, name: true },
      })
      const subjectName = new Map(subjects.map((s) => [s.id, s.name]))

      const homeworks: Array<{
        id: string
        schoolId: string
        branchId: string
        classId: string
        sectionId: string | null
        subjectId: string
        teacherId: string
        academicSessionId: string
        title: string
        description: string
        dueDate: Date
        totalMarks: number
      }> = []

      // One homework per class-subject, rather than per section, so a class shows a
      // plausible weekly load instead of a duplicated wall of tasks.
      const seen = new Set<string>()
      for (const row of assignments) {
        const key = `${row.classId}|${row.subjectId}`
        if (seen.has(key)) continue
        seen.add(key)

        const due = new Date()
        due.setUTCDate(due.getUTCDate() + prng.int(2, 10))

        homeworks.push({
          id: randomUUID(),
          schoolId: state.schoolId,
          branchId: state.branchId,
          classId: row.classId,
          sectionId: null,
          subjectId: row.subjectId,
          teacherId: row.teacherId,
          academicSessionId: state.sessionId,
          title: `${subjectName.get(row.subjectId) ?? "Homework"} practice set ${prng.int(1, 9)}`,
          description: "Complete the attached exercises. Show all working.",
          dueDate: due,
          totalMarks: 20,
        })
      }

      await prisma.homework.createMany({ data: homeworks })

      const enrollments = await prisma.studentEnrollment.findMany({
        where: { academicSessionId: state.sessionId },
        select: { studentId: true, classId: true },
      })

      const byClass = new Map<string, string[]>()
      for (const enrollment of enrollments) {
        const list = byClass.get(enrollment.classId) ?? []
        list.push(enrollment.studentId)
        byClass.set(enrollment.classId, list)
      }

      const submissions: Array<{
        id: string
        homeworkId: string
        studentId: string
        content: string
        marksObtained: number | null
        feedback: string | null
        status: string
        isLate: boolean
        submittedAt: Date
        gradedAt: Date | null
      }> = []

      for (const homework of homeworks) {
        const students = byClass.get(homework.classId) ?? []

        for (const studentId of students) {
          // Not everyone submits; a demo where 100% of work is handed in hides the
          // "missing" and "late" states the UI has to render.
          if (prng.next() > SUBMISSION_RATE) continue

          const late = prng.bool(0.12)
          const submittedAt = new Date()
          submittedAt.setUTCDate(submittedAt.getUTCDate() - (late ? -1 : prng.int(1, 5)))

          // A submitted-but-unmarked set is the common real state, so leave most
          // ungraded rather than marking everything.
          const graded = prng.bool(0.6)

          submissions.push({
            id: randomUUID(),
            homeworkId: homework.id,
            studentId,
            content: "Submitted. Please check my working in question 3.",
            marksObtained: graded ? prng.int(10, 20) : null,
            feedback: graded ? prng.pick(GRADE_FEEDBACK) : null,
            status: "SUBMITTED",
            isLate: late,
            submittedAt,
            gradedAt: graded ? submittedAt : null,
          })
        }
      }

      const CHUNK = 2000
      for (let i = 0; i < submissions.length; i += CHUNK) {
        await prisma.homeworkSubmission.createMany({ data: submissions.slice(i, i + CHUNK) })
      }
    },
  },

  {
    // ── H. Exams, results, report cards ───────────────────────────────────
    name: "exams",
    weight: 0.15,
    run: async (context) => {
      const state = stateOf(context)
      const { prng } = context

      const examTypes = [
        { name: "First Term", weight: 40 },
        { name: "Mid Term", weight: 30 },
        { name: "Final Term", weight: 30 },
      ].map((type) => ({
        id: randomUUID(),
        schoolId: state.schoolId,
        branchId: state.branchId,
        ...type,
        description: `${type.name} examination`,
      }))

      await prisma.examType.createMany({ data: examTypes })

      const classSubjects = await prisma.classSubject.findMany({
        where: { classId: { in: state.classIds } },
        select: { classId: true, subjectId: true },
      })

      const subjects = await prisma.subject.findMany({
        where: { id: { in: state.subjectIds } },
        select: { id: true, name: true },
      })
      const subjectName = new Map(subjects.map((s) => [s.id, s.name]))

      const exams: Array<{
        id: string
        schoolId: string
        branchId: string
        examTypeId: string
        classId: string
        subjectId: string
        academicSessionId: string
        name: string
        totalMarks: number
        passingMarks: number
        examDate: Date
        startTime: string
        endTime: string
        isPublished: boolean
      }> = []

      const schedules: Array<{
        id: string
        examId: string
        room: string
        date: Date
        startTime: string
        endTime: string
      }> = []

      // Only the first term is marked and published. Unpublished later terms are the
      // realistic state and stop the results pages looking fully settled.
      const [firstTerm] = examTypes

      for (const type of examTypes) {
        const marked = type.id === firstTerm?.id

        for (const link of classSubjects) {
          // A random slice of each class is examined; not every subject has a paper
          // in every term.
          if (prng.next() > EXAM_SUBJECT_RATE) continue

          const examId = randomUUID()
          const examDate = new Date()
          examDate.setUTCDate(
            examDate.getUTCDate() - (marked ? prng.int(10, 30) : prng.int(30, 120)),
          )

          const exam = {
            id: examId,
            schoolId: state.schoolId,
            branchId: state.branchId,
            examTypeId: type.id,
            classId: link.classId,
            subjectId: link.subjectId,
            academicSessionId: state.sessionId,
            name: `${type.name} — ${subjectName.get(link.subjectId) ?? "Subject"}`,
            totalMarks: 100,
            passingMarks: 40,
            examDate,
            startTime: "09:00",
            endTime: "11:00",
            isPublished: marked,
          }

          exams.push(exam)
          schedules.push({
            id: randomUUID(),
            examId,
            room: `Hall ${1 + prng.int(0, 3)}`,
            date: examDate,
            startTime: exam.startTime,
            endTime: exam.endTime,
          })
        }
      }

      await prisma.exam.createMany({ data: exams })
      await prisma.examSchedule.createMany({ data: schedules })

      const enrollments = await prisma.studentEnrollment.findMany({
        where: { academicSessionId: state.sessionId },
        select: { studentId: true, classId: true },
      })
      const byClass = new Map<string, string[]>()
      for (const enrollment of enrollments) {
        const list = byClass.get(enrollment.classId) ?? []
        list.push(enrollment.studentId)
        byClass.set(enrollment.classId, list)
      }

      const teachers = await prisma.teacher.findMany({
        where: { id: { in: state.teacherIds } },
        select: { id: true },
      })
      const markers = teachers.map((t) => t.id)

      const results: Array<{
        id: string
        examId: string
        studentId: string
        marksObtained: number
        grade: Grade
        remarks: string
        // Optional in the schema; null when no teacher was available to attribute to.
        gradedBy: string | null
        gradedAt: Date
      }> = []

      const reportCards: Array<{
        id: string
        studentId: string
        examId: string
        academicSessionId: string
        totalMarks: number
        obtainedMarks: number
        percentage: number
        grade: Grade
        rank: number
        isPublished: boolean
        publishedAt: Date | null
      }> = []

      for (const exam of exams) {
        const students = byClass.get(exam.classId) ?? []
        const graded = exam.isPublished
        const marker = markers.length > 0 ? prng.pick(markers) : null

        // Per-student totals are accumulated so a report card is a real aggregate of
        // that student's exams rather than a copy of one exam's number.
        const earned = new Map<string, number>()
        const possible = new Map<string, number>()

        for (const studentId of students) {
          if (!graded) continue

          // A spread of results, centred well above the pass mark, so grades look like
          // a real class rather than a uniform pass.
          const marks = Math.min(100, Math.max(18, Math.round(prng.normal(72, 14))))

          results.push({
            id: randomUUID(),
            examId: exam.id,
            studentId,
            marksObtained: marks,
            grade: gradeFor(marks),
            remarks: prng.pick(RESULT_REMARKS),
            gradedBy: marker,
            gradedAt: exam.examDate ?? new Date(),
          })

          earned.set(studentId, (earned.get(studentId) ?? 0) + marks)
          possible.set(studentId, (possible.get(studentId) ?? 0) + exam.totalMarks)
        }

        if (!graded) continue

        // Rank within this exam. Ties share a rank, which is what a real results
        // sheet does.
        const ranking = [...earned.entries()]
          .map(([studentId, marks]) => ({ studentId, marks }))
          .sort((a, b) => b.marks - a.marks)

        let lastMarks = -1
        let lastRank = 0

        ranking.forEach((entry, index) => {
          const total = possible.get(entry.studentId) ?? exam.totalMarks
          const percentage = total === 0 ? 0 : (entry.marks / total) * 100
          const rank = entry.marks === lastMarks ? lastRank : index + 1

          reportCards.push({
            id: randomUUID(),
            studentId: entry.studentId,
            examId: exam.id,
            academicSessionId: state.sessionId,
            totalMarks: total,
            obtainedMarks: entry.marks,
            percentage: Math.round(percentage * 100) / 100,
            grade: gradeFor(percentage),
            rank,
            isPublished: true,
            publishedAt: exam.examDate ?? new Date(),
          })

          lastMarks = entry.marks
          lastRank = rank
        })
      }

      const CHUNK = 2000
      for (let i = 0; i < results.length; i += CHUNK) {
        await prisma.examResult.createMany({ data: results.slice(i, i + CHUNK) })
      }
      for (let i = 0; i < reportCards.length; i += CHUNK) {
        await prisma.reportCard.createMany({ data: reportCards.slice(i, i + CHUNK) })
      }
    },
  },

  {
    // ── I. Fees, invoices, payments ───────────────────────────────────────
    name: "fees",
    weight: 0.15,
    run: async (context) => {
      const state = stateOf(context)
      const { prng, prefix } = context

      const structures = [
        {
          name: "Tuition Fee",
          amount: 25000,
          category: FeeCategory.TUITION,
          frequency: FeeFrequency.MONTHLY,
        },
        {
          name: "Admission Fee",
          amount: 15000,
          category: FeeCategory.ADMISSION,
          frequency: FeeFrequency.ONE_TIME,
        },
        {
          name: "Library Fee",
          amount: 2000,
          category: FeeCategory.LIBRARY,
          frequency: FeeFrequency.YEARLY,
        },
        {
          name: "Sports Fee",
          amount: 3000,
          category: FeeCategory.SPORTS,
          frequency: FeeFrequency.YEARLY,
        },
      ].map((structure) => ({
        id: randomUUID(),
        schoolId: state.schoolId,
        branchId: state.branchId,
        ...structure,
      }))

      await prisma.feeStructure.createMany({ data: structures })

      const students = await prisma.student.findMany({
        where: { id: { in: state.studentIds } },
        select: { id: true },
      })

      // Every student is on tuition and library; a few also carry the one-time and
      // optional fees, which keeps the invoice totals varied.
      const plans: Array<{
        id: string
        studentId: string
        feeStructureId: string
        academicSessionId: string
        discountType: string | null
        discountValue: number | null
      }> = []

      for (const student of students) {
        const [tuition, admission, library, sports] = structures
        if (!tuition || !admission || !library || !sports) continue

        const siblingDiscount = prng.bool(0.15)

        plans.push(
          {
            id: randomUUID(),
            studentId: student.id,
            feeStructureId: tuition.id,
            academicSessionId: state.sessionId,
            discountType: siblingDiscount ? "PERCENT" : null,
            discountValue: siblingDiscount ? 10 : null,
          },
          {
            id: randomUUID(),
            studentId: student.id,
            feeStructureId: admission.id,
            academicSessionId: state.sessionId,
            discountType: null,
            discountValue: null,
          },
          {
            id: randomUUID(),
            studentId: student.id,
            feeStructureId: library.id,
            academicSessionId: state.sessionId,
            discountType: null,
            discountValue: null,
          },
        )

        if (prng.bool(0.5)) {
          plans.push({
            id: randomUUID(),
            studentId: student.id,
            feeStructureId: sports.id,
            academicSessionId: state.sessionId,
            discountType: null,
            discountValue: null,
          })
        }
      }

      await prisma.studentFeePlan.createMany({ data: plans })

      // Annotated `string` keys: Prisma types generated `id` as a UUID template
      // literal, which would make `get(plan.feeStructureId)` a type error.
      const amountById = new Map<string, number>(
        structures.map((s) => [s.id, s.amount] as [string, number]),
      )

      const invoices: Array<{
        id: string
        studentId: string
        academicSessionId: string
        invoiceNumber: string
        invoiceDate: Date
        dueDate: Date
        totalAmount: number
        discountAmount: number
        paidAmount: number
        status: InvoiceStatus
        lateFee: number
        notes: string | null
      }> = []

      const items: Array<{
        id: string
        invoiceId: string
        feeStructureId: string
        amount: number
      }> = []

      const payments: Array<{
        id: string
        invoiceId: string
        receiptNumber: string
        amount: number
        paymentDate: Date
        paymentMode: PaymentMode
        referenceNumber: string | null
        notes: string | null
        recordedBy: string
      }> = []

      // Named `*Seq` so the imported `invoiceNumber`/`receiptNumber` generators stay
      // callable; the counters shadow them otherwise.
      let invoiceSeq = 0
      let receiptSeq = 0

      for (const student of students) {
        const studentPlans = plans.filter((p) => p.studentId === student.id)
        if (studentPlans.length === 0) continue

        const total = studentPlans.reduce(
          (sum, plan) => sum + (amountById.get(plan.feeStructureId) ?? 0),
          0,
        )

        const discount = studentPlans.reduce((sum, plan) => {
          if (plan.discountType !== "PERCENT" || !plan.discountValue) return sum
          const base = amountById.get(plan.feeStructureId) ?? 0
          return sum + (base * plan.discountValue) / 100
        }, 0)

        const payable = Math.max(0, total - discount)
        invoiceSeq += 1

        const invoiceId = randomUUID()
        const invoiceDate = new Date()
        invoiceDate.setUTCDate(invoiceDate.getUTCDate() - prng.int(20, 70))
        const dueDate = new Date(invoiceDate)
        dueDate.setUTCDate(dueDate.getUTCDate() + 14)

        for (const plan of studentPlans) {
          items.push({
            id: randomUUID(),
            invoiceId,
            feeStructureId: plan.feeStructureId,
            amount: amountById.get(plan.feeStructureId) ?? 0,
          })
        }

        // Payment states are spread so the fee screens show PAID, PARTIAL, PENDING,
        // and OVERDUE rather than one uniform column.
        const roll = prng.next()
        const overdue = invoiceDate < new Date() && dueDate < new Date()

        let status: InvoiceStatus
        let paid: number

        if (roll < 0.55) {
          status = InvoiceStatus.PAID
          paid = payable
        } else if (roll < 0.75) {
          status = InvoiceStatus.PARTIAL
          paid = Math.round(payable * 0.5)
        } else if (overdue) {
          status = InvoiceStatus.OVERDUE
          paid = 0
        } else {
          status = InvoiceStatus.PENDING
          paid = 0
        }

        const lateFee = status === InvoiceStatus.OVERDUE ? 500 : 0

        invoices.push({
          id: invoiceId,
          studentId: student.id,
          academicSessionId: state.sessionId,
          invoiceNumber: invoiceNumber(prefix, invoiceSeq),
          invoiceDate,
          dueDate,
          totalAmount: total,
          discountAmount: discount,
          paidAmount: paid,
          status,
          lateFee,
          notes: null,
        })

        if (paid > 0) {
          const paymentDate = new Date(invoiceDate)
          paymentDate.setUTCDate(paymentDate.getUTCDate() + prng.int(1, 12))
          receiptSeq += 1

          payments.push({
            id: randomUUID(),
            invoiceId,
            receiptNumber: receiptNumber(prefix, receiptSeq),
            amount: paid,
            paymentDate,
            paymentMode: prng.pick(PAYMENT_MODES),
            referenceNumber: prng.bool(0.5) ? `TRX-${prefix.toUpperCase()}-${receiptSeq}` : null,
            notes: null,
            recordedBy: state.adminProfileId,
          })
        }
      }

      await prisma.feeInvoice.createMany({ data: invoices })

      const CHUNK = 2000
      for (let i = 0; i < items.length; i += CHUNK) {
        await prisma.feeInvoiceItem.createMany({ data: items.slice(i, i + CHUNK) })
      }
      for (let i = 0; i < payments.length; i += CHUNK) {
        await prisma.payment.createMany({ data: payments.slice(i, i + CHUNK) })
      }
    },
  },

  {
    // ── J. Expenses ───────────────────────────────────────────────────────
    name: "expenses",
    weight: 0.05,
    run: async (context) => {
      const state = stateOf(context)
      const { prng } = context

      const expenses: Array<{
        id: string
        schoolId: string
        branchId: string
        category: string
        amount: number
        description: string
        expenseDate: Date
        recordedBy: string
      }> = []

      for (const category of EXPENSE_CATEGORIES) {
        for (let i = 0; i < EXPENSES_PER_CATEGORY; i++) {
          const date = new Date()
          date.setUTCDate(date.getUTCDate() - prng.int(1, 90))

          expenses.push({
            id: randomUUID(),
            schoolId: state.schoolId,
            branchId: state.branchId,
            category,
            amount: prng.int(2000, 60000),
            description: prng.pick(EXPENSE_DESCRIPTIONS[category] ?? [category]),
            expenseDate: date,
            recordedBy: state.adminProfileId,
          })
        }
      }

      await prisma.expense.createMany({ data: expenses })
    },
  },

  {
    // ── K. Library ────────────────────────────────────────────────────────
    name: "library",
    weight: 0.05,
    run: async (context) => {
      const state = stateOf(context)
      const { prng, prefix } = context

      const books: Array<{
        id: string
        schoolId: string
        branchId: string
        title: string
        author: string
        isbn: string
        publisher: string
        category: string
        quantity: number
        available: number
        location: string
      }> = []

      for (let i = 1; i <= LIBRARY_BOOK_COUNT; i++) {
        const category = prng.pick(LIBRARY_CATEGORIES)
        const titles = BOOK_TITLES[category] ?? BOOK_TITLES[BOOK_TITLES_FALLBACK]
        const quantity = prng.int(1, 4)

        books.push({
          id: randomUUID(),
          schoolId: state.schoolId,
          branchId: state.branchId,
          title: prng.pick(titles),
          author: prng.pick(LAST_NAMES),
          isbn: isbn(prefix, i),
          publisher: "Riverside Academic Press",
          category,
          quantity,
          // Copies already on loan are subtracted so `available` agrees with the issue
          // rows written below, rather than being a decorative number.
          available: quantity,
          location: `${prng.pick(["A", "B", "C"])}-${prng.int(1, 12)}`,
        })
      }

      await prisma.libraryBook.createMany({ data: books })

      const students = await prisma.student.findMany({
        where: { id: { in: state.studentIds } },
        select: { id: true },
      })

      const issues: Array<{
        id: string
        bookId: string
        studentId: string
        issueDate: Date
        dueDate: Date
        returnDate: Date | null
        fineAmount: number
        finePaid: boolean
        status: string
        notes: string | null
      }> = []

      // Decrement the real counters rather than guessing, so the availability column
      // and the issue rows cannot disagree.
      const onLoan = new Map<string, number>()

      for (const book of books) {
        for (let i = 0; i < BOOK_ISSUES_PER_BOOK; i++) {
          if ((onLoan.get(book.id) ?? 0) >= book.quantity) break

          const student = prng.pick(students)
          if (!student) break

          const issueDate = new Date()
          issueDate.setUTCDate(issueDate.getUTCDate() - prng.int(5, 80))
          const dueDate = new Date(issueDate)
          dueDate.setUTCDate(dueDate.getUTCDate() + 14)

          const returned = prng.bool(0.7)
          const returnDate = new Date(issueDate)
          returnDate.setUTCDate(returnDate.getUTCDate() + prng.int(2, 20))
          const overdue = !returned && returnDate < new Date()
          const fine = overdue
            ? 100 * Math.max(1, Math.round((new Date().getTime() - dueDate.getTime()) / 86400000))
            : 0

          issues.push({
            id: randomUUID(),
            bookId: book.id,
            studentId: student.id,
            issueDate,
            dueDate,
            returnDate: returned ? returnDate : null,
            fineAmount: fine,
            finePaid: fine > 0 ? prng.bool(0.5) : false,
            status: returned ? "RETURNED" : overdue ? "OVERDUE" : "ISSUED",
            notes: null,
          })

          if (!returned) onLoan.set(book.id, (onLoan.get(book.id) ?? 0) + 1)
        }
      }

      for (const book of books) {
        const borrowed = onLoan.get(book.id) ?? 0
        if (borrowed === 0) continue

        await prisma.libraryBook.update({
          where: { id: book.id },
          data: { available: book.quantity - borrowed },
        })
      }

      await prisma.bookIssue.createMany({ data: issues })
    },
  },

  {
    // ── L. Id cards ───────────────────────────────────────────────────────
    name: "idcards",
    weight: 0.05,
    run: async (context) => {
      const state = stateOf(context)
      const { prefix } = context

      // `IdCard.profileId` is unique, so only the profiles that exist can be issued
      // for. Students have no Profile rows in this seed (Phase 5 creates them), so
      // cards are issued for the staff and teacher profiles this seed did create.
      const profiles = await prisma.profile.findMany({
        where: { schoolId: state.schoolId },
        select: { id: true, role: true },
      })

      const cards = profiles.map((profile, index) => ({
        id: randomUUID(),
        profileId: profile.id,
        schoolId: state.schoolId,
        branchId: state.branchId,
        cardRole: profile.role,
        cardNumber: cardNumber(prefix, index + 1),
        // Hashed, not raw: the verification route compares a hash, and storing the
        // token in plaintext would let anyone read it out of the database.
        qrTokenHash: randomUUID(),
        issuedAt: new Date(),
        expiresAt: new Date(new Date().getFullYear() + 2, 0, 1),
      }))

      await prisma.idCard.createMany({ data: cards })
    },
  },

  {
    // ── M. Personas ───────────────────────────────────────────────────────
    //
    // Runs last, and separately from the data phases, because it is the only phase
    // that talks to Supabase Auth rather than the database. Keeping it out of the
    // `seedPhases` list means `scripts/demo-seed.ts` can seed a database without
    // creating auth users, and lets the provisioner be re-run on its own after a
    // credential problem.
    name: "personas",
    weight: 0.1,
    runsOutOfBand: true,
    run: async (context) => {
      const { provisionPersonas } = await import("@/lib/demo/personas")

      const result = await provisionPersonas(context.tenantId)

      const failed = result.personas.filter((p) => !p.isReady)
      if (failed.length > 0) {
        throw new Error(`Personas not ready: ${failed.map((p) => p.personaType).join(", ")}`)
      }
    },
  },
]

/** Phase names, for the runner and for reports. */
export const SEED_PHASE_NAMES = seedPhases.map((phase) => phase.name)
