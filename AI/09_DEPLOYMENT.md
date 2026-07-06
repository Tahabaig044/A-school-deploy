# 09 - DEPLOYMENT

> Deployment rules. Production mein jaane se pehle ye padho.

---

## Deployment Stack

| Component | Technology |
|-----------|------------|
| Hosting | Vercel |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase Storage |
| CI/CD | GitHub Actions |
| Monitoring | Vercel Analytics |

## Environment Variables

### Required
```env
# Database
DATABASE_URL=postgresql://...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Auth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://...
```

### Forbidden to Commit
- .env.local
- .env.production
- Any file with secrets

## Build Commands

```bash
# Install dependencies
npm install

# Type check
npm run typecheck

# Lint
npm run lint

# Build
npm run build

# Test
npm test
```

## Deployment Checklist

### Before Deploy
- [ ] All tests pass
- [ ] TypeScript compiles
- [ ] No lint errors
- [ ] Build succeeds
- [ ] Environment variables set
- [ ] Database migrations run

### After Deploy
- [ ] Health check passes
- [ ] Auth works
- [ ] Core features work
- [ ] No console errors
- [ ] Performance acceptable

## CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: amondnet/vercel-action@v20
```

## Rollback Procedure

1. Identify issue
2. Revert to last working commit
3. Push to main
4. Verify deployment
5. Document issue

## Monitoring

- Check Vercel dashboard for errors
- Monitor response times
- Check database connections
- Review error logs

---

> **Remember:** Never deploy on Friday. Always have rollback plan.
