# Deployment Guide

## Environment Setup

### Development
```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Run migrations
npx prisma migrate dev

# Seed database
npx prisma db seed

# Start development server
npm run dev
```

### Production
```bash
# Build application
npm run build

# Run migrations
npx prisma migrate deploy

# Start production server
npm start
```

## Environment Variables

### Required
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/school_db

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRATION=15m
REFRESH_TOKEN_SECRET=your-refresh-secret
REFRESH_TOKEN_EXPIRATION=7d

# Server
PORT=3000
NODE_ENV=production
API_URL=https://api.yourschool.com
```

### Optional
```env
# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password

# File Storage
STORAGE_TYPE=local # or s3
AWS_S3_BUCKET=your-bucket
AWS_ACCESS_KEY=your-key
AWS_SECRET_KEY=your-secret

# Redis
REDIS_URL=redis://localhost:6379
```

## Docker Deployment

### Dockerfile
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3000
CMD ["npm", "start"]
```

### Docker Compose
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/school_db
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=school_db
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## CI/CD Pipeline

### GitHub Actions
```yaml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: |
          # Your deployment script
```

## Nginx Configuration

```nginx
server {
    listen 80;
    server_name api.yourschool.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourschool.com;

    ssl_certificate /etc/letsencrypt/live/api.yourschool.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourschool.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Monitoring

### Health Check Endpoint
```
GET /api/v1/health

Response:
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "uptime": 12345,
  "database": "connected",
  "redis": "connected"
}
```

### Logging
- Use Winston for logging
- Log levels: error, warn, info, debug
- Structured JSON logs
- Request ID tracking

## Backup Strategy

### Database Backups
```bash
# Daily backup
pg_dump -U postgres school_db > backup_$(date +%Y%m%d).sql

# Restore
psql -U postgres school_db < backup_20240101.sql
```

### Retention Policy
- Daily backups: 7 days
- Weekly backups: 4 weeks
- Monthly backups: 12 months
