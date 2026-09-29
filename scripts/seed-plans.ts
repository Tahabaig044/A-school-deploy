/**
 * Idempotently seeds the `Plan` and `PlanLimit` tables from `lib/demo/plans.ts`.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/seed-plans.ts
 *   npx tsx --env-file=.env scripts/seed-plans.ts --force   # overwrite limit drift
 *
 * DRIFT POLICY — the important part:
 *   A limit is a business decision an operator may deliberately lower (say, to
 *   slow down demo abuse). Re-running this script must NOT silently widen it back
 *   to the catalog value. So by default an existing row whose `limitValue`,
 *   `period` or `isEnabled` differs from the catalog is reported and left alone.
 *   `--force` is required to overwrite.
 *
 *   `Plan` metadata (name, duration, retention, isPublic) is always synced, since
 *   those describe the offering rather than a tuned cap.
 */

import { PrismaClient } from "../lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

import { PLAN_CATALOG, findLimitDrift, type PlanLimitDrift } from "../lib/demo/plans"

// NOTE: `lib/demo/env` is deliberately NOT imported here. It begins with
// `import "server-only"`, and that package throws on resolution unless the
// `react-server` export condition is set — which `tsx` does not set. Scripts read
// the one flag they need straight from the environment instead.
const demoDisabled = ["1", "true", "yes", "on"].includes(
  (process.env.DEMO_DISABLED ?? "").trim().toLowerCase(),
)

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const force = process.argv.includes("--force")

const drifts: PlanLimitDrift[] = []

async function main() {
  console.log(
    `Seeding plans from catalog (${PLAN_CATALOG.length} plans) — mode: ${force ? "FORCE" : "report-only"}\n`,
  )

  if (demoDisabled) {
    console.log(
      "Note: DEMO_DISABLED is on. Seeding plan definitions is still useful for staging.\n",
    )
  }

  for (const def of PLAN_CATALOG) {
    const existing = await prisma.plan.findUnique({ where: { key: def.key } })

    const plan = existing
      ? await prisma.plan.update({
          where: { key: def.key },
          data: {
            name: def.name,
            description: def.description,
            durationDays: def.durationDays,
            retentionDays: def.retentionDays,
            isPublic: def.isPublic,
            isActive: def.isActive,
            sortOrder: def.sortOrder,
          },
        })
      : await prisma.plan.create({
          data: {
            key: def.key,
            name: def.name,
            description: def.description,
            durationDays: def.durationDays,
            retentionDays: def.retentionDays,
            isPublic: def.isPublic,
            isActive: def.isActive,
            sortOrder: def.sortOrder,
          },
        })

    console.log(`${existing ? "updated" : "created"} plan ${plan.key} (${plan.id})`)

    for (const limit of def.limits) {
      const current = await prisma.planLimit.findUnique({
        where: { planId_key: { planId: plan.id, key: limit.key } },
      })

      if (!current) {
        await prisma.planLimit.create({
          data: {
            planId: plan.id,
            key: limit.key,
            metric: limit.metric,
            limitValue: limit.limitValue,
            period: limit.period,
            isEnabled: limit.isEnabled,
          },
        })
        console.log(`  + limit ${limit.key} = ${limit.limitValue} (${limit.period})`)
        continue
      }

      const found = findLimitDrift(def.key, limit, current)

      if (found.length === 0) continue

      drifts.push(...found)

      if (force) {
        await prisma.planLimit.update({
          where: { planId_key: { planId: plan.id, key: limit.key } },
          data: {
            metric: limit.metric,
            limitValue: limit.limitValue,
            period: limit.period,
            isEnabled: limit.isEnabled,
          },
        })
        console.log(`  ~ limit ${limit.key} overwritten -> ${limit.limitValue} (--force)`)
      }
    }
  }

  if (drifts.length > 0) {
    console.log(`\n${drifts.length} limit drift(s) detected:`)
    console.table(drifts)
    console.log(
      "These database values were preserved so an operator's tuning is not undone.\n" +
        "Re-run with --force to overwrite them with the catalog values.",
    )
  } else {
    console.log("\nNo limit drift. Catalog and database agree.")
  }

  const planCount = await prisma.plan.count()
  const limitCount = await prisma.planLimit.count()
  console.log(`\nTotals: ${planCount} plans, ${limitCount} limits`)

  await prisma.$disconnect()
  await pool.end()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect().catch(() => {})
  await pool.end().catch(() => {})
  process.exit(1)
})
