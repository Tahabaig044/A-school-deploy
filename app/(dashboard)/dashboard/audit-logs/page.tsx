import { requireRole } from "@/lib/auth"
import { getAuditLogs } from "@/lib/audit"
import { AuditLogList } from "./audit-log-list"

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const { profile } = await requireRole("SUPER_ADMIN", "SCHOOL_ADMIN")
  const params = await searchParams
  const page = parseInt(params.page || "1")
  const pageSize = 50

  const logs = await getAuditLogs({
    schoolId: profile.schoolId || undefined,
    branchId: profile.branchId || undefined,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  })

  return (
    <AuditLogList
      logs={JSON.parse(JSON.stringify(logs))}
      profile={JSON.parse(JSON.stringify(profile))}
    />
  )
}
