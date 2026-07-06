# 03 - TECH STACK

> Technology choices. Ye mat pucho "kaunsa library use karun" - sab yahan likha hai.

---

## Core Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Framework | Next.js | 14.x | React framework |
| Language | TypeScript | 5.x | Type safety |
| Database | PostgreSQL | 15+ | Primary database |
| ORM | Prisma | 5.x | Database access |
| Auth | Supabase Auth | Latest | Authentication |
| Storage | Supabase Storage | Latest | File storage |
| Styling | Tailwind CSS | 3.x | CSS framework |
| Validation | Zod | 3.x | Schema validation |
| State | Server Components | - | React state |
| Forms | React Hook Form | Latest | Form handling |

## UI Components

| Library | Purpose | Notes |
|---------|---------|-------|
| shadcn/ui | Base components | Customizable |
| Radix UI | Primitives | Accessible |
| Lucide React | Icons | Consistent |
| Recharts | Charts | Lazy load |
| React Day Picker | Date picker | Accessible |

## Development Tools

| Tool | Purpose |
|------|---------|
| ESLint | Code linting |
| Prettier | Code formatting |
| Husky | Git hooks |
| lint-staged | Pre-commit checks |
| TypeScript | Type checking |

## Database Choices

### Why PostgreSQL?
- ACID compliance
- JSON support
- Full-text search
- Row-level security
- Supabase native

### Why Prisma?
- Type-safe queries
- Auto-generated types
- Migration management
- Studio for debugging
- Good DX

### Why Supabase?
- Built-in auth
- Row-level security
- Real-time subscriptions
- File storage
- Free tier available

## Server Actions vs API Routes

### Use Server Actions When:
- Form submissions
- Data mutations
- Simple CRUD
- No public API needed

### Use API Routes When:
- Webhooks
- External integrations
- Complex responses
- Public endpoints

## Validation Strategy

```
Client Side: React Hook Form + Zod
     ↓
Server Side: Zod schema validation
     ↓
Database: Prisma constraints
```

## Error Handling

```typescript
// App-level errors
app/error.tsx

// Route-level errors
app/[route]/error.tsx

// Not found
app/not-found.tsx

// Global error
app/global-error.tsx
```

## File Structure

```
src/
├── app/              # Next.js App Router
├── components/       # Reusable components
├── lib/             # Utilities
│   ├── prisma.ts    # Prisma client
│   ├── supabase.ts  # Supabase client
│   ├── zod.ts       # Zod schemas
│   └── utils.ts     # Helpers
├── actions/         # Server Actions
├── hooks/           # Custom hooks
├── types/           # TypeScript types
└── config/          # Configuration
```

## Forbidden Libraries

Ye libraries mat use karo:

| Library | Reason |
|---------|--------|
| Express | Next.js has own server |
| Axios | Use fetch |
| moment.js | Use date-fns |
| Redux | Use Server Components |
| Material UI | Use shadcn/ui |
| Bootstrap | Use Tailwind |

## Why Not...

### Why not API Routes?
Server Actions better hain:
- Simpler syntax
- No manual fetch
- Type-safe
- Progressive enhancement

### Why not client-side state?
Server Components better hain:
- Less JavaScript
- Better performance
- Automatic caching
- Simpler mental model

### Why not MongoDB?
PostgreSQL better hai:
- ACID compliance
- Complex queries
- Row-level security
- Better for relations

---

> **Remember:** Ye choices final hain. Naya stack mat banao. Ye kaam karta hai.
