# 10 - TESTING

> Testing rules. Tests likho toh bugs kam honge.

---

## Testing Stack

| Tool | Purpose |
|------|---------|
| Vitest | Unit testing |
| React Testing Library | Component testing |
| Playwright | E2E testing |
| MSW | API mocking |

## Test Types

### Unit Tests
- Test individual functions
- Fast execution
- No side effects

### Component Tests
- Test React components
- User interactions
- Rendering

### E2E Tests
- Test full flows
- Browser automation
- Critical paths

## Test Rules

### NEVER Rules

1. **Never skip tests for new features**
2. **Never test implementation details**
3. **Never rely on external services**
4. **Never skip edge cases**
5. **Never test third-party code**

### ALWAYS Rules

1. **Always test happy path**
2. **Always test error cases**
3. **Always test loading states**
4. **Always test empty states**
5. **Always mock external dependencies**

## Test Structure

```typescript
describe('StudentService', () => {
  describe('createStudent', () => {
    it('should create student with valid data', async () => {
      // Arrange
      const data = { firstName: 'John', lastName: 'Doe' }
      
      // Act
      const result = await createStudent(data)
      
      // Assert
      expect(result).toHaveProperty('id')
      expect(result.firstName).toBe('John')
    })

    it('should throw error with invalid data', async () => {
      // Arrange
      const data = { firstName: '' }
      
      // Act & Assert
      await expect(createStudent(data)).rejects.toThrow()
    })
  })
})
```

## Coverage Requirements

| Type | Minimum |
|------|---------|
| Statements | 80% |
| Branches | 75% |
| Functions | 80% |
| Lines | 80% |

## Test Commands

```bash
# Run all tests
npm test

# Run with coverage
npm run test:cov

# Run in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e
```

## Mocking Rules

- Mock database calls
- Mock external APIs
- Mock file system
- Do not mock utilities

## Forbidden Patterns

- Do not test CSS
- Do not test third-party libraries
- Do not use real database in tests
- Do not skip failing tests

---

> **Remember:** If it's not tested, it's broken. Always write tests.
