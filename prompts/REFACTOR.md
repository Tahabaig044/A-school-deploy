# REFACTOR_PROMPT

## Usage

When refactoring code, use this prompt.

## Prompt

```
Read:
- 00_AI_MASTER_RULES.md
- Files to refactor

Task:
1. Identify code smells
2. Plan refactoring approach
3. Refactor step by step
4. Ensure no behavior change
5. Run tests
6. Run build

Constraints:
- Do not change external behavior
- Do not break existing features
- Keep same API
- Improve code quality only

Refactoring Targets:
- Duplicate code
- Long functions
- Complex conditionals
- Missing types
- Poor naming
```
