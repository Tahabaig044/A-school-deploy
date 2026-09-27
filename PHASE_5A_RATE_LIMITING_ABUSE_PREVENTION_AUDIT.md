# Phase 5A — Rate Limiting & Abuse Prevention Security Audit

**Date:** 2026-09-05
**Gate Decision:** AUDIT COMPLETE
**Project:** School Management System — Abuse Prevention

---

## 1. Executive Summary

Comprehensive audit of rate limiting, abuse prevention, brute force protection, spam prevention, resource exhaustion, and replay protection across 44 API routes, 44 server actions, and all authentication flows.

**Key statistics:**
- **CRITICAL findings: 4**
- **HIGH findings: 7**
- **MEDIUM findings: 7**
- **LOW findings: 4**
- **INFO findings: 3**

**Most pervasive issue:** The application has virtually zero rate limiting. Only 2 of 44 API routes have any rate limiting (QR and ID-card PDF), both using in-memory `Map()` counters that reset on server restart and are not shared across instances. No authentication endpoint has brute force protection beyond an application-level lockout that only applies to existing users.

**PHASE 5A AUDIT = COMPLETE**

---

## 2. Existing Protection Inventory

### Rate Limiting

| Location | Type | Limit | Key | Scope | Weakness |
|---|---|---|---|---|---|
| `api/qr/route.ts` | In-memory Map | 120 req/min | IP | Per-process | Resets on restart, spoofable IP, memory leak |
| `api/id-card/pdf/route.ts` | In-memory Map | 30 req/min | IP | Per-process | Same weaknesses as above |

**Total routes with rate limiting: 2 / 44**

### Authentication Lockout

| Location | Mechanism | Threshold | Duration | Weakness |
|---|---|---|---|---|
| `auth.actions.ts:18-19` | DB counter | 5 failed attempts | 30 min lockout | Only for existing users; non-existent emails bypass entirely; no IP-based tracking |

### Duplicate Prevention (Idempotency)

| Location | Mechanism | Effectiveness |
|---|---|---|
| `exam.actions.ts` — submitExamResult | Upsert on `examId_studentId` | ✅ Effective |
| `attendance.actions.ts` — markAttendance | Upsert on `studentId_date_session` | ✅ Effective |
| `payroll.actions.ts` — generateSalarySlips | Check on `staffId_month_year` | ✅ Effective |
| `homework.actions.ts` — submitHomework | findFirst + create (NOT atomic) | ⚠️ Race condition |
| `fees.actions.ts` — generateInvoice | No check | ❌ Missing |
| `fees.actions.ts` — assignFeePlan | No check | ❌ Missing |
| `payments/webhook/route.ts` | No event.id check | ❌ Missing |

### Input Limits

| Limit | Location | Status |
|---|---|---|
| File size: 10MB | `upload/homework/route.ts:34` | ✅ Present |
| QR data: 2048 chars | `qr/route.ts:28` | ✅ Present |
| Message content: 5000 chars | `mobile/messages/send/route.ts:23` | ✅ Present |
| Meeting title: 100 chars | `teacher/meetings/route.ts` | ✅ Present |
| Meeting notes: 5000 chars | `meetings/[id]/notes/route.ts` | ✅ Present |
| Subscription JSON: 10KB | `push/route.ts:45` | ✅ Present |
| Search query: 100 chars | `teacher/students/route.ts:76` | ✅ Present |
| Exam results array: 500 | `exams/save-results/route.ts:43` | ✅ Present |
| Attendance array: 100 | `mobile/attendance/class/route.ts:35` | ✅ Present |
| Message content (server action) | `message.actions.ts` | ❌ No max beyond Zod min(1) |
| Notification limit param | `notification.actions.ts:105` | ❌ No max cap |
| Announcement body | `announcement.actions.ts` | ❌ No length limit |
| Remarks (exam results) | `exams/save-results/route.ts:67` | ❌ No length limit |

### Pagination

| Endpoint | Pagination | Status |
|---|---|---|
| `mobile/messages/inbox` | None — returns all | ❌ Missing |
| `mobile/homework/me` | None — returns all | ❌ Missing |
| `mobile/exams/results` | None — returns all | ❌ Missing |
| `mobile/students/me` | None — returns all | ❌ Missing |
| `mobile/announcements/me` | None — returns all | ❌ Missing |
| `teacher/meetings` GET | None — returns all | ❌ Missing |
| `notification.actions.ts` getNotifications | `limit` param, no max | ⚠️ Bypassable |
| Most server action list functions | Some have pagination | ⚠️ Inconsistent |

### Caching

| Endpoint | Cache Headers | Status |
|---|---|---|
| `qr/route.ts` | `Cache-Control: public, max-age=86400, immutable` | ✅ Present |
| `invoices/pdf/route.ts` | None | ❌ Missing |
| `certificates/route.ts` | None | ❌ Missing |
| `id-card/pdf/route.ts` | None | ❌ Missing |
| `uploads/homework/[path]` | None | ❌ Missing |

### CAPTCHA / Bot Protection

| Location | Status |
|---|---|
| Login form | ❌ None |
| Signup form | ❌ None |
| Forgot password form | ❌ None |
| Any form | ❌ None |

---

## 3. Authentication Abuse Audit

### 3.1 Login Brute Force

**Endpoint:** `actions/auth.actions.ts` signin (line 317)
**Method:** Email/password via `supabase.auth.signInWithPassword`
**Existing Protection:** Application-level lockout — 5 failed attempts → 30 min lockout (lines 18-19, 366-396)
**Rate Limit Present:** NO
**Missing Protection:**
- No IP-based rate limiting
- No CAPTCHA after N failed attempts
- Lockout only tracks existing users — `if (profile)` guard at line 367 means non-existent emails are never tracked
- Attacker can bypass lockout by targeting different email addresses
- Supabase itself may have some rate limiting on the auth endpoint, but this is not controlled by the application

**Attack Scenario:** Attacker uses credential stuffing list of 10,000 emails. Each attempt against non-existent email is never rate limited. Existing accounts can be locked out but attacker moves to next email.

### 3.2 Password Reset Abuse

**Endpoint:** `actions/auth.actions.ts` forgotPassword (line 485)
**Method:** Sends reset email via `supabase.auth.resetPasswordForEmail`
**Existing Protection:** None
**Rate Limit Present:** NO
**Missing Protection:**
- No rate limiting on reset requests
- No CAPTCHA
- No IP tracking
- Returns generic `{ success: true }` (good — prevents enumeration)
- But unlimited emails can be sent to any address

**Attack Scenario:** Attacker spams 1,000 password reset requests for `admin@school.com`. Each triggers a Supabase email. Inbox flooded, legitimate user can't find real reset link.

### 3.3 2FA Code Brute Force

**Endpoint:** `actions/two-factor.actions.ts` verifyTwoFactorLogin (line 62)
**Method:** TOTP verification via `lib/two-factor.ts`
**Existing Protection:** None
**Rate Limit Present:** NO
**Missing Protection:**
- No attempt tracking
- No lockout after failed 2FA attempts
- TOTP window of 1 (±30 seconds) — attacker has ~500,000 valid codes to try
- No delay between attempts
- 6-digit code = 1,000,000 possibilities

**Attack Scenario:** After obtaining password (via phishing, leak, or brute force), attacker has unlimited attempts to guess 6-digit TOTP code. At 100 attempts/second, exhaustive search takes ~3 hours.

### 3.4 2FA Disable Without Password

**Endpoint:** `actions/two-factor.actions.ts` turnOffTwoFactor (line 50)
**Method:** Requires `requireAuth()` only
**Existing Protection:** Session authentication
**Rate Limit Present:** NO
**Missing Protection:**
- No password re-verification before disabling 2FA
- An attacker with a valid session (stolen cookie, XSS) can disable 2FA

### 3.5 Signup Abuse

**Endpoint:** `actions/auth.actions.ts` signup (line 562)
**Method:** Self-registration for STUDENT/PARENT/TEACHER
**Existing Protection:** None
**Rate Limit Present:** NO
**Missing Protection:**
- No CAPTCHA
- No rate limiting
- No honeypot fields
- No email verification enforcement (depends on Supabase config)
- Creates profile + auth user on every call

### 3.6 Invitation Abuse

**Endpoint:** `actions/auth.actions.ts` inviteUser (line 57)
**Method:** Admin-only user creation with email invitation
**Existing Protection:** Requires `requireInvitePermission()`
**Rate Limit Present:** NO
**Missing Protection:**
- No rate limiting on invitation sends
- `listUsers()` at line 105 loads ALL auth users into memory — O(n) on every invite
- Different error messages for "pending" vs "exists" vs "auth exists" leak account state

---

## 4. API Abuse Audit

### Route Classification Matrix

| Route | Method | Auth | Roles | Rate Limit | Abuse Risk | Expensive |
|---|---|---|---|---|---|---|
| `/api/qr` | GET | Cookie | 6 roles | ✅ 120/min | Low | Medium |
| `/api/push` | POST/DELETE | Cookie | Any auth | ❌ None | Medium | Low |
| `/api/upload/homework` | POST | Cookie | 5 roles | ❌ None | **HIGH** | Medium |
| `/api/payments/checkout` | POST | Cookie | Any auth | ❌ None | **CRITICAL** | **High (Stripe $$)** |
| `/api/payments/webhook` | POST | Stripe sig | N/A | ❌ None | Low | Medium |
| `/api/invoices/pdf` | GET | Cookie | Any auth | ❌ None | **HIGH** | **High (HTML gen)** |
| `/api/certificates` | GET | Cookie | Any auth | ❌ None | **HIGH** | **High (HTML gen)** |
| `/api/id-card/pdf` | GET | Service | Any auth | ✅ 30/min | Medium | **High (PDF)** |
| `/api/teacher/meetings` | GET/POST | Cookie | TEACHER | ❌ None | Low | Medium |
| `/api/teacher/meetings/[id]/status` | PATCH | Cookie | TEACHER | ❌ None | Low | Low |
| `/api/teacher/meetings/[id]/notes` | POST | Cookie | TEACHER | ❌ None | Low | Low |
| `/api/teacher/exams/save-results` | POST | Cookie | TEACHER | ❌ None | Medium | **High (500 upserts)** |
| `/api/teacher/exams/[id]` | GET | Cookie | TEACHER | ❌ None | Low | Low |
| `/api/teacher/exams/[id]/results` | GET | Cookie | TEACHER | ❌ None | Low | Medium |
| `/api/teacher/students` | GET | Cookie | TEACHER | ❌ None | Medium | Medium |
| `/api/teacher/assignments` | GET | Cookie | TEACHER | ❌ None | Low | Low |
| `/api/mobile/messages/send` | POST | Bearer | Any mobile | ❌ None | **HIGH** | Low |
| `/api/mobile/messages/inbox` | GET | Bearer | Any mobile | ❌ None | Medium | Medium |
| `/api/mobile/homework/submit` | POST | Bearer | STUDENT | ❌ None | Low | Medium |
| `/api/mobile/homework/me` | GET | Bearer | STUDENT | ❌ None | Low | Medium |
| `/api/mobile/homework/teacher` | GET | Bearer | TEACHER | ❌ None | Low | Low |
| `/api/mobile/announcements/me` | GET | Bearer | Any mobile | ❌ None | Low | Medium |
| `/api/mobile/announcements/[id]/read` | POST | Bearer | Any mobile | ❌ None | Low | Low |
| `/api/mobile/attendance/class` | POST | Bearer | TEACHER | ❌ None | Medium | Medium |
| `/api/mobile/attendance/me` | GET | Bearer | STUDENT | ❌ None | Low | Low |
| `/api/mobile/attendance/me/today` | GET | Bearer | STUDENT | ❌ None | Low | Low |
| `/api/mobile/exams/results` | GET | Bearer | TEACHER | ❌ None | Medium | Medium |
| `/api/mobile/exams/me` | GET | Bearer | STUDENT | ❌ None | Low | Medium |
| `/api/mobile/exams/teacher` | GET | Bearer | TEACHER | ❌ None | Low | Low |
| `/api/mobile/children/me` | GET | Bearer | PARENT | ❌ None | Low | Medium |
| `/api/mobile/children/[id]/timetable` | GET | Bearer | PARENT | ❌ None | Low | Medium |
| `/api/mobile/children/[id]/results` | GET | Bearer | PARENT | ❌ None | Low | Medium |
| `/api/mobile/children/[id]/homework` | GET | Bearer | PARENT | ❌ None | Low | Medium |
| `/api/mobile/children/[id]/attendance` | GET | Bearer | PARENT | ❌ None | Low | Low |
| `/api/mobile/notifications/me` | GET | Bearer | Any mobile | ❌ None | Low | Low |
| `/api/mobile/students/me` | GET | Bearer | TEACHER | ❌ None | Medium | Medium |
| `/api/mobile/meetings/me` | GET | Bearer | Any mobile | ❌ None | Low | Low |
| `/api/mobile/timetable/me` | GET | Bearer | STUDENT | ❌ None | Low | Low |
| `/api/mobile/timetable/teacher` | GET | Bearer | TEACHER | ❌ None | Low | Low |
| `/api/mobile/id-card/me` | GET | Bearer | Any mobile | ❌ None | Low | Low |
| `/api/mobile/id-card/[userId]` | GET | Bearer | Any mobile | ❌ None | Medium | Low |
| `/api/mobile/id-card/[userId]/pdf` | GET | Bearer | Any mobile | ❌ None | **HIGH** | **High (PDF)** |
| `/api/mobile/id-card/verify` | POST | Bearer | Verifier | ❌ None | Medium | Low |
| `/api/uploads/homework/[path]` | GET | Cookie | Any auth | ❌ None | Medium | Medium |

---

## 5. Server Action Abuse Audit

### 5.1 Message Spam

**Action:** `message.actions.ts` sendMessage (line 16)
**Risk:** CRITICAL
**Details:** Any authenticated user can send unlimited messages to any user in their school. No rate limit, no content length max beyond 1 char, no spam detection, no duplicate prevention.
**Attack:** Student sends 1,000 messages to a teacher in 1 minute.

### 5.2 Notification Spam

**Action:** `notification.actions.ts` createNotification (line 23)
**Risk:** MEDIUM
**Details:** Teachers+ can create unlimited notifications to any user. `getNotifications` has `limit` param with no max cap (line 105) — caller can pass `999999`.

### 5.3 Meeting Notification Amplification

**Action:** `meeting.actions.ts` notifyAttendees (line 37)
**Risk:** HIGH
**Details:** Each meeting action (create, edit, approve, reject, cancel, reschedule) triggers `notifyAttendees` which creates N notification DB rows (one per attendee). A meeting with 500 attendees = 500 notification inserts per action. No limit on attendee count.
**Attack:** Create meeting with 500 attendees, edit 10 times = 5,000 notification rows.

### 5.4 Invoice Generation Spam

**Action:** `fees.actions.ts` generateInvoice (line 208)
**Risk:** CRITICAL
**Details:** No duplicate check. Same student can get infinite invoices for same session. Invoice numbers are sequential but not uniqueness-checked before create.
**Attack:** Accountant (or compromised account) generates 1,000 invoices for same student.

### 5.5 Fee Plan Assignment Spam

**Action:** `fees.actions.ts` assignFeePlan (line 149)
**Risk:** HIGH
**Details:** No duplicate check. Same fee structure can be assigned to same student multiple times.
**Attack:** Assign same fee plan 100 times → student has 100 duplicate fee plans.

### 5.6 Report Generation DoS

**Action:** `reports.actions.ts` getDashboardStats (line 6)
**Risk:** HIGH
**Details:** Runs 16 parallel DB queries including a raw SQL join on every dashboard load. No caching, no rate limiting.
**Attack:** Authenticated user refreshes dashboard 100 times/second → DB overload.

### 5.7 Invitation Memory Exhaustion

**Action:** `auth.actions.ts` inviteUser (line 57)
**Risk:** MEDIUM
**Details:** `listUsers()` at line 105 loads ALL auth users into memory to check email uniqueness. O(n) on every invite.
**Attack:** With 10,000 users, each invite loads 10,000 auth user records.

---

## 6. File Upload Abuse Audit

**Endpoint:** `POST /api/upload/homework`
**Existing Protection:** 10MB file size limit, MIME type whitelist, extension-MIME cross-validation
**Missing Protection:**
- No rate limiting on upload frequency
- No per-user upload quota
- No per-school storage quota
- No concurrent upload limit
- No cleanup mechanism for orphan files
- Writes to local filesystem (`uploads/homework/`) — breaks in serverless/containers
- No deduplication (same file can be uploaded repeatedly)

**Attack Scenarios:**
1. Student uploads 1,000 files in 1 minute → disk exhaustion
2. Multiple users upload simultaneously → inode exhaustion
3. Files stored locally → lost on container restart/redeployment

---

## 7. Payment & Financial Abuse Audit

### 7.1 Checkout Session Spam

**Endpoint:** `POST /api/payments/checkout`
**Existing Protection:** Auth + school-scoping
**Rate Limit:** NONE
**Risk:** CRITICAL
**Details:** Each call creates a new Stripe checkout session. Stripe charges per session creation. No idempotency key. No limit on sessions per invoice.
**Attack:** Authenticated user creates 100 checkout sessions for same invoice → Stripe fees accumulate, stale sessions clutter Stripe dashboard.

### 7.2 Webhook Event Replay

**Endpoint:** `POST /api/payments/webhook`
**Existing Protection:** Stripe signature verification
**Rate Limit:** NONE
**Risk:** CRITICAL
**Details:** No event.id deduplication. Stripe retries on 5xx → duplicate `Payment` records created. `receiptNumber` uses `prisma.payment.count()` (line 41-42) — race condition under concurrent webhooks produces duplicate receipt numbers.
**Attack:** Stripe retries webhook → second `Payment` record created → `paidAmount` inflated → invoice prematurely marked PAID.

### 7.3 Invoice PDF Generation

**Endpoint:** `GET /api/invoices/pdf`
**Existing Protection:** Auth + school-scoping
**Rate Limit:** NONE
**Risk:** HIGH
**Details:** Each call runs `generateInvoicePDF()` which does multiple DB queries + HTML template rendering. No caching headers.
**Attack:** Authenticated user requests same invoice PDF 100 times → CPU exhaustion.

---

## 8. Messaging & Notification Spam Audit

### 8.1 Message Sending

**Endpoint:** `POST /api/mobile/messages/send` + `message.actions.ts` sendMessage
**Existing Protection:** Auth + school-scoping
**Rate Limit:** NONE
**Risk:** HIGH
**Details:** No per-user rate limit, no content length max (server action), no spam detection, no duplicate prevention.
**Attack:** Student sends 1,000 messages to teacher → inbox flooded.

### 8.2 Notification Creation

**Action:** `notification.actions.ts` createNotification
**Existing Protection:** Role check (teachers+)
**Rate Limit:** NONE
**Risk:** MEDIUM
**Details:** Unlimited notifications per user. `getNotifications` accepts unbounded `limit` param.
**Attack:** Teacher creates 1,000 notifications for single student → notification feed flooded.

### 8.3 Announcement Publishing

**Action:** `announcement.actions.ts` createAnnouncement
**Existing Protection:** Role check (admin/teacher)
**Rate Limit:** NONE
**Risk:** LOW
**Details:** Limited to admin/teacher roles. No email sending triggered.

---

## 9. Resource Exhaustion Audit

### 9.1 Expensive Endpoints

| Endpoint | Operation | Auth | Rate Limit | Risk |
|---|---|---|---|---|
| `reports.actions.ts` getDashboardStats | 16 parallel DB queries | Cookie | NONE | HIGH |
| `reports.actions.ts` getFeeCollectionReport | Loads ALL payments in range | Cookie | NONE | HIGH |
| `reports.actions.ts` getExamPerformanceReport | Loads ALL exams + results | Cookie | NONE | HIGH |
| `reports.actions.ts` getIncomeVsExpenseReport | Loads ALL payments + expenses | Cookie | NONE | HIGH |
| `invoices/pdf` | DB queries + HTML generation | Cookie | NONE | HIGH |
| `certificates` | DB queries + HTML generation | Cookie | NONE | HIGH |
| `id-card/pdf` | PDF generation | Service | 30/min | MEDIUM |
| `mobile/id-card/[userId]/pdf` | PDF generation | Bearer | NONE | HIGH |
| `teacher/exams/save-results` | Up to 500 sequential upserts | Cookie | NONE | HIGH |
| `teacher/meetings` GET | Unbounded findMany with includes | Cookie | NONE | MEDIUM |
| `mobile/messages/inbox` | Unbounded findMany | Bearer | NONE | MEDIUM |
| `mobile/homework/me` | Unbounded findMany | Bearer | NONE | MEDIUM |
| `mobile/exams/results` | Unbounded findMany | Bearer | NONE | MEDIUM |
| `mobile/students/me` | Multi-class student query | Bearer | NONE | MEDIUM |
| `auth.actions.ts` inviteUser | listUsers() loads ALL auth users | Cookie | NONE | MEDIUM |

### 9.2 Unbounded Queries

Multiple GET endpoints return all results without pagination:
- `teacher/meetings` GET — all meetings with nested attendees/notes
- `mobile/messages/inbox` — all messages
- `mobile/homework/me` — all homework with submissions
- `mobile/exams/results` — all exam results with student PII
- `mobile/announcements/me` — all announcements
- `mobile/students/me` — all students across all assigned classes

---

## 10. Mobile API Abuse Audit

### 10.1 Bearer JWT Validation

All 27 mobile routes use `getMobileUserFromRequest()` which validates the Supabase JWT. ✅ Correct.

### 10.2 Mobile-Specific Concerns

| Concern | Status |
|---|---|
| Bearer token validation | ✅ Present on all routes |
| Rate limiting | ❌ None on any route |
| User-based rate limit keys | N/A — no rate limiting exists |
| IP-based limits unreliable (NAT) | N/A — no rate limiting exists |
| Push notification abuse | ❌ No limit on push subscription updates |
| Pagination on list endpoints | ❌ Missing on 6+ endpoints |

### 10.3 ID Card PDF DoS

**Endpoint:** `GET /api/mobile/id-card/[userId]/pdf`
**Risk:** HIGH
**Details:** PDF generation is CPU/memory intensive. No rate limit. An attacker with valid JWT can spam this endpoint.
**Note:** The web route `id-card/pdf` has 30/min rate limit, but the mobile route does not.

---

## 11. Rate-Limit Key Strategy

### Recommended Key Types

| Protection | Recommended Key | Reason |
|---|---|---|
| Login attempts | **Email + IP composite** | Prevents both credential stuffing (per-email) and brute force (per-IP) |
| Password reset | **Email + IP composite** | Prevents inbox flooding per-email and per-IP |
| 2FA verification | **User ID** | Prevents brute force per-account |
| API mutations (POST/PATCH/DELETE) | **User ID** | Prevents per-user abuse; IP unreliable behind NAT |
| PDF/certificate generation | **User ID** | Prevents per-user resource exhaustion |
| File uploads | **User ID + School ID composite** | Prevents per-user and per-school storage exhaustion |
| Checkout creation | **User ID** | Prevents per-user Stripe abuse |
| Message sending | **User ID** | Prevents per-user spam |
| Dashboard/reports | **User ID** | Prevents per-user DoS |
| Public endpoints (if any) | **IP** | Only option for unauthenticated |
| Webhook | **Event ID** (dedup, not rate limit) | Prevents duplicate processing |

### Why NOT IP-Only

- Mobile users share NAT IPs — IP-only limits block innocent users
- Corporate/school networks share external IPs
- VPN/proxy users share IPs
- Rate limit keying by User ID is more accurate for authenticated endpoints

---

## 12. Recommended Rate-Limit Tiers

### Tier A — Authentication-Sensitive (CRITICAL)

**Applies to:** Login, signup, password reset, 2FA verification, invitation acceptance
**Rate limit:** 5-10 requests per minute per key
**Key:** Email + IP composite
**Burst:** Allow 3 rapid requests, then delay exponentially
**Lockout:** 15 min after 5 failures, 1 hour after 10 failures

### Tier B — Financial Operations (CRITICAL)

**Applies to:** Checkout creation, payment recording, invoice generation, refund operations
**Rate limit:** 10 requests per minute per user
**Key:** User ID
**Burst:** Allow 2 rapid requests
**Idempotency:** Stripe idempotency keys on checkout; event.id dedup on webhooks

### Tier C — Expensive Operations (HIGH)

**Applies to:** PDF generation, certificate generation, report generation, dashboard stats
**Rate limit:** 20 requests per minute per user
**Key:** User ID
**Burst:** Allow 5 rapid requests
**Caching:** Add cache headers for repeated identical requests

### Tier D — Mutation/Spam-Sensitive (HIGH)

**Applies to:** Message sending, notification creation, meeting creation, file uploads
**Rate limit:** 30 requests per minute per user
**Key:** User ID
**Burst:** Allow 10 rapid requests

### Tier E — Normal API (MEDIUM)

**Applies to:** All other authenticated API endpoints
**Rate limit:** 120 requests per minute per user
**Key:** User ID
**Burst:** Allow 30 rapid requests

### Tier F — Public/Unauthenticated (if applicable)

**Applies to:** Any future public endpoints
**Rate limit:** 30 requests per minute per IP
**Key:** IP address
**Note:** Currently no public API routes exist (all require auth)

---

## 13. Distributed Deployment Analysis

### Current Architecture

- **Runtime:** Node.js LTS Alpine Docker container (`Dockerfile`)
- **Server:** `next start` (single process)
- **Instances:** Likely 1 (no Docker Compose, no orchestration config found)
- **Database:** Supabase (PostgreSQL) — remote managed service
- **Cache/Redis:** None in dependencies
- **Vercel:** Not used (no `vercel.json`)

### In-Memory Rate Limiter Assessment

| Factor | Assessment |
|---|---|
| Single instance | ✅ In-memory works for single instance |
| Server restart | ❌ Counters reset on restart |
| Container scaling | ❌ Counters not shared across containers |
| Serverless | ❌ Would not work at all (each request = new process) |
| Memory leak | ❌ Existing Maps never clean up stale entries |

### Recommendation

For the current single-instance Docker deployment, an **in-memory rate limiter** (like `express-rate-limit` or a custom `Map`-based solution) would work as a quick fix but has limitations:

1. **Resets on restart** — attacker can wait for deployment and get fresh limits
2. **Memory leak** — existing Maps never clean up (need TTL-based eviction)
3. **Not future-proof** — if scaled to multiple containers, in-memory state is lost

**Recommended approach:**
1. **Short-term:** In-memory rate limiter with TTL-based eviction (fast to implement)
2. **Medium-term:** Database-backed rate limiting using Supabase (already have PostgreSQL)
3. **Long-term:** Consider Upstash Redis if edge/serverless deployment is planned

**Do NOT use:** Redis unless specifically needed — adds operational complexity. PostgreSQL-based limiting is sufficient for this application's scale.

---

## 14. Finding Details

### FINDING RL-1 — No Rate Limiting on Login

**Severity:** CRITICAL
**Category:** Authentication Abuse
**File:** `actions/auth.actions.ts:317-453`
**Attack Scenario:** Attacker performs credential stuffing with 10,000 email/password combinations
**Preconditions:** Valid email list (from data breach, enumeration, or guessing)
**Abuse Impact:** Account compromise, unauthorized access, data breach
**Existing Protections:** Application-level lockout (5 attempts / 30 min) — only for existing users
**Missing Protection:** IP-based rate limiting, CAPTCHA, progressive delays
**Recommended Mitigation:** Tier A rate limit (5-10 req/min per email+IP)
**Recommended Key:** Email + IP composite
**Suggested Limit:** 5 attempts per 15 minutes per email, 20 per IP
**Burst Behavior:** Allow 3 rapid, then exponential backoff
**False-Positive Risk:** Low — legitimate users rarely fail login 5+ times

### FINDING RL-2 — No Rate Limiting on Password Reset

**Severity:** CRITICAL
**Category:** Authentication Abuse
**File:** `actions/auth.actions.ts:485-519`
**Attack Scenario:** Attacker spams password reset for target email, flooding inbox
**Preconditions:** Target email address known
**Abuse Impact:** Inbox flooding, denial of service for legitimate password reset
**Existing Protections:** Generic response (`{ success: true }`) prevents enumeration
**Missing Protection:** Rate limiting, CAPTCHA
**Recommended Mitigation:** Tier A rate limit (3-5 req/min per email)
**Recommended Key:** Email + IP composite
**Suggested Limit:** 3 requests per 10 minutes per email
**Burst Behavior:** Allow 1 rapid, then 10-minute cooldown
**False-Positive Risk:** Low — users rarely need multiple resets

### FINDING RL-3 — No Brute Force Protection on 2FA

**Severity:** CRITICAL
**Category:** Authentication Abuse
**File:** `actions/two-factor.actions.ts:62`, `lib/two-factor.ts:92-102`
**Attack Scenario:** Attacker with stolen password brute-forces 6-digit TOTP code
**Preconditions:** Valid password (phishing, leak, or brute force)
**Abuse Impact:** Account compromise bypassing 2FA
**Existing Protections:** None
**Missing Protection:** Attempt tracking, lockout, rate limiting, delay
**Recommended Mitigation:** Tier A rate limit + lockout after 3 failed 2FA attempts
**Recommended Key:** User ID
**Suggested Limit:** 3 attempts per 5 minutes, lockout after 5 failures
**Burst Behavior:** Allow 1 rapid, then 30-second delay between attempts
**False-Positive Risk:** Low — users rarely enter wrong TOTP code

### FINDING RL-4 — No Rate Limiting on API Surface

**Severity:** CRITICAL
**Category:** API Abuse
**File:** All 44 API routes (42 without rate limiting)
**Attack Scenario:** Attacker hammers expensive endpoints (PDF, reports, checkout) to exhaust server resources
**Preconditions:** Valid authentication (for protected routes)
**Abuse Impact:** CPU exhaustion, DB overload, Stripe financial abuse
**Existing Protections:** 2 of 44 routes have in-memory rate limiting
**Missing Protection:** Global rate limiting middleware
**Recommended Mitigation:** Tiered rate limiting (Tiers A-F) applied at middleware level
**Recommended Key:** User ID for authenticated, IP for unauthenticated
**Suggested Limit:** Per-tier limits as defined in Section 12
**Burst Behavior:** Per-tier burst settings
**False-Positive Risk:** Low — legitimate usage patterns are well within limits

### FINDING RL-5 — Checkout Session Spam (Financial Abuse)

**Severity:** HIGH
**Category:** Payment Abuse
**File:** `api/payments/checkout/route.ts:22`
**Attack Scenario:** Authenticated user creates 100 checkout sessions for same invoice
**Preconditions:** Authenticated user with access to unpaid invoice
**Abuse Impact:** Stripe API fees, stale sessions, dashboard clutter
**Existing Protections:** Auth + school-scoping
**Missing Protection:** Rate limiting, idempotency key, limit per invoice
**Recommended Mitigation:** Tier B rate limit + Stripe idempotency key
**Recommended Key:** User ID
**Suggested Limit:** 5 requests per 10 minutes per user
**Burst Behavior:** Allow 2 rapid
**False-Positive Risk:** Low — users rarely need multiple checkout sessions

### FINDING RL-6 — Webhook Event Replay (Duplicate Payments)

**Severity:** HIGH
**Category:** Payment Abuse
**File:** `api/payments/webhook/route.ts:24-88`
**Attack Scenario:** Stripe retries webhook → duplicate Payment record → invoice overpaid
**Preconditions:** Stripe webhook retry (network timeout, 5xx response)
**Abuse Impact:** Financial data corruption, incorrect invoice status
**Existing Protections:** Stripe signature verification
**Missing Protection:** Event.id deduplication, receipt number atomicity
**Recommended Mitigation:** Event ID dedup table + atomic receipt number generation
**Recommended Key:** Event ID (not rate limit — idempotency)
**Suggested Limit:** N/A (dedup, not rate limit)
**Burst Behavior:** N/A
**False-Positive Risk:** None — event dedup is always correct

### FINDING RL-7 — Invoice Generation Spam

**Severity:** HIGH
**Category:** Financial Abuse
**File:** `actions/fees.actions.ts:208`
**Attack Scenario:** Accountant generates 1,000 invoices for same student
**Preconditions:** Accountant or compromised admin account
**Abuse Impact:** Database bloat, incorrect financial records
**Existing Protections:** None
**Missing Protection:** Duplicate check (student + session + fee structure)
**Recommended Mitigation:** Add unique constraint + dedup check before create
**Recommended Key:** N/A (idempotency, not rate limit)
**Suggested Limit:** 1 invoice per student per fee structure per session
**Burst Behavior:** N/A
**False-Positive Risk:** None — duplicate invoices are never intended

### FINDING RL-8 — Message Spam

**Severity:** HIGH
**Category:** Messaging Abuse
**File:** `api/mobile/messages/send/route.ts:5`, `actions/message.actions.ts:16`
**Attack Scenario:** Student sends 1,000 messages to teacher in 1 minute
**Preconditions:** Authenticated mobile/web user
**Abuse Impact:** Inbox flooding, operational disruption
**Existing Protections:** Auth + school-scoping
**Missing Protection:** Rate limiting, content length limit (server action), spam detection
**Recommended Mitigation:** Tier D rate limit (30 req/min per user)
**Recommended Key:** User ID
**Suggested Limit:** 20 messages per minute per user
**Burst Behavior:** Allow 5 rapid
**False-Positive Risk:** Low — normal messaging is well within limits

### FINDING RL-9 — Report Generation DoS

**Severity:** HIGH
**Category:** Resource Exhaustion
**File:** `actions/reports.actions.ts:6`
**Attack Scenario:** Authenticated user refreshes dashboard 100 times/second
**Preconditions:** Any authenticated user (even STUDENT)
**Abuse Impact:** DB overload, server slowdown for all users
**Existing Protections:** None
**Missing Protection:** Rate limiting, caching, query optimization
**Recommended Mitigation:** Tier C rate limit + response caching
**Recommended Key:** User ID
**Suggested Limit:** 20 requests per minute per user
**Burst Behavior:** Allow 5 rapid
**False-Positive Risk:** Low — dashboard refreshes are typically <10/minute

### FINDING RL-10 — 2FA Can Be Disabled Without Password

**Severity:** HIGH
**Category:** Authentication Bypass
**File:** `actions/two-factor.actions.ts:50-59`
**Attack Scenario:** Attacker with valid session disables 2FA to maintain persistent access
**Preconditions:** Valid session cookie (stolen, XSS, session fixation)
**Abuse Impact:** 2FA bypass, persistent unauthorized access
**Existing Protections:** Session authentication
**Missing Protection:** Password re-verification before 2FA disable
**Recommended Mitigation:** Require password confirmation before disabling 2FA
**Recommended Key:** N/A (authorization fix, not rate limit)
**Suggested Limit:** N/A
**Burst Behavior:** N/A
**False-Positive Risk:** None — password re-verification is standard practice

### FINDING RL-11 — No CAPTCHA on Any Form

**Severity:** HIGH
**Category:** Bot Abuse
**File:** All authentication forms (login, signup, forgot-password)
**Attack Scenario:** Automated bot submits forms at scale
**Preconditions:** None
**Abuse Impact:** Account creation spam, password reset flooding, credential stuffing
**Existing Protections:** None
**Missing Protection:** CAPTCHA (reCAPTCHA, hCaptcha, Turnstile)
**Recommended Mitigation:** Add CAPTCHA to login, signup, and forgot-password forms
**Recommended Key:** N/A (bot detection, not rate limit)
**Suggested Limit:** N/A
**Burst Behavior:** N/A
**False-Positive Risk:** Low — modern CAPTCHA has minimal friction

### FINDING RL-12 — Meeting Notification Amplification

**Severity:** MEDIUM
**Category:** Notification Abuse
**File:** `actions/meeting.actions.ts:37-58`
**Attack Scenario:** Create meeting with 500 attendees, edit 10 times → 5,000 notification rows
**Preconditions:** Principal/admin role
**Abuse Impact:** DB bloat, notification feed flooding
**Existing Protections:** None
**Missing Protection:** Limit on attendee count, rate limit on meeting actions
**Recommended Mitigation:** Cap attendees at 100, add Tier D rate limit on meeting creation
**Recommended Key:** User ID
**Suggested Limit:** 10 meeting actions per hour
**Burst Behavior:** Allow 3 rapid
**False-Positive Risk:** Low — meetings with 500 attendees are unusual

### FINDING RL-13 — File Upload Storage Exhaustion

**Severity:** MEDIUM
**Category:** Resource Exhaustion
**File:** `api/upload/homework/route.ts`
**Attack Scenario:** User uploads 1,000 files to exhaust disk space
**Preconditions:** Authenticated user with upload permission
**Abuse Impact:** Disk exhaustion, service degradation
**Existing Protections:** 10MB file size limit
**Missing Protection:** Rate limiting, per-user quota, per-school quota
**Recommended Mitigation:** Tier D rate limit + storage quotas
**Recommended Key:** User ID + School ID
**Suggested Limit:** 10 uploads per minute per user
**Burst Behavior:** Allow 3 rapid
**False-Positive Risk:** Low — homework uploads are typically <10/hour

### FINDING RL-14 — Homework Submission Race Condition

**Severity:** MEDIUM
**Category:** Duplicate Prevention
**File:** `actions/homework.actions.ts:235-249`
**Attack Scenario:** Double-click submit creates duplicate submission records
**Preconditions:** Student submitting homework
**Abuse Impact:** Duplicate records, confusing grading
**Existing Protections:** findFirst check (NOT atomic)
**Missing Protection:** Database unique constraint on homeworkId + studentId
**Recommended Mitigation:** Add unique compound constraint + use upsert
**Recommended Key:** N/A (dedup, not rate limit)
**Suggested Limit:** N/A
**Burst Behavior:** N/A
**False-Positive Risk:** None — duplicate submissions are never intended

### FINDING RL-15 — Fee Plan Assignment Spam

**Severity:** MEDIUM
**Category:** Financial Abuse
**File:** `actions/fees.actions.ts:149`
**Attack Scenario:** Same fee structure assigned to same student 100 times
**Preconditions:** Accountant/admin role
**Abuse Impact:** Duplicate fee plans, incorrect invoicing
**Existing Protections:** None
**Missing Protection:** Duplicate check before assign
**Recommended Mitigation:** Add unique constraint on studentId + feeStructureId + academicSessionId
**Recommended Key:** N/A (dedup, not rate limit)
**Suggested Limit:** N/A
**Burst Behavior:** N/A
**False-Positive Risk:** None — duplicate fee plans are never intended

### FINDING RL-16 — In-Memory Rate Limiter Weaknesses

**Severity:** MEDIUM
**Category:** Architecture
**File:** `api/qr/route.ts:7-18`, `api/id-card/pdf/route.ts:13-24`
**Attack Scenario:** Server restart resets all rate limit counters; attacker waits for deployment
**Preconditions:** Knowledge of deployment schedule
**Abuse Impact:** Rate limits bypassed after restart
**Existing Protections:** In-memory Maps
**Missing Protection:** Persistent storage, TTL-based eviction, cross-instance sharing
**Missing Protection:** Cleanup of stale entries (memory leak)
**Recommended Mitigation:** Replace with DB-backed or Redis-backed rate limiter; add TTL eviction
**Recommended Key:** N/A (architecture fix)
**Suggested Limit:** N/A
**Burst Behavior:** N/A
**False-Positive Risk:** N/A

### FINDING RL-17 — Unbounded GET Queries

**Severity:** MEDIUM
**Category:** Resource Exhaustion
**File:** Multiple endpoints (see Section 9.2)
**Attack Scenario:** Authenticated user requests unbounded list endpoints repeatedly
**Preconditions:** Authenticated user
**Abuse Impact:** DB overload, memory exhaustion
**Existing Protections:** None
**Missing Protection:** Pagination, result limits
**Recommended Mitigation:** Add mandatory pagination to all list endpoints
**Recommended Key:** N/A (input validation, not rate limit)
**Suggested Limit:** Max 100 results per page
**Burst Behavior:** N/A
**False-Positive Risk:** Low — pagination is standard practice

### FINDING RL-18 — ListUsers Memory Exhaustion

**Severity:** LOW
**Category:** Resource Exhaustion
**File:** `actions/auth.actions.ts:105`
**Attack Scenario:** Admin invites user → loads ALL auth users into memory
**Preconditions:** Admin role, large user base (10,000+)
**Abuse Impact:** Memory spike, slow response
**Existing Protections:** None
**Missing Protection:** Use `findUnique` on email instead of loading all users
**Recommended Mitigation:** Replace `listUsers()` with direct email lookup
**Recommended Key:** N/A (code fix, not rate limit)
**Suggested Limit:** N/A
**Burst Behavior:** N/A
**False-Positive Risk:** None

### FINDING RL-19 — Receipt Number Race Condition

**Severity:** LOW
**Category:** Data Integrity
**File:** `api/payments/webhook/route.ts:41-42`
**Attack Scenario:** Concurrent webhooks read same count → duplicate receipt numbers
**Preconditions:** Concurrent Stripe webhook deliveries
**Abuse Impact:** Duplicate receipt numbers, accounting confusion
**Existing Protections:** None
**Missing Protection:** Atomic counter or UUID-based receipt numbers
**Recommended Mitigation:** Use UUID or atomic sequence for receipt numbers
**Recommended Key:** N/A (code fix, not rate limit)
**Suggested Limit:** N/A
**Burst Behavior:** N/A
**False-Positive Risk:** None

### FINDING RL-20 — Admin Invite Account Enumeration

**Severity:** LOW
**Category:** Information Disclosure
**File:** `actions/auth.actions.ts:96-108`
**Attack Scenario:** Admin notices different error messages for pending/existing/auth accounts
**Preconditions:** Admin access
**Abuse Impact:** Minor information disclosure
**Existing Protections:** Admin-only endpoint
**Missing Protection:** Generic error messages
**Recommended Mitigation:** Use uniform error message for all invite failures
**Recommended Key:** N/A (code fix, not rate limit)
**Suggested Limit:** N/A
**Burst Behavior:** N/A
**False-Positive Risk:** None

### FINDING RL-21 — Missing Cache Headers on Expensive Endpoints

**Severity:** LOW
**Category:** Performance / Abuse
**File:** `api/invoices/pdf`, `api/certificates`, `api/id-card/pdf`
**Attack Scenario:** Same PDF requested repeatedly → regenerates every time
**Preconditions:** Authenticated user
**Abuse Impact:** Unnecessary CPU/DB load
**Existing Protections:** None
**Missing Protection:** Cache-Control headers
**Recommended Mitigation:** Add `Cache-Control: private, max-age=3600` to PDF/certificate responses
**Recommended Key:** N/A (HTTP caching, not rate limit)
**Suggested Limit:** N/A
**Burst Behavior:** N/A
**False-Positive Risk:** Low — PDFs rarely change within an hour

### FINDING RL-22 — Invitation Token Validity Enumerable

**Severity:** LOW
**Category:** Information Disclosure
**File:** `actions/auth.actions.ts:234-246`
**Attack Scenario:** Different errors for invalid/used/expired tokens leak token state
**Preconditions:** Knowledge of invitation token format
**Abuse Impact:** Minor information disclosure
**Existing Protections:** Tokens are random UUIDs (hard to guess)
**Missing Protection:** Generic error message for all token failures
**Recommended Mitigation:** Use uniform "Invalid or expired invitation" message
**Recommended Key:** N/A (code fix, not rate limit)
**Suggested Limit:** N/A
**Burst Behavior:** N/A
**False-Positive Risk:** None

### FINDING RL-23 — CSRF Origin Validation Bypass

**Severity:** INFO
**Category:** Architecture
**File:** `api/payments/checkout/route.ts:7-20` (and all CSRF-checked routes)
**Attack Scenario:** If `NEXT_PUBLIC_APP_URL` env is unset, CSRF check is skipped entirely
**Preconditions:** Misconfigured environment
**Abuse Impact:** CSRF attacks possible on state-changing endpoints
**Existing Protections:** Origin header check (when env is set)
**Missing Protection:** Fail-closed behavior when env is missing
**Recommended Mitigation:** Log warning when env is unset; consider fail-closed in production
**Recommended Key:** N/A (configuration, not rate limit)
**Suggested Limit:** N/A
**Burst Behavior:** N/A
**False-Positive Risk:** N/A

### FINDING RL-24 — No Webhook IP Allowlisting

**Severity:** INFO
**Category:** Defense-in-Depth
**File:** `api/payments/webhook/route.ts`
**Attack Scenario:** Attacker sends fake webhook with valid-looking payload (can't forge Stripe sig)
**Preconditions:** Knowledge of webhook URL
**Abuse Impact:** Minimal — signature verification blocks invalid events
**Existing Protections:** Stripe signature verification
**Missing Protection:** IP allowlist for Stripe webhook IPs
**Recommended Mitigation:** Optional — add Stripe IP allowlist as defense-in-depth
**Recommended Key:** N/A (network-level, not rate limit)
**Suggested Limit:** N/A
**Burst Behavior:** N/A
**False-Positive Risk:** Low — Stripe publishes IP ranges

### FINDING RL-25 — No Concurrent Session Limits

**Severity:** INFO
**Category:** Session Management
**File:** `lib/supabase/middleware.ts`
**Attack Scenario:** User logged in from multiple devices/browsers simultaneously
**Preconditions:** Stolen credentials or legitimate multi-device use
**Abuse Impact:** Minimal for most use cases
**Existing Protections:** Supabase session management
**Missing Protection:** Concurrent session limit
**Recommended Mitigation:** Optional — limit concurrent sessions per user if required by policy
**Recommended Key:** N/A (session management, not rate limit)
**Suggested Limit:** N/A
**Burst Behavior:** N/A
**False-Positive Risk:** Medium — legitimate multi-device use

---

## 15. Abuse Scenario Matrix

| # | Scenario | Current Protection | Result | Risk |
|---|---|---|---|---|
| 1 | 1,000 login attempts | App-level lockout (existing users only) | ALLOWS (non-existent emails) | CRITICAL |
| 2 | Password reset spam | None | ALLOWS | CRITICAL |
| 3 | OTP/2FA brute force | None | ALLOWS | CRITICAL |
| 4 | 1,000 message sends | None | ALLOWS | HIGH |
| 5 | 1,000 notification sends | None (role-gated) | ALLOWS | MEDIUM |
| 6 | Repeated PDF generation | None | ALLOWS | HIGH |
| 7 | Repeated report generation | None | ALLOWS | HIGH |
| 8 | Repeated checkout creation | None | ALLOWS | CRITICAL |
| 9 | Stripe webhook replay | Stripe signature only | ALLOWS (duplicates) | HIGH |
| 10 | 1,000 uploads | 10MB size limit only | ALLOWS | MEDIUM |
| 11 | Concurrent uploads | None | ALLOWS | MEDIUM |
| 12 | Repeated attendance mutations | Upsert dedup | BLOCKS (dedup) | LOW |
| 13 | Bulk exam submissions | Upsert dedup + 500 limit | BLOCKS (dedup) | LOW |
| 14 | Mobile API polling abuse | None | ALLOWS | MEDIUM |
| 15 | Search flooding | 100-char limit | LIMITS | LOW |
| 16 | Anonymous endpoint flooding | N/A (all authenticated) | N/A | LOW |
| 17 | Same-user abuse | None | ALLOWS | HIGH |
| 18 | Multi-user distributed abuse | None | ALLOWS | HIGH |
| 19 | Same-IP legitimate-user collision | N/A (no IP-based limits) | N/A | LOW |
| 20 | Serverless multi-instance bypass | N/A (single Docker instance) | N/A | LOW |

---

## 16. Existing Duplicate Protection vs Rate Limiting

### Already Protected (No Rate Limiting Needed)

| Protection | Location | Mechanism |
|---|---|---|
| Exam result submission | `exam.actions.ts` submitExamResult | Upsert on compound key |
| Attendance marking | `attendance.actions.ts` markAttendance | Upsert on compound key |
| Staff attendance | `attendance.actions.ts` markStaffAttendance | Upsert on compound key |
| Salary slip generation | `payroll.actions.ts` generateSalarySlips | Check before create |
| Announcement read tracking | `announcement.actions.ts` markAnnouncementAsRead | Upsert on compound key |
| Push subscription | `api/push/route.ts` | Upsert on user ID |
| Homework submit (partial) | `homework.actions.ts` submitHomework | findFirst + create (race condition) |

### Needs Rate Limiting (Insufficient Alone)

| Operation | Current | Required |
|---|---|---|
| Login | App lockout (existing users) | IP+email rate limit + CAPTCHA |
| Password reset | None | Rate limit + CAPTCHA |
| 2FA verification | None | Rate limit + lockout |
| Message sending | None | Per-user rate limit |
| Checkout creation | None | Per-user rate limit + idempotency |
| PDF/certificate generation | None | Per-user rate limit + caching |
| Report generation | None | Per-user rate limit + caching |
| File uploads | Size limit only | Per-user rate limit + quota |
| Dashboard loading | None | Per-user rate limit |

### Needs Idempotency (Not Rate Limiting)

| Operation | Current | Required |
|---|---|---|
| Webhook processing | None | Event.id dedup |
| Invoice generation | None | Unique constraint check |
| Fee plan assignment | None | Unique constraint check |
| Homework submission | Race condition | Unique constraint + upsert |
| Checkout creation | None | Stripe idempotency key |

### Needs Both Rate Limiting + Idempotency

| Operation | Current | Required |
|---|---|---|
| Checkout creation | None | Rate limit + Stripe idempotency key |
| Webhook processing | Signature only | Rate limit (defense) + event dedup |

---

## 17. Recommended Remediation Order

### Phase 5B — Critical & High Abuse Prevention

**Priority 1 (CRITICAL):**
1. Add global rate limiting middleware (proxy.ts or API middleware)
2. Add rate limiting to login (5 req/min per email+IP)
3. Add rate limiting to password reset (3 req/min per email)
4. Add 2FA brute force protection (3 attempts per 5 min, lockout after 5)
5. Add Stripe webhook event.id deduplication
6. Add rate limiting to checkout creation (5 req/min per user)

**Priority 2 (HIGH):**
7. Add CAPTCHA to login, signup, forgot-password forms
8. Add rate limiting to message sending (20/min per user)
9. Add rate limiting to PDF/certificate generation (20/min per user)
10. Add rate limiting to report generation (20/min per user)
11. Add caching headers to PDF/certificate endpoints
12. Require password re-verification before 2FA disable
13. Add unique constraint for invoice generation (student + session + fee structure)
14. Add unique constraint for fee plan assignment

### Phase 5C — Medium Abuse Prevention

15. Add rate limiting to file uploads (10/min per user)
16. Add per-user and per-school storage quotas
17. Add pagination to all unbounded GET endpoints
18. Add rate limiting to meeting creation (10/hour per user)
19. Cap meeting attendee count (max 100)
20. Fix homework submission race condition (use upsert)
21. Add rate limiting to notification creation
22. Cap `getNotifications` limit parameter (max 100)
23. Fix invitation memory issue (replace listUsers with email lookup)

### Phase 5D — Low / Defense-in-Depth

24. Fix receipt number race condition (use UUID or atomic sequence)
25. Add generic error messages for invitation/token failures
26. Add cache headers to remaining expensive endpoints
27. Add Stripe IP allowlist (optional)
28. Add concurrent session limits (optional)
29. Add CSRF fail-closed behavior when env is missing

---

## 18. Files That Would Likely Change

| File | Changes Expected |
|---|---|
| `proxy.ts` | Add global rate limiting middleware |
| `lib/rate-limit.ts` | NEW — rate limiting utility |
| `actions/auth.actions.ts` | Add rate limit checks to signin, forgotPassword, signup |
| `actions/two-factor.actions.ts` | Add 2FA attempt tracking and lockout |
| `actions/message.actions.ts` | Add rate limit check to sendMessage |
| `actions/fees.actions.ts` | Add dedup checks to generateInvoice, assignFeePlan |
| `actions/notification.actions.ts` | Add rate limit + cap limit param |
| `actions/meeting.actions.ts` | Add attendee count cap + rate limit |
| `actions/homework.actions.ts` | Fix race condition with upsert |
| `actions/auth.actions.ts` inviteUser | Replace listUsers with email lookup |
| `api/payments/webhook/route.ts` | Add event.id dedup + atomic receipt numbers |
| `api/payments/checkout/route.ts` | Add rate limit + Stripe idempotency key |
| `api/invoices/pdf/route.ts` | Add rate limit + cache headers |
| `api/certificates/route.ts` | Add rate limit + cache headers |
| `api/mobile/messages/send/route.ts` | Add rate limit |
| `api/mobile/id-card/[userId]/pdf/route.ts` | Add rate limit |
| `api/upload/homework/route.ts` | Add rate limit + storage quotas |
| Various GET routes | Add pagination |
| Auth forms (login, signup, forgot-password) | Add CAPTCHA |

---

## 19. Non-Goals

The following were NOT audited or changed in Phase 5A:

- DDoS protection (infrastructure-level, not application-level)
- WAF configuration
- Supabase-level rate limiting (managed service)
- CDN caching
- Load balancer configuration
- DNS security
- SSL/TLS configuration
- Security headers (already present from Phase 3)
- RLS policies (already audited in Phase 2)
- Input validation (already audited in Phase 4)
- Authentication architecture (already audited in Phase 3)

---

## 20. Final Scorecard

```
Rate Limiting Present: NO (2 of 44 routes have in-memory limits)

CRITICAL: 4
HIGH: 7
MEDIUM: 7
LOW: 4
INFO: 3

Authentication Abuse Protection: FAIL
  - Login brute force: PARTIAL (app-level only, bypassable)
  - Password reset abuse: FAIL (no protection)
  - 2FA brute force: FAIL (no protection)
  - Signup abuse: FAIL (no protection)
  - CAPTCHA: FAIL (none anywhere)

API Abuse Protection: FAIL
  - Rate limiting: FAIL (2/44 routes)
  - Global middleware: FAIL (none)
  - Pagination: FAIL (6+ unbounded endpoints)

Server Action Abuse Protection: FAIL
  - Rate limiting: FAIL (none)
  - Duplicate prevention: PARTIAL (some upserts, some missing)

Upload Abuse Protection: PARTIAL
  - File size limit: PASS (10MB)
  - MIME validation: PASS
  - Rate limiting: FAIL
  - Storage quotas: FAIL

Payment Abuse Protection: FAIL
  - Checkout rate limiting: FAIL
  - Webhook dedup: FAIL
  - Idempotency: FAIL

Messaging Spam Protection: FAIL
  - Message rate limiting: FAIL
  - Content limits: PARTIAL (API route has 5000, server action has none)

Resource Exhaustion Protection: FAIL
  - Report generation: FAIL (16 parallel queries, no limit)
  - PDF generation: FAIL (no rate limit, no caching)
  - Dashboard: FAIL (expensive, no caching)

Mobile API Abuse Protection: FAIL
  - Rate limiting: FAIL (0/27 routes)
  - Pagination: FAIL (6+ unbounded)

PHASE 5A AUDIT COMPLETE: YES
```

---

## PHASE 5A GATE: AUDIT COMPLETE
