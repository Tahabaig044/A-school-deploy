/**
 * Seed volumes from the plan's §17.2 table, in one place.
 *
 * Pure: no Prisma, no env. `seed-data.ts` reads these to decide how much to create,
 * and `scripts/demo-verify.ts` reads the same numbers to check the result. Duplicating
 * the figures would let the check drift from what the seed actually writes, which is
 * the specific failure this module exists to prevent.
 *
 * Each entry names the table it governs, because the verifier matches on it.
 */

export type SeedVolume = {
  /** Table the count applies to, e.g. `student`. */
  table: string
  /** Rows the seed intends to create. */
  count: number
  /**
   * Accepted deviation for hand-edited demo data. Demo tenants are meant to be poked at
   * by reviewers, so an exact-equality gate would fail the first time someone deletes a
   * row on purpose.
   */
  tolerance: number
  /** Human label for reports. */
  label: string
}

/** §17.2 volumes for the DEMO plan, plus the academic scaffolding they imply. */
export const SEED_VOLUMES: readonly SeedVolume[] = [
  { table: "school", count: 1, tolerance: 0, label: "schools" },
  { table: "branch", count: 1, tolerance: 0, label: "branches" },
  { table: "academicSession", count: 1, tolerance: 0, label: "academic sessions" },
  { table: "subject", count: 11, tolerance: 0, label: "subjects" },
  { table: "class", count: 10, tolerance: 0, label: "classes" },
  { table: "section", count: 20, tolerance: 0, label: "sections" },
  { table: "teacher", count: 8, tolerance: 1, label: "teachers" },
  { table: "staff", count: 12, tolerance: 1, label: "staff" },
  { table: "student", count: 60, tolerance: 2, label: "students" },
  { table: "parent", count: 60, tolerance: 2, label: "parents" },

  // Later domains. The `count` is the floor the seed always produces; the fee and
  // library rows vary by design (a student may or may not be enrolled in a fee
  // structure, a book may not be on loan), which is why their tolerance is wider.
  { table: "examType", count: 3, tolerance: 0, label: "exam types" },
  // One per class-subject: GRADES x 9 core, plus languages from Grade 6. Tracks the
  // subject catalog rather than a literal, hence the slack.
  { table: "homework", count: 100, tolerance: 5, label: "homework" },
  { table: "feeStructure", count: 4, tolerance: 0, label: "fee structures" },
  { table: "feeInvoice", count: 60, tolerance: 2, label: "fee invoices" },
  { table: "expense", count: 30, tolerance: 2, label: "expenses" },
  { table: "libraryBook", count: 40, tolerance: 0, label: "library books" },
  // One per staff/teacher profile. Student profiles arrive in Phase 5, which will
  // raise this; the tolerance covers both states.
  // Cards are issued per Profile. Phase 5 removed the placeholder teacher Profiles
  // (they could never match an auth user id), so the data seed now creates exactly
  // one Profile: the school admin. Real persona Profiles arrive in Phase 5, which
  // issues their cards at the same time. A wide tolerance here would let the check
  // pass no matter what the phase did, so it stays tight.
  { table: "idCard", count: 1, tolerance: 0, label: "id cards" },
]

/** Attendance days generated per student (§17.3: 60 students x 45 weekdays). */
export const ATTENDANCE_DAYS = 45

/** Share of attendance records expected to be PRESENT, with a little slack. */
export const ATTENDANCE_PRESENT_RATE = 0.92
export const ATTENDANCE_PRESENT_TOLERANCE = 0.05

/** Grades, sections per class, and the volumes above. */
export const GRADES = 10
export const SECTIONS_PER_CLASS = 2
