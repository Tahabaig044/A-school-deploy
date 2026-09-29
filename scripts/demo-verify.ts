/**
 * Verifies the demo subsystem's invariants against a live database.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/demo-verify.ts
 *   npx tsx --env-file=.env scripts/demo-verify.ts --slug <slug>
 *   npx tsx --env-file=.env scripts/demo-verify.ts --slug <slug> --strict
 *
 * Exits 0 when every check passes or is skipped, 1 on any failure. This makes it
 * usable both as a human tool and as a CI gate once a demo tenant exists.
 *
 * Checks are grouped by the phase that introduces them so it is obvious which ones
 * are expected to be skipped early on. See docs/DEMO_TRIAL_SYSTEM_PLAN.md §24.2.
 */

import { Prisma, PrismaClient } from "../lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

import { PLAN_CATALOG } from "../lib/demo/plans"
import { toCodePrefix } from "../lib/demo/slug"
import {
  ATTENDANCE_DAYS,
  ATTENDANCE_PRESENT_RATE,
  ATTENDANCE_PRESENT_TOLERANCE,
  SEED_VOLUMES,
} from "../services/demo/seed-config"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

type Status = "PASS" | "FAIL" | "SKIP"

interface CheckResult {
  id: string
  title: string
  status: Status
  detail: string
}

const results: CheckResult[] = []

function pass(id: string, title: string, detail = "") {
  results.push({ id, title, status: "PASS", detail })
}

function fail(id: string, title: string, detail: string) {
  results.push({ id, title, status: "FAIL", detail })
}

function skip(id: string, title: string, detail: string) {
  results.push({ id, title, status: "SKIP", detail })
}

const args = process.argv.slice(2)
const strict = args.includes("--strict")
const slugIndex = args.indexOf("--slug")
const slug = slugIndex >= 0 ? args[slugIndex + 1] : undefined

// ─── Preflight ─────────────────────────────────────────────────────────────

/**
 * The demo tables only exist after `prisma db push`. Checking first turns a wall of
 * Prisma stack traces into one actionable line.
 */
async function preflight(): Promise<boolean> {
  const required = [
    "plans",
    "plan_limits",
    "demo_tenants",
    "demo_personas",
    "demo_events",
    "demo_extension_requests",
  ]

  const rows = await prisma.$queryRaw<{ table_name: string }[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (${Prisma.join(required)})
  `

  const present = new Set(rows.map((r) => r.table_name))
  const missing = required.filter((t) => !present.has(t))

  if (missing.length === 0) return true

  console.error("Missing tables: " + missing.join(", "))
  console.error("\nThe demo schema has not been applied to this database. Run:")
  console.error("  npm run db:generate")
  console.error("  npm run db:push")
  console.error(
    "\nBecause there is no prisma/migrations/ directory, db push rebuilds and " +
      "reorders tables when a relation's cardinality changes. Take a pg_dump first.",
  )
  return false
}

// ─── Phase 1 checks: schema and plan integrity ─────────────────────────────

async function checkPlanCatalog() {
  for (const def of PLAN_CATALOG) {
    const plan = await prisma.plan.findUnique({
      where: { key: def.key },
      include: { limits: true },
    })

    if (!plan) {
      fail("1.1", `plan ${def.key} exists`, "not found — run scripts/seed-plans.ts")
      continue
    }

    if (plan.limits.length === 0) {
      fail("1.2", `plan ${def.key} has limits`, "no PlanLimit rows")
      continue
    }

    const catalogKeys = new Set(def.limits.map((l) => l.key))
    const dbKeys = new Set(plan.limits.map((l) => l.key))
    const missing = [...catalogKeys].filter((k) => !dbKeys.has(k))
    const extra = [...dbKeys].filter((k) => !catalogKeys.has(k))

    if (missing.length > 0) {
      fail("1.2", `plan ${def.key} has limits`, `missing keys: ${missing.join(", ")}`)
    } else if (extra.length > 0) {
      skip("1.2", `plan ${def.key} has limits`, `extra operator-added keys: ${extra.join(", ")}`)
    } else {
      pass("1.2", `plan ${def.key} has limits`, `${plan.limits.length} limits`)
    }
  }
}

async function checkPublicPlans() {
  const publicPlans = await prisma.plan.findMany({ where: { isPublic: true, isActive: true } })
  const keys = publicPlans.map((p) => p.key).sort()
  const expected = PLAN_CATALOG.filter((p) => p.isPublic)
    .map((p) => p.key)
    .sort()

  if (keys.length === 0) {
    fail("1.3", "at least one public plan is selectable", "none — /demo would render empty")
    return
  }

  if (JSON.stringify(keys) !== JSON.stringify(expected)) {
    skip(
      "1.3",
      "public plan set matches catalog",
      `db=${keys.join(",")} catalog=${expected.join(",")}`,
    )
    return
  }

  pass("1.3", "public plan set matches catalog", keys.join(", "))

  if (keys.includes("TRIAL_PRO")) {
    fail(
      "1.4",
      "TRIAL_PRO is not publicly selectable",
      "TRIAL_PRO requires per-user passwords and must never be selectable from /demo",
    )
  } else {
    pass("1.4", "TRIAL_PRO is not publicly selectable")
  }
}

async function checkUnlimitedSentinel() {
  const bad = await prisma.planLimit.findMany({
    where: { limitValue: { lt: -1 } },
    select: { key: true, planId: true, limitValue: true },
  })

  if (bad.length > 0) {
    fail(
      "1.5",
      "no limit uses a value below the -1 unlimited sentinel",
      `${bad.length} row(s): ${bad.map((b) => b.key).join(", ")}`,
    )
  } else {
    pass("1.5", "no limit uses a value below the -1 unlimited sentinel")
  }
}

// ─── Global uniqueness: the highest-risk check in the plan ─────────────────

/**
 * The schema has globally-unique columns (not tenant-scoped). Two concurrent demo
 * tenants seeding naive values would collide here, so this scans the whole
 * database rather than a single tenant.
 */
async function checkGlobalUniqueness() {
  const duplicates: { column: string; value: string; count: number }[] = []

  const targets: {
    column: string
    sql: string
  }[] = [
    {
      column: "schools.code",
      sql: `SELECT code AS value, COUNT(*)::int AS count FROM schools WHERE code IS NOT NULL GROUP BY code HAVING COUNT(*) > 1`,
    },
    {
      column: "branches.code",
      sql: `SELECT code AS value, COUNT(*)::int AS count FROM branches WHERE code IS NOT NULL GROUP BY code HAVING COUNT(*) > 1`,
    },
    {
      column: "profiles.email",
      sql: `SELECT email AS value, COUNT(*)::int AS count FROM profiles WHERE email IS NOT NULL GROUP BY LOWER(email) HAVING COUNT(*) > 1`,
    },
    {
      column: "fee_invoices.invoice_number",
      sql: `SELECT invoice_number AS value, COUNT(*)::int AS count FROM fee_invoices GROUP BY invoice_number HAVING COUNT(*) > 1`,
    },
    {
      column: "payments.receipt_number",
      sql: `SELECT receipt_number AS value, COUNT(*)::int AS count FROM payments GROUP BY receipt_number HAVING COUNT(*) > 1`,
    },
    {
      column: "id_cards.card_number",
      sql: `SELECT card_number AS value, COUNT(*)::int AS count FROM id_cards GROUP BY card_number HAVING COUNT(*) > 1`,
    },
    {
      column: "id_cards.qr_token_hash",
      sql: `SELECT qr_token_hash AS value, COUNT(*)::int AS count FROM id_cards WHERE qr_token_hash IS NOT NULL GROUP BY qr_token_hash HAVING COUNT(*) > 1`,
    },
    {
      column: "library_books.isbn",
      sql: `SELECT isbn AS value, COUNT(*)::int AS count FROM library_books WHERE isbn IS NOT NULL GROUP BY isbn HAVING COUNT(*) > 1`,
    },
  ]

  for (const target of targets) {
    let rows: { value: string; count: number }[] = []
    try {
      rows = (await prisma.$queryRawUnsafe<{ value: string; count: number }[]>(target.sql)) ?? []
    } catch {
      // A table that does not exist yet means the schema has not been pushed.
      skip("1.6", `no duplicate ${target.column}`, "table not present — run db push first")
      continue
    }

    if (rows.length > 0) {
      duplicates.push({ column: target.column, value: rows[0].value, count: rows[0].count })
    }
  }

  if (duplicates.length > 0) {
    fail(
      "1.6",
      "no duplicates in globally-unique columns",
      duplicates.map((d) => `${d.column}="${d.value}" x${d.count}`).join("; "),
    )
  } else {
    pass("1.6", "no duplicates in globally-unique columns", `${targets.length} columns scanned`)
  }
}

// ─── Tenant-scoped checks: require a demo tenant ────────────────────────────

async function resolveTenant() {
  if (slug) {
    return prisma.demoTenant.findUnique({ where: { slug } })
  }
  return prisma.demoTenant.findFirst({
    orderBy: { createdAt: "desc" },
  })
}

async function checkTenantRows(tenantSlug: string) {
  const tenant = await resolveTenant()
  if (!tenant) {
    skip("2.1", "a demo tenant exists to verify", "--slug not supplied and no tenant found")
    return null
  }

  if (tenant.slug !== tenantSlug) {
    skip("2.1", "a demo tenant exists to verify", `requested ${tenantSlug}, using ${tenant.slug}`)
  }

  pass("2.1", "a demo tenant exists to verify", `${tenant.slug} status=${tenant.status}`)

  const prefix = toCodePrefix(tenant.slug)

  if (!tenant.schoolId) {
    skip("2.2", "tenant school is present", "schoolId is null (already purged?)")
    return tenant
  }

  const school = await prisma.school.findUnique({
    where: { id: tenant.schoolId },
    // `planId` is deliberately not selected. `schools.plan_id` belongs to Phase 9
    // (the in-app shell) and does not exist on the live database, so reading it would
    // make this check fail for a reason unrelated to seed quality.
    select: { code: true, name: true },
  })

  if (!school) {
    fail("2.2", "tenant school is present", `schoolId ${tenant.schoolId} does not resolve`)
    return tenant
  }

  pass("2.2", "tenant school is present", `${school.name} (${school.code})`)

  const mismatches: string[] = []
  if (school.code !== prefix) mismatches.push(`schools.code=${school.code} expected ${prefix}`)

  const branchCodes = await prisma.branch.findMany({
    where: { schoolId: tenant.schoolId },
    select: { code: true },
  })
  for (const b of branchCodes) {
    if (!b.code.startsWith(prefix)) mismatches.push(`branches.code=${b.code}`)
  }

  if (mismatches.length > 0) {
    fail("2.3", "tenant codes use the slug prefix", mismatches.join("; "))
  } else {
    pass("2.3", "tenant codes use the slug prefix", `${prefix}-* (${branchCodes.length} branches)`)
  }

  return tenant
}

async function checkCounts(tenantSlug: string) {
  const tenant = await resolveTenant()
  if (!tenant?.schoolId) {
    skip("4.1", "seeded row counts within tolerance", "no tenant with a school")
    return
  }

  if (tenant.slug !== tenantSlug) {
    skip(
      "4.1",
      "seeded row counts within tolerance",
      `requested ${tenantSlug}, using ${tenant.slug}`,
    )
  }

  const schoolId = tenant.schoolId
  // Only models with their own `schoolId` column take this filter. Applying it to the
  // others is a Prisma validation error, not a wrong count, and Prisma rejects it
  // before the query runs, so the whole verifier dies on the first one.
  const where = { schoolId }

  // Every volume in the plan's §17.2 table. Tables without a `schoolId` of their own
  // are reached through a relation that has one — `school` by primary key, `section`
  // via `class`, `feeInvoice` via `academicSession` — which is why some are nested.
  const [
    schools,
    branches,
    sessions,
    subjects,
    classes,
    sections,
    teachers,
    staff,
    students,
    parents,
    examTypes,
    homeworks,
    feeStructures,
    invoices,
    expenses,
    books,
    idCards,
  ] = await Promise.all([
    // School is the root, so it is matched by id rather than filtered by schoolId.
    prisma.school.count({ where: { id: schoolId } }),
    prisma.branch.count({ where }),
    prisma.academicSession.count({ where }),
    prisma.subject.count({ where }),
    prisma.class.count({ where }),
    prisma.section.count({ where: { class: { schoolId } } }),
    prisma.teacher.count({ where }),
    prisma.staff.count({ where }),
    prisma.student.count({ where }),
    prisma.parent.count({ where }),
    prisma.examType.count({ where }),
    prisma.homework.count({ where }),
    prisma.feeStructure.count({ where }),
    prisma.feeInvoice.count({ where: { academicSession: { schoolId } } }),
    prisma.expense.count({ where }),
    prisma.libraryBook.count({ where }),
    prisma.idCard.count({ where }),
  ])

  const actual: Record<string, number> = {
    school: schools,
    branch: branches,
    academicSession: sessions,
    subject: subjects,
    class: classes,
    section: sections,
    teacher: teachers,
    staff,
    student: students,
    parent: parents,
    examType: examTypes,
    homework: homeworks,
    feeStructure: feeStructures,
    feeInvoice: invoices,
    expense: expenses,
    libraryBook: books,
    idCard: idCards,
  }

  const off: string[] = []
  const seen: string[] = []

  for (const volume of SEED_VOLUMES) {
    const count = actual[volume.table]
    seen.push(volume.label)
    if (count === undefined) continue

    const delta = count - volume.count
    if (Math.abs(delta) > volume.tolerance) {
      off.push(
        `${volume.label}=${count} expected ${volume.count}±${volume.tolerance} (${delta > 0 ? "+" : ""}${delta})`,
      )
    }
  }

  const summary = seen.map((label) => `${label}=${actual[labelOf(label)] ?? "?"}`).join(" ")

  if (off.length > 0) {
    fail("4.1", "seeded row counts within tolerance", off.join("; "))
  } else {
    pass("4.1", "seeded row counts within tolerance", summary)
  }

  if (sessions === 0) {
    fail(
      "4.2",
      "an academic session exists",
      "zero AcademicSession rows — most pages will be empty",
    )
  } else {
    pass("4.2", "an academic session exists", `${sessions} session(s)`)
  }
}

function labelOf(label: string): string {
  return SEED_VOLUMES.find((v) => v.label === label)?.table ?? label
}

/**
 * Attendance is the one place a count proves the PRNG actually ran. A tenant that has
 * students but no attendance almost always means the phase failed partway.
 */
async function checkAttendance() {
  const tenant = await resolveTenant()
  if (!tenant?.schoolId) {
    skip("4.3", "attendance was generated for every student", "no tenant with a school")
    return
  }

  const students = await prisma.student.count({ where: { schoolId: tenant.schoolId } })
  if (students === 0) {
    skip("4.3", "attendance was generated for every student", "tenant has no students")
    return
  }

  const enrollmentCount = await prisma.studentEnrollment.count({
    where: { academicSession: { schoolId: tenant.schoolId } },
  })

  if (enrollmentCount !== students) {
    fail(
      "4.3",
      "every student has exactly one enrollment",
      `students=${students} enrollments=${enrollmentCount}`,
    )
  } else {
    pass("4.3", "every student has exactly one enrollment", `${enrollmentCount}`)
  }

  const [records, present, distinctStudents, distinctDays] = await Promise.all([
    prisma.studentAttendance.count({
      where: { academicSession: { schoolId: tenant.schoolId } },
    }),
    prisma.studentAttendance.count({
      where: { academicSession: { schoolId: tenant.schoolId }, status: "PRESENT" },
    }),
    prisma.studentAttendance
      .groupBy({
        by: ["studentId"],
        where: { academicSession: { schoolId: tenant.schoolId } },
      })
      .then((rows) => rows.length),
    prisma.studentAttendance
      .groupBy({
        by: ["date"],
        where: { academicSession: { schoolId: tenant.schoolId } },
      })
      .then((rows) => rows.length),
  ])

  const rate = records === 0 ? 0 : present / records

  if (records === 0) {
    fail(
      "4.4",
      "attendance present-rate is in the seeded band",
      "zero StudentAttendance rows — the attendance phase did not run",
    )
  } else if (Math.abs(rate - ATTENDANCE_PRESENT_RATE) > ATTENDANCE_PRESENT_TOLERANCE) {
    fail(
      "4.4",
      "attendance present-rate is in the seeded band",
      `present ${(rate * 100).toFixed(1)}% expected ~${(ATTENDANCE_PRESENT_RATE * 100).toFixed(0)}% ±${(ATTENDANCE_PRESENT_TOLERANCE * 100).toFixed(0)}`,
    )
  } else {
    pass(
      "4.4",
      "attendance present-rate is in the seeded band",
      `${(rate * 100).toFixed(1)}% present, ${records} records`,
    )
  }

  if (distinctStudents !== students) {
    fail(
      "4.5",
      "every student has attendance",
      `${distinctStudents} of ${students} students have at least one record`,
    )
  } else if (distinctDays === 0 || distinctDays > ATTENDANCE_DAYS) {
    fail(
      "4.5",
      "every student has attendance",
      `${distinctDays} distinct day(s); expected 1..${ATTENDANCE_DAYS}`,
    )
  } else {
    pass(
      "4.5",
      "every student has attendance",
      `${distinctStudents} students over ${distinctDays} days`,
    )
  }
}

/**
 * The single most important check in the whole plan: prove a tenant-scoped query
 * cannot see another tenant's rows.
 */
async function checkTenantIsolation(tenantSlug: string) {
  const tenant = await resolveTenant()
  if (!tenant?.schoolId) {
    skip("2.4", "cross-tenant read returns nothing", "no tenant with a school")
    return
  }

  const other = await prisma.demoTenant.findFirst({
    where: { schoolId: { not: null }, id: { not: tenant.id } },
    select: { schoolId: true, slug: true },
  })

  if (!other?.schoolId) {
    skip("2.4", "cross-tenant read returns nothing", "only one demo tenant exists")
    return
  }

  const leaked = await prisma.student.count({ where: { schoolId: other.schoolId } })
  const expected = await prisma.student.count({ where: { schoolId: tenant.schoolId } })

  if (expected === 0 && leaked === 0) {
    skip("2.4", "cross-tenant read returns nothing", "neither tenant has students yet")
    return
  }

  if (expected === 0 && leaked > 0) {
    fail(
      "2.4",
      "cross-tenant read returns nothing",
      `tenant ${tenantSlug} has 0 students but ${other.slug} has ${leaked}`,
    )
    return
  }

  const otherOwnStudents = await prisma.student.count({ where: { schoolId: other.schoolId } })
  if (otherOwnStudents !== leaked) {
    fail(
      "2.4",
      "cross-tenant read returns nothing",
      `student counts are not tenant-partitioned (${other.slug} expected ${otherOwnStudents}, saw ${leaked})`,
    )
    return
  }

  pass(
    "2.4",
    "cross-tenant read returns nothing",
    `${tenantSlug}: ${expected} students, ${other.slug}: ${leaked}, no bleed`,
  )
}

// ─── Runner ────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== demo-verify ===\n")
  if (slug) console.log(`slug:    ${slug}`)
  console.log(`strict:  ${strict}\n`)

  if (!(await preflight())) {
    await prisma.$disconnect()
    await pool.end()
    process.exit(1)
  }

  await checkPlanCatalog()
  await checkPublicPlans()
  await checkUnlimitedSentinel()
  await checkGlobalUniqueness()

  const target = slug ?? "any"
  await checkTenantRows(target)
  await checkCounts(target)
  await checkAttendance()
  await checkTenantIsolation(target)

  const failures = results.filter((r) => r.status === "FAIL")
  const skips = results.filter((r) => r.status === "SKIP")

  console.log("")
  for (const r of results) {
    const icon = r.status === "PASS" ? "OK  " : r.status === "FAIL" ? "FAIL" : "SKIP"
    console.log(`[${icon}] ${r.id} ${r.title}${r.detail ? `\n         ${r.detail}` : ""}`)
  }

  console.log(
    `\n${results.length - failures.length - skips.length} passed, ${failures.length} failed, ${skips.length} skipped`,
  )

  await prisma.$disconnect()
  await pool.end()

  if (failures.length > 0) process.exit(1)
  if (strict && skips.length > 0) {
    console.log("--strict: skipped checks are treated as failures")
    process.exit(1)
  }
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect().catch(() => {})
  await pool.end().catch(() => {})
  process.exit(1)
})
