# ADR_001 - USE SUPABASE

## Status
Approved

## Context
Need authentication and database hosting solution.

## Decision
Use Supabase for:
- Authentication (JWT, OAuth)
- PostgreSQL database
- Row-level security
- File storage
- Real-time subscriptions

## Consequences

### Positive
- Built-in auth
- Free tier available
- Good DX
- Type-safe with Supabase JS

### Negative
- Vendor lock-in
- Limited customization
- Cold starts on free tier

## Alternatives Considered
- Firebase: Less SQL-friendly
- AWS Cognito: More complex
- Custom auth: More work

## Date
[Date]
