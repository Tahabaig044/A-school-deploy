# 06 - AUTH

> Authentication rules. Ye system safe rakhna hai.

---

## Auth Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Provider | Supabase Auth | Authentication |
| Tokens | JWT | Session management |
| Cookies | httpOnly | Token storage |
| Middleware | Next.js | Route protection |

## Auth Flow

### Registration
```
1. User fills form
2. Zod validates input
3. Supabase creates user
4. Profile created in DB
5. School assigned
6. Welcome email sent
7. Redirect to login
```

### Login
```
1. User enters credentials
2. Supabase validates
3. JWT token generated
4. Token stored in cookie
5. User context loaded
6. Redirect to dashboard
```

### Logout
```
1. User clicks logout
2. Session invalidated
3. Cookie cleared
4. Redirect to login
```

## Core Rules

### NEVER Rules

1. **Never store passwords in plain text**
2. **Never skip password hashing**
3. **Never expose JWT secret**
4. **Never trust client-side auth checks**
5. **Never allow brute force attacks**
6. **Never skip rate limiting**
7. **Never log sensitive data**
8. **Never use weak passwords**
9. **Never skip email verification**
10. **Never allow session fixation**

### ALWAYS Rules

1. **Always hash passwords with bcrypt (12 rounds)**
2. **Always validate input with Zod**
3. **Always use HTTPS**
4. **Always set httpOnly cookies**
5. **Always implement rate limiting**
6. **Always log auth events**
7. **Always verify email**
8. **Always use secure headers**
9. **Always implement CSRF protection**
10. **Always handle token expiry**

## Implementation

### Server Action: Register
```typescript
// actions/auth.ts
'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
})

export async function register(data: FormData) {
  // 1. Validate input
  const validated = registerSchema.parse({
    email: data.get('email'),
    password: data.get('password'),
    firstName: data.get('firstName'),
    lastName: data.get('lastName'),
  })

  // 2. Create user in Supabase
  const supabase = createClient()
  const { data: authData, error } = await supabase.auth.signUp({
    email: validated.email,
    password: validated.password,
  })

  if (error) throw error

  // 3. Create profile in DB
  await prisma.user.create({
    data: {
      id: authData.user!.id,
      email: validated.email,
      firstName: validated.firstName,
      lastName: validated.lastName,
    }
  })

  // 4. Return success
  return { success: true }
}
```

### Server Action: Login
```typescript
export async function login(data: FormData) {
  // 1. Validate input
  const validated = loginSchema.parse({
    email: data.get('email'),
    password: data.get('password'),
  })

  // 2. Authenticate with Supabase
  const supabase = createClient()
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: validated.email,
    password: validated.password,
  })

  if (error) throw error

  // 3. Log auth event
  await prisma.auditLog.create({
    data: {
      userId: authData.user.id,
      action: 'LOGIN',
      ip: getClientIp(),
    }
  })

  // 4. Redirect to dashboard
  redirect('/dashboard')
}
```

### Middleware: Route Protection
```typescript
// middleware.ts
import { createClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Protected routes
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Public routes
  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}
```

## Password Rules

### Validation
```typescript
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
```

### Hashing
```typescript
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
```

## Rate Limiting

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 requests per 15 minutes
})

export async function checkRateLimit(key: string) {
  const { success, limit, remaining } = await ratelimit.limit(key)
  return { success, limit, remaining }
}
```

## Session Management

### Token Structure
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "admin",
  "schoolId": "school-uuid",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Token Expiry
- Access Token: 15 minutes
- Refresh Token: 7 days

## Security Headers

```typescript
// next.config.js
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
]
```

## Audit Logging

```typescript
// Log all auth events
await prisma.auditLog.create({
  data: {
    userId: user.id,
    action: 'LOGIN', // LOGIN, LOGOUT, REGISTER, PASSWORD_CHANGE
    ip: getClientIp(),
    userAgent: getUserAgent(),
    success: true,
  }
})
```

---

> **Remember:** Authentication is the first line of defense. Never compromise on security.
