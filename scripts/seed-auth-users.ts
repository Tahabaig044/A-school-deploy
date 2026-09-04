/**
 * Creates Profile records + Supabase Auth users for seeded portal users.
 *
 * The seed script creates parent/teacher/student data BUT:
 * - No Profile records for parents (they exist only in the `parents` table)
 * - No Supabase Auth users for any portal roles
 *
 * This script creates both, enabling portal login.
 *
 * Run AFTER: npx tsx --env-file=.env scripts/seed.ts
 * Usage:    npx tsx --env-file=.env scripts/seed-auth-users.ts
 */
import { PrismaClient } from "../lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import { randomUUID } from "crypto"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const DEFAULT_PASSWORD = "School@123"

async function createAuthUser(
  id: string,
  email: string,
  password: string,
  userMeta: Record<string, string>,
) {
  const checkRes = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
    { headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` } },
  )
  const existing = await checkRes.json()
  if (existing.users?.length > 0) return { skipped: true, id: existing.users[0].id }

  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ id, email, password, email_confirm: true, user_metadata: userMeta }),
  })
  return res.json()
}

async function main() {
  console.log("=== Step 1: Create Profile + Auth users for parents ===\n")

  interface ParentRow {
    id: string
    school_id: string
    first_name: string
    last_name: string
    email: string
    phone: string | null
  }
  const parents = await prisma.$queryRawUnsafe<ParentRow[]>(
    "SELECT id, school_id, first_name, last_name, email, phone FROM parents WHERE email IS NOT NULL AND email != ''",
  )

  let created = 0
  let skipped = 0

  for (const p of parents) {
    const existingProfile = await prisma.profile.findUnique({
      where: { email: p.email },
      select: { id: true },
    })
    if (existingProfile) {
      console.log(`  EXISTS: ${p.email}`)
      skipped++
      continue
    }

    const profileId = randomUUID()
    const result = await createAuthUser(profileId, p.email, DEFAULT_PASSWORD, {
      first_name: p.first_name,
      last_name: p.last_name,
      role: "PARENT",
    })

    if (result.error) {
      console.log(`  FAIL: ${p.email} — ${JSON.stringify(result.error)}`)
      continue
    }

    await prisma.profile.create({
      data: {
        id: profileId,
        email: p.email,
        firstName: p.first_name,
        lastName: p.last_name,
        role: "PARENT",
        phone: p.phone || null,
        schoolId: p.school_id,
        status: "ACTIVE",
      },
    })
    console.log(`  ✓ ${p.email} (PARENT)`)
    created++
  }

  // ── Step 2: Create Auth users for existing teacher/student profiles ──
  console.log("\n=== Step 2: Create Auth users for existing teacher/student profiles ===\n")

  const portalProfiles = await prisma.profile.findMany({
    where: { email: { not: null }, role: { in: ["TEACHER", "STUDENT"] } },
    select: { id: true, email: true, role: true, firstName: true, lastName: true },
  })

  for (const profile of portalProfiles) {
    if (!profile.email) continue
    const result = await createAuthUser(profile.id, profile.email, DEFAULT_PASSWORD, {
      first_name: profile.firstName || "",
      last_name: profile.lastName || "",
      role: profile.role,
    })

    if (result.skipped) {
      console.log(`  EXISTS: ${profile.email} (${profile.role})`)
      skipped++
    } else if (result.error) {
      console.log(`  FAIL: ${profile.email} (${profile.role}) — ${JSON.stringify(result.error)}`)
    } else {
      console.log(`  ✓ ${profile.email} (${profile.role})`)
      created++
    }
  }

  // ── Summary ──
  console.log(`\n=== Done ===`)
  console.log(`Created: ${created}, Skipped: ${skipped}`)
  console.log(`Password for all: ${DEFAULT_PASSWORD}\n`)

  // List all portal users
  const allPortal = await prisma.profile.findMany({
    where: { email: { not: null }, role: { in: ["PARENT", "TEACHER", "STUDENT"] } },
    select: { email: true, role: true },
    orderBy: { role: "asc" },
  })
  const seen = new Set<string>()
  for (const u of allPortal) {
    if (seen.has(u.email!)) continue
    seen.add(u.email!)
    console.log(`  ${u.email} (${u.role})`)
  }

  await prisma.$disconnect()
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
