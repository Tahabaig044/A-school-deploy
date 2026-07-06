# BUG_FIX_PROMPT

## Usage
When fixing a bug, use this prompt.

## Prompt

```
Read:
- 00_AI_MASTER_RULES.md
- Current bug file (bugs/BUG_XXX.md)

Task:
1. Analyze root cause
2. Identify affected files
3. Implement fix
4. Verify fix works
5. Check for regressions
6. Update bug file
7. Generate report

Constraints:
- Only modify allowed files
- Do not break other features
- Run build after fix
- Run tests after fix
```
