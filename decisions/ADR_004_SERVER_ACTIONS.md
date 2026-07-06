# ADR_004 - SERVER ACTIONS

## Status
Approved

## Context
Need to handle form submissions and data mutations.

## Decision
Use Server Actions instead of API routes for:
- Form submissions
- Data mutations
- Server-side logic

## Consequences

### Positive
- Simpler syntax
- No manual fetch
- Type-safe
- Progressive enhancement
- Better DX

### Negative
- Less control over response
- Not suitable for webhooks
- Limited caching options

## When to Use API Routes
- Webhooks
- External integrations
- Complex responses
- Public endpoints

## Date
[Date]
