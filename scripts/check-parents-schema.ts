import { PrismaClient } from "../lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const cols = await prisma.$queryRawUnsafe<Array<{column_name:string,data_type:string,is_nullable:string}>>(
    `SELECT column_name, data_type, is_nullable
     FROM information_schema.columns
     WHERE table_name = 'parents'
     ORDER BY ordinal_position`
  )
  for (const c of cols) {
    console.log(`${c.column_name} (${c.data_type}, ${c.is_nullable === 'YES' ? 'nullable' : 'required'})`)
  }
  await prisma.$disconnect()
  await pool.end()
}

main().catch(e => { console.error(e); process.exit(1) })
