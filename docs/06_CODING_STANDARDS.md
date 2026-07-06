# Coding Standards

## TypeScript/JavaScript

### General
- Use TypeScript for all new code
- Strict mode enabled
- No `any` types (use `unknown` if needed)
- Prefer interfaces over types for objects
- Use readonly for immutable data

### Naming
```typescript
// Variables & Functions: camelCase
const studentCount = 0;
function calculateGrade() {}

// Classes & Interfaces: PascalCase
class StudentService {}
interface StudentDto {}

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;

// Private members: prefix with underscore
private _cache = new Map();
```

### Functions
```typescript
// Prefer arrow functions for callbacks
const numbers = [1, 2, 3].map(n => n * 2);

// Use named functions for statements
function calculateAverage(scores: number[]): number {
  const sum = scores.reduce((a, b) => a + b, 0);
  return sum / scores.length;
}

// Maximum 3 parameters, use object for more
function createStudent(data: CreateStudentDto) {}
```

### Classes
```typescript
class StudentService {
  // Properties first
  private readonly studentRepository: StudentRepository;
  
  // Constructor
  constructor(studentRepository: StudentRepository) {
    this.studentRepository = studentRepository;
  }
  
  // Public methods
  async findById(id: string): Promise<Student> {}
  
  // Private methods
  private validateInput(data: any) {}
}
```

## React/Next.js

### Component Structure
```typescript
// Functional components only
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export const Button = ({ label, onClick, variant = 'primary' }: ButtonProps) => {
  return (
    <button className={`btn btn-${variant}`} onClick={onClick}>
      {label}
    </button>
  );
};
```

### Hooks Rules
- Custom hooks prefixed with `use`
- Extract logic into custom hooks
- No conditional hooks
- Dependency arrays must be complete

### State Management
- Local state for UI state
- Context for shared state
- Server state via API hooks
- No prop drilling beyond 2 levels

## CSS/Styling

### Class Naming (BEM)
```css
/* Block */
.card {}

/* Element */
.card__header {}
.card__content {}
.card__footer {}

/* Modifier */
.card--highlighted {}
.card__header--primary {}
```

### CSS Variables
```css
:root {
  --color-primary: #3b82f6;
  --spacing-md: 1rem;
  --font-size-base: 16px;
}
```

## Error Handling

### Backend
```typescript
// Custom error classes
class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`);
    this.name = 'NotFoundError';
  }
}

// Global error handler
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // Handle error
  }
}
```

### Frontend
```typescript
// API error handling
try {
  const data = await api.getStudents();
} catch (error) {
  if (error instanceof ApiError) {
    showToast(error.message);
  }
}
```

## Testing

### Unit Tests
```typescript
describe('StudentService', () => {
  describe('findById', () => {
    it('should return student when found', async () => {
      // Arrange
      const mockStudent = { id: '1', name: 'John' };
      jest.spyOn(repo, 'findById').mockResolvedValue(mockStudent);
      
      // Act
      const result = await service.findById('1');
      
      // Assert
      expect(result).toEqual(mockStudent);
    });
  });
});
```

### Test Coverage
- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%

## Code Review Checklist
- [ ] TypeScript strict mode compliance
- [ ] No `any` types
- [ ] Proper error handling
- [ ] Unit tests included
- [ ] Documentation updated
- [ ] No console.log in production
- [ ] Security considerations addressed
- [ ] Performance implications reviewed
