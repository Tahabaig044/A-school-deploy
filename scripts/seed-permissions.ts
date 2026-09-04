import { prisma } from "@/lib/prisma"
import { ALL_PERMISSIONS } from "@/lib/permissions"

function u() {
  return crypto.randomUUID()
}

const ROLE_DEFAULTS: Record<string, string[]> = {
  SUPER_ADMIN: [...ALL_PERMISSIONS],
  SCHOOL_ADMIN: [
    "students.view",
    "students.create",
    "students.edit",
    "students.delete",
    "teachers.view",
    "teachers.create",
    "teachers.edit",
    "teachers.delete",
    "classes.view",
    "classes.create",
    "classes.edit",
    "classes.delete",
    "attendance.view",
    "attendance.mark",
    "exams.view",
    "exams.create",
    "exams.edit",
    "exams.delete",
    "exams.marks_entry",
    "exams.report_cards",
    "fees.view",
    "fees.create",
    "fees.edit",
    "fees.delete",
    "fees.collect",
    "fees.invoices",
    "fees.defaulters",
    "homework.view",
    "homework.create",
    "homework.edit",
    "homework.delete",
    "library.view",
    "library.manage",
    "transport.view",
    "transport.manage",
    "announcements.view",
    "announcements.create",
    "announcements.edit",
    "messages.view",
    "messages.send",
    "notifications.view",
    "notifications.manage",
    "meetings.view",
    "meetings.create",
    "meetings.edit",
    "events.view",
    "events.create",
    "events.edit",
    "calendar.view",
    "calendar.create",
    "calendar.edit",
    "reports.view",
    "reports.export",
    "settings.view",
    "settings.edit",
    "branches.view",
    "branches.create",
    "branches.edit",
    "staff.view",
    "staff.create",
    "staff.edit",
    "sessions.view",
    "sessions.create",
    "sessions.edit",
    "expenses.view",
    "expenses.create",
    "expenses.edit",
  ],
  BRANCH_ADMIN: [
    "students.view",
    "students.create",
    "students.edit",
    "teachers.view",
    "teachers.create",
    "teachers.edit",
    "classes.view",
    "classes.create",
    "classes.edit",
    "attendance.view",
    "attendance.mark",
    "exams.view",
    "exams.create",
    "exams.edit",
    "exams.marks_entry",
    "exams.report_cards",
    "fees.view",
    "fees.create",
    "fees.edit",
    "fees.collect",
    "fees.invoices",
    "fees.defaulters",
    "homework.view",
    "homework.create",
    "homework.edit",
    "library.view",
    "transport.view",
    "announcements.view",
    "announcements.create",
    "messages.view",
    "messages.send",
    "notifications.view",
    "notifications.manage",
    "meetings.view",
    "meetings.create",
    "meetings.edit",
    "events.view",
    "events.create",
    "events.edit",
    "calendar.view",
    "calendar.create",
    "calendar.edit",
    "reports.view",
    "staff.view",
    "staff.create",
    "staff.edit",
    "expenses.view",
    "expenses.create",
  ],
  PRINCIPAL: [
    "students.view",
    "students.create",
    "students.edit",
    "teachers.view",
    "teachers.create",
    "teachers.edit",
    "classes.view",
    "classes.create",
    "classes.edit",
    "attendance.view",
    "attendance.mark",
    "exams.view",
    "exams.create",
    "exams.edit",
    "exams.marks_entry",
    "exams.report_cards",
    "fees.view",
    "homework.view",
    "homework.create",
    "homework.edit",
    "announcements.view",
    "announcements.create",
    "messages.view",
    "messages.send",
    "notifications.view",
    "notifications.manage",
    "meetings.view",
    "meetings.create",
    "meetings.edit",
    "events.view",
    "events.create",
    "events.edit",
    "calendar.view",
    "calendar.create",
    "calendar.edit",
    "reports.view",
  ],
  TEACHER: [
    "students.view",
    "classes.view",
    "attendance.view",
    "attendance.mark",
    "exams.view",
    "exams.marks_entry",
    "exams.report_cards",
    "homework.view",
    "homework.create",
    "homework.edit",
    "messages.view",
    "messages.send",
  ],
  ACCOUNTANT: [
    "fees.view",
    "fees.create",
    "fees.edit",
    "fees.collect",
    "fees.invoices",
    "fees.defaulters",
    "expenses.view",
    "expenses.create",
    "expenses.edit",
    "reports.view",
    "reports.export",
    "students.view",
  ],
  ADMISSION_OFFICER: [
    "students.view",
    "students.create",
    "students.edit",
    "announcements.view",
    "messages.view",
    "messages.send",
  ],
  LIBRARIAN: ["library.view", "library.manage", "students.view"],
  TRANSPORT_MANAGER: ["transport.view", "transport.manage", "students.view"],
  PARENT: [
    "students.view",
    "fees.view",
    "homework.view",
    "announcements.view",
    "messages.view",
    "messages.send",
    "exams.view",
    "exams.report_cards",
    "attendance.view",
  ],
  STUDENT: [
    "students.view",
    "fees.view",
    "homework.view",
    "announcements.view",
    "messages.view",
    "exams.view",
    "exams.report_cards",
    "attendance.view",
    "classes.view",
  ],
}

async function main() {
  console.log("Seeding permissions...")

  const permRecords = ALL_PERMISSIONS.map((p) => {
    const [resource, action] = p.split(".")
    return { id: u(), resource, action, description: `${action} ${resource}` }
  })

  // Batch insert permissions using column list
  if (permRecords.length > 0) {
    const vals = permRecords.map(
      (p) => `('${p.id}','${p.resource}','${p.action}','${p.description}',NOW())`,
    )
    await prisma.$executeRawUnsafe(
      `INSERT INTO permissions (id, resource, action, description, created_at) VALUES ${vals.join(", ")} ON CONFLICT (resource, action) DO UPDATE SET description = EXCLUDED.description`,
    )
  }
  console.log(`  Permissions: ${permRecords.length}`)

  // Fetch all permissions to get IDs
  const allPerms = await prisma.$queryRawUnsafe<{ id: string; resource: string; action: string }[]>(
    `SELECT id, resource, action FROM permissions`,
  )
  const permMap = new Map(allPerms.map((p) => [`${p.resource}.${p.action}`, p.id]))

  // Batch insert role permissions
  let rolePermCount = 0
  const rpBatches: string[][] = []
  let currentBatch: string[] = []
  for (const [role, perms] of Object.entries(ROLE_DEFAULTS)) {
    for (const permKey of perms) {
      const permId = permMap.get(permKey)
      if (permId) {
        currentBatch.push(`('${u()}','${role}','${permId}',NOW())`)
        rolePermCount++
        if (currentBatch.length >= 200) {
          rpBatches.push(currentBatch)
          currentBatch = []
        }
      }
    }
  }
  if (currentBatch.length > 0) rpBatches.push(currentBatch)

  for (const batch of rpBatches) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO role_permissions (id, role, permission_id, created_at) VALUES ${batch.join(", ")} ON CONFLICT (role, permission_id) DO NOTHING`,
    )
  }
  console.log(`  Role permissions: ${rolePermCount}`)
  console.log("Permissions seeded!")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
