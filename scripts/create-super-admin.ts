import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { resolve } from "path"

const envPath = resolve(__dirname, "../.env")
const envContent = readFileSync(envPath, "utf-8")
const envVars: Record<string, string> = {}
envContent.split("\n").forEach((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) {
    envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "")
  }
})

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const SUPER_ADMIN_ID = "41c3b981-2e39-4539-b0b4-8b87bc9750ae"
const SUPER_ADMIN_EMAIL = "superadmin@school.com"

async function main() {
  console.log("Fixing Super Admin profile...")

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: "Super",
      last_name: "Admin",
      email: SUPER_ADMIN_EMAIL,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      is_active: true,
    })
    .eq("id", SUPER_ADMIN_ID)

  if (error) {
    console.error("Error:", error.message)
    return
  }

  // Verify
  const { data } = await supabase
    .from("profiles")
    .select("first_name, last_name, email, role, status, is_active")
    .eq("id", SUPER_ADMIN_ID)
    .single()

  console.log("Super Admin profile updated!")
  console.log(`  Name: ${data?.first_name} ${data?.last_name}`)
  console.log(`  Email: ${data?.email}`)
  console.log(`  Role: ${data?.role}`)
  console.log(`  Status: ${data?.status}`)
  console.log(`  Active: ${data?.is_active}`)
  console.log("")
  console.log("Login credentials:")
  console.log(`  Email: ${SUPER_ADMIN_EMAIL}`)
  console.log(`  Password: Super@123456`)
}

main().catch(console.error)
