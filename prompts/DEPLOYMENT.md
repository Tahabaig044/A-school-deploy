# DEPLOYMENT_PROMPT

## Usage
When deploying, use this prompt.

## Prompt

```
Read:
- 00_AI_MASTER_RULES.md
- 09_DEPLOYMENT.md
- Current version info

Task:
1. Run type check
2. Run lint
3. Run tests
4. Run build
5. Check environment variables
6. Deploy to staging
7. Verify deployment
8. Deploy to production
9. Monitor for issues

Deployment Checklist:
- [ ] All tests pass
- [ ] TypeScript compiles
- [ ] No lint errors
- [ ] Build succeeds
- [ ] Environment variables set
- [ ] Database migrations run
- [ ] Health check passes
- [ ] Core features work
- [ ] No console errors

Rollback Plan:
1. Revert to last working commit
2. Push to main
3. Verify deployment
4. Document issue
```
