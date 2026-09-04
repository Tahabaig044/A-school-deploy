# 00 - AI MASTER RULES

> **IMPORTANT:** Har AI session is file se start hoga.
> Ye sabse important file hai. Pehle padho, phir kuch bhi karo.

---

## NEVER Rules (Hard Constraints)

Ye rules kabhi break nahi karne:

1. **Never rewrite working code** - Agar code kaam kar raha hai, mat chuo
2. **Never modify unrelated files** - Sirf allowed files modify karo
3. **One loop = One module** - Ek loop mein sirf ek module ka kaam
4. **Build must always pass** - Har change ke baad build check karo
5. **Never break authentication** - Auth system kabhi mat todo
6. **Never change Prisma schema without approval** - Schema change ke liye approval zaroori
7. **Never trust client** - Server-side validation zaroori
8. **Never trust hidden fields** - Hidden field bhi validate karo
9. **Never create duplicate components** - Reuse karo, duplicate mat banao
10. **Never duplicate queries** - Same query baar baar mat likho

## ALWAYS Rules (Must Do)

Ye rules hamesha follow karo:

1. **Always use Server Actions** - API routes mat banao, Server Actions use karo
2. **Always use Zod** - Input validation ke liye Zod zaroori
3. **Always generate report** - Loop complete hone pe report generate karo
4. **Always verify permissions** - Har action pe permission check karo
5. **Always verify school** - Multi-tenancy ke liye school verify karo
6. **Always verify branch** - Branch context maintain karo
7. **Always log audit** - Important actions ka audit log banao
8. **Always validate input** - Zod schema se validate karo
9. **Always use pagination** - List endpoints mein pagination zaroori
10. **Always use Suspense** - Loading states dikhao

## AI Development Lifecycle

Har feature ye follow karega:

```
Read
  ↓
Master Rules
  ↓
Project Context
  ↓
Current Phase
  ↓
Current Loop
  ↓
Implement
  ↓
Self Review
  ↓
Generate Loop Report
  ↓
Update Changelog
  ↓
Stop
```

## AI Self Review Checklist

Har task ke baad ye check karo:

- [ ] Files Modified: [List]
- [ ] Build Status: Pass/Fail
- [ ] TypeScript: Pass/Fail
- [ ] Prisma: Pass/Fail
- [ ] Security: Pass/Fail
- [ ] Performance: Pass/Fail
- [ ] Risk Level: Low/Medium/High
- [ ] Breaking Changes: Yes/No
- [ ] Remaining Bugs: [List]
- [ ] Next Loop: [Name]

## Performance Rules

AI must:

- [ ] Never create N+1 queries
- [ ] Always use pagination
- [ ] Always use Suspense
- [ ] Always lazy load charts
- [ ] Use database indexes
- [ ] Cache frequently accessed data
- [ ] Optimize images
- [ ] Use streaming for large data

## Security Rules

AI must:

- [ ] Never trust client input
- [ ] Never trust hidden fields
- [ ] Always verify permissions
- [ ] Always verify school context
- [ ] Always verify branch context
- [ ] Always log audit trails
- [ ] Always validate with Zod
- [ ] Always use parameterized queries
- [ ] Never expose sensitive data
- [ ] Never commit secrets

## Release Cycle

Har release ke liye:

```
Security Audit
  ↓
Performance Audit
  ↓
Database Audit
  ↓
Build
  ↓
Type Check
  ↓
Release Notes
  ↓
Version Tag
```

## AI Commands

Long prompts likhne ki zaroorat nahi. Bas ye bolo:

```
Read:
- 00_AI_MASTER_RULES.md
- 01_PROJECT_CONTEXT.md
- PHASE_03
- LOOP_004

Execute.
```

AI ko sab pata hai.

## Stop Conditions

AI ko rukna hai jab:

- Task complete ho jaye
- Error aaye
- Unclear instruction ho
- Breaking change ho
- Security issue ho
- Performance degradation ho

## File Modification Rules

| File Type            | Allowed              | Approval Needed |
| -------------------- | -------------------- | --------------- |
| AI/*.md              | Only current session | No              |
| src/**/*.tsx         | Allowed              | No              |
| src/**/*.ts          | Allowed              | No              |
| prisma/schema.prisma | FORBIDDEN            | Yes             |
| package.json         | FORBIDDEN            | Yes             |
| .env                 | FORBIDDEN            | Yes             |
| next.config.js       | FORBIDDEN            | Yes             |

---

> **Remember:** Agar confused ho, toh ruko aur pucho. Galat kaam mat karo.
