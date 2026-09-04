import { PrismaClient } from "../lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const parentCount = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
    "SELECT COUNT(*) as count FROM parents",
  )
  console.log("Parents in parents table:", parentCount[0].count.toString())

  const parents = await prisma.$queryRawUnsafe<
    Array<{ id: string; first_name: string; last_name: string; email: string | null }>
  >("SELECT id, first_name, last_name, email FROM parents LIMIT 30")
  for (const p of parents) {
    const hasProfile = p.email
      ? await prisma.profile.findUnique({ where: { email: p.email }, select: { id: true } })
      : null
    console.log(
      `  ${p.first_name} ${p.last_name} (${p.email || "no email"}) ${hasProfile ? "✓ has profile" : "✗ no profile"}`,
    )
  }

  const teacherCount = await prisma.teacher.count()
  console.log("\nTeachers:", teacherCount)
  const teachers = await prisma.teacher.findMany({
    take: 10,
    include: { profile: { select: { email: true, firstName: true, lastName: true } } },
  })
  for (const t of teachers) {
    console.log(`  ${t.firstName} ${t.lastName} (profile: ${t.profile?.email || "no email"})`)
  }

  await prisma.$disconnect()
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
