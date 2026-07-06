# PERFORMANCE_PROMPT

## Usage
When reviewing performance, use this prompt.

## Prompt

```
Read:
- 00_AI_MASTER_RULES.md
- Files to review

Task:
1. Check query performance
2. Check N+1 queries
3. Check caching
4. Check bundle size
5. Check loading states
6. Check pagination

Performance Checklist:
- [ ] No N+1 queries
- [ ] Pagination implemented
- [ ] Loading states added
- [ ] Lazy loading for charts
- [ ] Database indexes used
- [ ] Caching implemented
- [ ] Images optimized
- [ ] Bundle size acceptable

Performance Targets:
- API response < 200ms
- Page load < 2s
- LCP < 2.5s
- FID < 100ms
```
