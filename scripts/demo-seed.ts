/**
 * Local/demo CLI wrapper around the seed runner.
 *
 * Refuses to run unless `DEMO_SEED_ALLOW` is set. This is a destructive script: it
 * creates a school and several thousand rows, and it derives `expiresAt` from a plan.
 * A guard that has to be set deliberately is what stops it being pointed at
 * production by a copy-pasted command, which is the realistic accident here.
 *
 * It also refuses to run against a database whose host does not look like a
 * development or staging target, unless `DEMO_SEED_ALLOW_PRODUCTION=yes` is also
 * set. Belt and braces, because the environment guard is easy to set by accident.
 */

import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { Prisma, PrismaClient } from "../lib/generated/prisma/client"
import { DEMO_STATUS } from "../lib/demo/constants"
import { SLUG_ALPHABET, SLUG_LENGTH, isValidSlug, toCodePrefix } from "../lib/demo/slug"
import { Prng } from "../services/demo/prng"
import { runSeed, type SeedContext, type SeedPhase } from "../services/demo/seed-runner"
import { inBandPhases, outOfBandPhases } from "../services/demo/seed-phases"
import { seedPhases } from "../services/demo/seed-data"

// NOTE: the seed modules reach Prisma through `lib/prisma`, and a few of their
// dependencies (`lib/demo/events`, `lib/demo/transition`) begin with
// `import "server-only"`. That package throws on resolution unless the `react-server`
// export condition is set, which plain `tsx` does not set — so this script has to run
// through `node --conditions=react-server`, wired up in package.json as `demo:seed`.
// A plain `npx tsx scripts/demo-seed.ts` will fail with the server-only error; that is
// expected, not a bug to chase.

const allow = (process.env.DEMO_SEED_ALLOW ?? "").trim().toLowerCase()
const allowProduction = (process.env.DEMO_SEED_ALLOW_PRODUCTION ?? "").trim().toLowerCase()

/** Hosts this script will touch without an extra, louder acknowledgement. */
const SAFE_HOST_PATTERN = /localhost|127\.0\.0\.1|\.test$|\.local$|staging|dev/i

function assertAllowed(): void {
  if (allow !== "1" && allow !== "true" && allow !== "yes") {
    console.error(
      "Refusing to seed.\n\n" +
        "This script writes a school and several thousand rows. Set DEMO_SEED_ALLOW=1 " +
        "to confirm you meant it:\n" +
        "  DEMO_SEED_ALLOW=1 npm run demo:seed -- <slug>",
    )
    process.exit(1)
  }

  const host = new URL(process.env.DATABASE_URL ?? "").hostname

  if (!SAFE_HOST_PATTERN.test(host) && allowProduction !== "1" && allowProduction !== "yes") {
    console.error(
      `Refusing to seed against "${host}".\n\n` +
        "That host does not look local, dev, or staging. If you are certain:\n" +
        "  DEMO_SEED_ALLOW=1 DEMO_SEED_ALLOW_PRODUCTION=1 npm run demo:seed -- <slug>",
    )
    process.exit(1)
  }
}

/**
 * Confirms the demo schema exists before the runner does anything.
 *
 * Without this, a missing `prisma db push` surfaces as a `P2021` stack trace from
 * whichever phase happened to query first, which reads like a seed bug rather than an
 * unapplied schema. Same reasoning as the preflight in `demo-verify.ts`.
 */
async function assertSchemaApplied(prisma: PrismaClient): Promise<boolean> {
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
  console.error("\nThe demo schema has not been applied.")
  console.error(
    "\nDo NOT reach for `prisma db push` here. schema.prisma does not model 16 tables\n" +
      "that exist in the database (users, sessions, site_settings, leads, invoices,\n" +
      "support_tickets, ...) and they hold real rows. `db push` drops every table it\n" +
      "does not model, so against this database it plans 16 DROP TABLE statements and\n" +
      "would destroy that data. It is also not reversible without a verified backup.\n",
  )
  console.error(
    "\nApply only the additive demo subset instead: the 6 demo tables, their indexes\n" +
      "and foreign keys, and the 5 demo enums. Generate it with\n" +
      "  npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script\n" +
      "then keep the demo objects and drop every Drop*/AlterTable/RenameIndex\n" +
      "statement before executing. Verify the result restores from a backup first.",
  )
  console.error("\nSee docs/DEMO_TRIAL_SYSTEM_PLAN.md for the full sequence.")
  return false
}

async function main() {
  assertAllowed()

  const slug = process.argv[2]

  if (!slug) {
    console.error("Usage: DEMO_SEED_ALLOW=1 npm run demo:seed -- <slug>")
    process.exit(1)
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  if (!(await assertSchemaApplied(prisma))) {
    await prisma.$disconnect()
    await pool.end()
    process.exit(1)
  }

  // The tenant must already exist; creating one is Phase 6's job, and doing it here
  // would bypass the provisioning transitions the lifecycle depends on.
  const tenant = await prisma.demoTenant.findUnique({
    where: { slug },
    select: { id: true, slug: true, status: true, schoolId: true },
  })

  if (!tenant) {
    console.error(
      `No demo tenant with slug "${slug}".\n` +
        "The tenant is created by the request flow, not by this script.",
    )
    process.exit(1)
  }

  // Persona provisioning is the one out-of-band phase: it creates real Supabase Auth
  // users, and those cannot be undone by dropping rows. It is opt-in, and re-runnable
  // on its own once the data is in place.
  const withPersonas = process.argv.includes("--with-personas")
  const personasOnly = process.argv.includes("--personas-only")

  if (!personasOnly && tenant.schoolId) {
    console.error(
      `Tenant "${slug}" already has a school. Purge it before re-seeding so the ` +
        "determinism check is meaningful.",
    )
    process.exit(1)
  }

  // Personas are provisioned against a seeded tenant, which is a READY tenant with a
  // school; data seeding is the PROVISIONING tenant without one. The requirement that
  // must hold depends on which of the two this run is.
  if (personasOnly && (!tenant.schoolId || tenant.status !== DEMO_STATUS.READY)) {
    console.error(
      `Tenant "${slug}" is ${tenant.status}${tenant.schoolId ? "" : " with no school"}; ` +
        `provisioning personas requires ${DEMO_STATUS.READY} with seeded data.`,
    )
    process.exit(1)
  }

  if (!personasOnly && tenant.status !== DEMO_STATUS.PROVISIONING) {
    console.error(
      `Tenant "${slug}" is ${tenant.status}; seeding requires ${DEMO_STATUS.PROVISIONING}.`,
    )
    process.exit(1)
  }

  // Reject a malformed slug before any write. Every generated code and persona email
  // embeds it, and a slug with punctuation produces values that look like typos in
  // school records and can collide once separators are stripped.
  if (!isValidSlug(slug)) {
    console.error(
      `"${slug}" is not a valid demo slug.\n\n` +
        `Expected ${SLUG_LENGTH} characters from ${SLUG_ALPHABET}\n` +
        "It is generated by generateSlug(); a slug you typed by hand is usually wrong.",
    )
    process.exit(1)
  }

  const started = Date.now()

  if (personasOnly) {
    await runPersonasOnly(tenant, prisma, pool)
    process.exit(0)
  }

  const phases = withPersonas ? seedPhases : inBandPhases(seedPhases)

  console.log(
    `Seeding demo tenant "${slug}" (${phases.length} phase(s): ${phases.map((p) => p.name).join(", ")})...`,
  )

  const result = await runSeed<SeedContext>(
    tenant.id,
    (t) => ({
      tenantId: t.id,
      schoolId: t.schoolId!,
      prefix: toCodePrefix(t.slug),
      // Seeded from the slug, so a re-run reproduces identical data.
      prng: new Prng(`${t.slug}:seed`),
    }),
    phases as readonly SeedPhase<SeedContext>[],
  )

  const seconds = ((Date.now() - started) / 1000).toFixed(1)

  console.log(
    result.status === "COMPLETED"
      ? `\nSeeded in ${seconds}s. Phases: ${result.completedPhases.join(", ")}`
      : `\nFAILED in ${seconds}s at phase "${result.failedPhase}"\n${result.error}`,
  )

  await prisma.$disconnect()
  await pool.end()

  process.exit(result.status === "COMPLETED" ? 0 : 1)
}

/**
 * Runs just the out-of-band phases (personas) against an already-seeded tenant.
 *
 * Deliberately does not go through `runSeed`: that runner fenced the tenant into
 * `SEEDING` and out again, which is the lifecycle path for data seeding. A READY
 * tenant cannot legally move back to SEEDING (`DEMO_TRANSITIONS[READY]` only allows
 * EXPIRED and REVOKED), so the out-of-band phases run directly here and leave the
 * tenant's lifecycle status untouched. A failure is reported and re-runnable; it
 * never marks the tenant FAILED, because the data underneath is still good.
 */
async function runPersonasOnly(
  tenant: {
    id: string
    slug: string
    schoolId: string
  },
  prisma: PrismaClient,
  pool: Pool,
): Promise<void> {
  console.log("Personas are expected to already be seeded; skipping data phases.")

  const phases = outOfBandPhases(seedPhases)

  console.log(
    `Provisioning demo tenant "${tenant.slug}" (${phases.length} phase(s): ${phases.map((p) => p.name).join(", ")})...`,
  )

  const context: SeedContext = {
    tenantId: tenant.id,
    schoolId: tenant.schoolId,
    prefix: toCodePrefix(tenant.slug),
    prng: new Prng(`${tenant.slug}:seed`),
  }

  try {
    for (const phase of phases) {
      await phase.run(context)
      console.log(`  ${phase.name} OK`)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`\nFAILED at phase "${phases[0]?.name ?? "personas"}"\n${message}`)
    console.error("\nThe tenant is left unchanged and the run can be retried.")
    await prisma.$disconnect()
    await pool.end()
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
