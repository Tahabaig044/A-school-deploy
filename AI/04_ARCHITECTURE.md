# 04 - ARCHITECTURE

> System architecture. Ye samjho toh sab samajh aa jayega.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client (Browser)                     │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   Pages     │  │ Components  │  │   Hooks     │   │
│  │  (Server)   │  │  (Client)   │  │  (Client)   │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   Next.js Server                        │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   Pages     │  │Server Actions│  │   API       │   │
│  │  (RSC)      │  │  (Mutations)│  │  (Routes)   │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    Services Layer                       │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   Auth      │  │   Business  │  │   Storage   │   │
│  │  Service    │  │   Logic     │  │   Service   │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    Data Layer                           │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   Prisma    │  │  Supabase   │  │   Redis     │   │
│  │    ORM      │  │   Client    │  │   Cache     │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    Database                             │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              PostgreSQL (Supabase)              │   │
│  │                                                 │   │
│  │  - Tables                                       │   │
│  │  - Row Level Security                           │   │
│  │  - Functions                                    │   │
│  │  - Triggers                                     │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

### Read Flow (Server Component)

```
1. Browser requests page
2. Next.js server receives
3. Server Component executes
4. Prisma queries database
5. Data returned to component
6. HTML rendered
7. Sent to browser
```

### Write Flow (Server Action)

```
1. User submits form
2. Server Action called
3. Zod validates input
4. Permission check
5. School context check
6. Prisma writes to database
7. Audit log created
8. Revalidation triggered
9. UI updated
```

## Authentication Flow

```
1. User enters credentials
2. Supabase Auth validates
3. JWT token returned
4. Token stored in cookie
5. Middleware checks token
6. User context available
7. Permissions loaded
```

## Multi-Tenancy Flow

```
1. User logged in
2. School ID from JWT
3. All queries filtered by school_id
4. RLS policies enforce
5. Cross-tenant access blocked
```

## Component Architecture

### Server Components

- Fetch data directly
- No client-side JS
- Automatic streaming
- SEO friendly

### Client Components

- Interactive UI
- Event handlers
- Browser APIs
- State management

### Shared Components

- Used by both
- No side effects
- Pure functions
- Reusable

## File Organization

```
src/
├── app/
│   ├── (auth)/           # Auth routes
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/      # Protected routes
│   │   ├── students/
│   │   ├── teachers/
│   │   └── ...
│   ├── api/              # API routes (rare)
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/
│   ├── ui/               # Base components
│   ├── forms/            # Form components
│   ├── layout/           # Layout components
│   └── [module]/         # Module components
├── lib/
│   ├── prisma.ts         # Prisma client
│   ├── supabase.ts       # Supabase client
│   ├── validations/      # Zod schemas
│   └── utils.ts          # Helpers
├── actions/
│   ├── auth.ts           # Auth actions
│   ├── students.ts       # Student actions
│   └── ...
├── hooks/                # Custom hooks
├── types/                # TypeScript types
└── config/               # Configuration
```

## State Management

### Server State

- Fetched in Server Components
- Cached by Next.js
- Revalidated on mutation

### Client State

- useState for local state
- URL state for filters
- No global state library

### Form State

- React Hook Form
- Zod validation
- Server Action submission

## Caching Strategy

| Data Type    | Cache   | Revalidation |
| ------------ | ------- | ------------ |
| Static pages | ISR     | On demand    |
| User data    | Session | On mutation  |
| Lists        | 1 hour  | On mutation  |
| Counts       | 5 min   | On mutation  |

## Security Layers

```
1. Middleware (Auth check)
2. Server Component (Data access)
3. Server Action (Permission check)
4. Zod Schema (Input validation)
5. Prisma (Query parameterization)
6. RLS (Row-level security)
```

---

> **Remember:** Architecture samjho toh debugging easy ho jayega. Har layer ka role pata hona chahiye.
