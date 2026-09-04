# RLS Phase 2B — Notification Tenant Integrity
## Deliverable 6: `NOTIFICATION_TENANT_INTEGRITY.md`

## 1. Schema (verified)

```prisma
model Notification {
  id       String   @id @default(uuid()) @db.Uuid
  userId   String   @map("user_id") @db.Uuid   // receiver = Profile FK (onDelete: Cascade)
  title, content, type, category, priority, isRead, readAt, link, createdAt ...
  user     Profile  @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```
- **No `schoolId`/`branchId` column** on `Notification`.
- Tenant derives **only** from the **receiver** `Profile` (user-owned table). Sender is not recorded.

## 2. Live data (verified)

- **15 notifications** exist; all are test rows (`Notification N`) with `user_id =` the SUPER_ADMIN (`41c3b981…`), same school `41f32895`, same branch `9324ce1b`.
- **No cross-school notifications** in the current dataset.
- All receivers have a valid, tenant-assigned Profile (no dangling `user_id`).

## 3. Notification creation paths (code-verified)

| Path | Guard | Receiver school-validated? |
|---|---|---|
| `notification.actions.ts::createNotification` (23-39) | `requireRole(SUPER_ADMIN, SCHOOL_ADMIN, BRANCH_ADMIN, TEACHER)` | **NO** — writes `userId` directly; no check receiver is in sender's school |
| `meeting.actions.ts:25` — `prisma.notification.create` (direct) | meeting-scope checks | per meeting; receiver generally same school (meeting attendees) |
| `teacher-portal.actions.ts:855,894` — direct create | teacher-owned context | per context; receiver typically same school |
| `app/api/push/route.ts:23,58` — `prisma.notification.upsert/deleteMany` | auth via middleware | self-only (push token owner) |
| `app/api/mobile/notifications/me/route.ts:11` — read own | auth | self-only |

**Key gap (Phase 2A §6.5):** `createNotification` does **not** verify that `userId` (receiver) has `Profile.schoolId` equal to the sender's school. A school admin could theoretically send a notification to a user in another school (no FK violation — `userId` references any Profile).

## 4. Business-rule classification

- **NORMAL SCHOOL NOTIFICATION:** notification to a receiver **within the same school** (e.g., school admin → a teacher/parent/student of that school). Predominant, intended pattern.
- **INTENTIONALLY GLOBAL / SYSTEM NOTIFICATION:** notifications addressed to a SUPER_ADMIN or platform-level role (e.g., system alerts, low-stock, payroll completion) that are deliberately cross-school. Only the SUPER_ADMIN profile is cross-school by design in this system.

Because `Notification` records no sender and no school, we **cannot distinguish** the two classes from the DB alone — we must rely on **receiver-role + the calling action's intent**.

## 5. Recommended tenant rules (documented; behavioral change not auto-applied)

1. **RLS policy (Phase 2C):** `notifications.user_id = auth.uid()` — user reads/writes only their own notifications. This is sender-agnostic and inherently tenant-safe (a user only ever sees their own rows).
2. **Application guard (D4, Phase 2D):** in `createNotification`, fetch receiver Profile and require
   `receiver.schoolId == sender profile.schoolId` **unless** receiver.role = SUPER_ADMIN (platform/system) — mirroring the `getSchoolId` SUPER_ADMIN bypass already used elsewhere.
3. **Optional sender attribution:** consider adding a nullable `sender_id`/`school_id` for auditability + tenant policy (schema change → migration plan). Not required for correctness of the user-owned RLS approach.

## 6. Do not change behavior without the business rule

- The 15 test notifications are all same-school/system; no operational cross-school notifications exist to protect.
- The safest immediate posture: **RLS `user_id = auth.uid()`** (Phase 2C) plus **receiver school check for non-superadmin senders** (Phase 2D). No data fix needed now.
