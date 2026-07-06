# SECURITY_PROMPT

## Usage
When reviewing security, use this prompt.

## Prompt

```
Read:
- 00_AI_MASTER_RULES.md
- 06_AUTH.md
- 07_PERMISSIONS.md
- Files to review

Task:
1. Check authentication
2. Check authorization
3. Check input validation
4. Check SQL injection
5. Check XSS
6. Check CSRF
7. Check rate limiting
8. Check audit logging

Security Checklist:
- [ ] No hardcoded secrets
- [ ] Passwords hashed
- [ ] Input validated with Zod
- [ ] Permissions verified
- [ ] School context verified
- [ ] Audit logged
- [ ] Rate limiting enabled
- [ ] HTTPS enforced
- [ ] httpOnly cookies
- [ ] No sensitive data exposed
```
