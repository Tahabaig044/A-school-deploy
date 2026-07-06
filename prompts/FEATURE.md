# FEATURE_PROMPT

## Usage
When implementing a new feature, use this prompt.

## Prompt

```
Read:
- 00_AI_MASTER_RULES.md
- 01_PROJECT_CONTEXT.md
- Current phase file
- Current loop file

Task:
1. Understand the feature requirements
2. Identify allowed files
3. Implement feature step by step
4. Add validations with Zod
5. Add error handling
6. Add loading states
7. Add empty states
8. Test the feature
9. Generate loop report
10. Update changelog

Constraints:
- Only modify allowed files
- Follow existing patterns
- Use existing components
- Do not add new dependencies
- Build must pass
```
