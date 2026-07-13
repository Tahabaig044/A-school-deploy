import { PrismaClient } from "../lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const count = await prisma.profile.count()
  console.log("Total profiles:", count)
  const profiles = await prisma.profile.findMany({ select: { email: true, role: true, firstName: true, lastName: true }, take: 30 })
  for (const p of profiles) {
    console.log(`  ${p.email || "no email"} (${p.role}) - ${p.firstName} ${p.lastName}`)
  }
  await prisma.$disconnect()
  await pool.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
