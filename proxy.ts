import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

function getAllowedOrigins(): string[] {
  const defaults = ["http://localhost:8080", "http://localhost:3000"]
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ""
  if (appUrl) defaults.push(appUrl)
  const extra = (process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  return [...new Set([...defaults, ...extra])]
}

const CORS_ALLOWED_ORIGINS = getAllowedOrigins()

function setCorsHeaders(response: NextResponse, origin: string | null) {
  if (origin && CORS_ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin)
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
    response.headers.set("Access-Control-Allow-Credentials", "true")
    response.headers.set("Access-Control-Max-Age", "86400")
  }
}

function logPerf(label: string, ms: number) {
  if (process.env.NODE_ENV === "production") return
  console.log(`[PERF] ${label}: ${ms.toFixed(0)}ms`)
}

const publicRoutes = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/setup-password",
]

const roleRouteMap: Record<string, string[]> = {
  "/dashboard/schools": ["SUPER_ADMIN"],
  "/dashboard/branches": ["SUPER_ADMIN", "SCHOOL_ADMIN"],
  "/dashboard/users": ["SUPER_ADMIN", "SCHOOL_ADMIN"],
  "/dashboard/sessions": ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN"],
  "/dashboard/classes": ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PRINCIPAL"],
  "/dashboard/subjects": ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER", "PRINCIPAL"],
  "/dashboard/teachers": ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN"],
  "/dashboard/parents": ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN"],
  "/dashboard/students": [
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "ADMISSION_OFFICER",
    "TEACHER",
  ],
  "/dashboard/staff": ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN"],
  "/dashboard/attendance": ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER"],
  "/dashboard/exams": ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER"],
  "/dashboard/fees": ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT"],
  "/dashboard/expenses": ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "ACCOUNTANT"],
  "/dashboard/timetable": ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER"],
  "/dashboard/announcements": ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER"],
  "/dashboard/homework": ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER"],
  "/dashboard/library": ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "LIBRARIAN"],
  "/dashboard/transport": ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TRANSPORT_MANAGER"],
  "/dashboard/reports": ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN", "TEACHER"],
  "/dashboard/notifications": [
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "TEACHER",
    "STUDENT",
    "PARENT",
  ],
  "/dashboard/messages": [
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "TEACHER",
    "STUDENT",
    "PARENT",
  ],
  "/dashboard/meetings": [
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "PRINCIPAL",
    "TEACHER",
    "PARENT",
  ],
  "/dashboard/events": [
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "PRINCIPAL",
    "TEACHER",
    "STUDENT",
    "PARENT",
  ],
  "/dashboard/calendar": [
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "PRINCIPAL",
    "TEACHER",
    "STUDENT",
    "PARENT",
  ],
  "/dashboard/settings": ["SUPER_ADMIN", "SCHOOL_ADMIN", "BRANCH_ADMIN"],
  "/id-card": [
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "BRANCH_ADMIN",
    "PRINCIPAL",
    "TEACHER",
    "STUDENT",
    "PARENT",
    "ACCOUNTANT",
    "ADMISSION_OFFICER",
    "LIBRARIAN",
    "TRANSPORT_MANAGER",
  ],
}

const portalAllowedRoles = ["STUDENT", "PARENT", "TEACHER"]

const teacherBlockedRoutes = ["/dashboard"]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const start = performance.now()

  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  // Mobile API routes authenticate via `Authorization: Bearer <Supabase JWT>`
  // inside the route handlers (see lib/supabase/mobile-auth.ts), so they must
  // NOT require a browser cookie session. Security headers still apply below.
  const isMobileApiRoute = pathname.startsWith("/api/mobile/")

  if (isPublicRoute || isMobileApiRoute || pathname === "/") {
    // Dev-only CORS for Flutter web (localhost:8080 / :3000)
    if (isMobileApiRoute && process.env.NODE_ENV !== "production") {
      const origin = request.headers.get("origin")
      const isPreflight = request.method === "OPTIONS"

      if (isPreflight) {
        const preflight = new NextResponse(null, { status: 204 })
        setCorsHeaders(preflight, origin)
        return preflight
      }

      const response = NextResponse.next({ request })
      setCorsHeaders(response, origin)
      return response
    }

    return NextResponse.next({ request })
  }

  const { user, supabaseResponse } = await updateSession(request)

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return Response.redirect(url)
  }

  logPerf(`middleware ${pathname}`, performance.now() - start)

  // F3: role comes from the session's user metadata (set at signup/invite) —
  // no Prisma query in middleware. This is defense-in-depth only; the real
  // authorization is requireRole() in pages/actions (DB-backed).
  const role = (user.user_metadata?.role as string | undefined) ?? ""

  // Block teachers from admin dashboard
  if (role === "TEACHER" && teacherBlockedRoutes.some((route) => pathname.startsWith(route))) {
    const url = request.nextUrl.clone()
    url.pathname = "/portal/teacher"
    return Response.redirect(url)
  }

  // Only apply role-based redirects when a role is present in session metadata;
  // a missing metadata role is handled by the DB-backed requireRole() checks.
  if (role) {
    if (pathname.startsWith("/portal") && !portalAllowedRoles.includes(role)) {
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard"
      return Response.redirect(url)
    }

    for (const [route, allowedRoles] of Object.entries(roleRouteMap)) {
      if (pathname.startsWith(route) && !allowedRoles.includes(role)) {
        const url = request.nextUrl.clone()
        url.pathname = "/dashboard"
        return Response.redirect(url)
      }
    }
  }

  // F5: no X-User-* identity headers are placed on the response (they would
  // leak to the browser). Server components read identity via getCurrentUser().

  supabaseResponse.headers.set("X-Frame-Options", "DENY")
  supabaseResponse.headers.set("X-Content-Type-Options", "nosniff")
  supabaseResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  supabaseResponse.headers.set("X-XSS-Protection", "1; mode=block")

  return supabaseResponse
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
