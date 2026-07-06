# Testing Guide

## Testing Strategy

### Test Pyramid
```
        /\
       /  \  E2E Tests (10%)
      /    \
     /------\  Integration Tests (30%)
    /        \
   /----------\  Unit Tests (60%)
```

## Unit Testing

### Setup
```bash
npm install --save-dev jest @types/jest ts-jest
```

### Configuration
```typescript
// jest.config.ts
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts'],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

### Unit Test Example
```typescript
// student.service.test.ts
import { StudentService } from './student.service';
import { NotFoundError } from '../errors';

describe('StudentService', () => {
  let service: StudentService;
  let mockRepository: jest.Mocked<StudentRepository>;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      create: jest.fn(),
    };
    service = new StudentService(mockRepository);
  });

  describe('findById', () => {
    it('should return student when found', async () => {
      const mockStudent = { id: '1', name: 'John Doe' };
      mockRepository.findById.mockResolvedValue(mockStudent);

      const result = await service.findById('1');

      expect(result).toEqual(mockStudent);
      expect(mockRepository.findById).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundError when not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.findById('999')).rejects.toThrow(NotFoundError);
    });
  });
});
```

## Integration Testing

### API Test Example
```typescript
// students.controller.test.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';

describe('Students (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/students (GET)', () => {
    it('should return list of students', () => {
      return request(app.getHttpServer())
        .get('/api/v1/students')
        .set('Authorization', 'Bearer test-token')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeInstanceOf(Array);
        });
    });
  });

  describe('/students (POST)', () => {
    it('should create a new student', () => {
      return request(app.getHttpServer())
        .post('/api/v1/students')
        .set('Authorization', 'Bearer admin-token')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          admissionNumber: 'STU001',
        })
        .expect(201);
    });
  });
});
```

## E2E Testing

### Cypress Setup
```bash
npm install --save-dev cypress
```

### E2E Test Example
```typescript
// cypress/e2e/login.cy.ts
describe('Login', () => {
  it('should login successfully', () => {
    cy.visit('/login');
    cy.get('[data-cy="email"]').type('admin@school.com');
    cy.get('[data-cy="password"]').type('password123');
    cy.get('[data-cy="submit"]').click();
    cy.url().should('include', '/dashboard');
  });

  it('should show error for invalid credentials', () => {
    cy.visit('/login');
    cy.get('[data-cy="email"]').type('wrong@email.com');
    cy.get('[data-cy="password"]').type('wrongpassword');
    cy.get('[data-cy="submit"]').click();
    cy.get('[data-cy="error"]').should('be.visible');
  });
});
```

## Test Commands

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e

# Run with coverage
npm run test:cov

# Run in watch mode
npm run test:watch
```

## Mocking

### Database Mocking
```typescript
const mockPrismaService = {
  student: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};
```

### External Service Mocking
```typescript
jest.mock('../email/email.service', () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({ success: true }),
  })),
}));
```

## Test Data

### Factories
```typescript
// student.factory.ts
export const createStudent = (overrides?: Partial<Student>) => ({
  id: 'test-id',
  admissionNumber: 'STU001',
  firstName: 'John',
  lastName: 'Doe',
  ...overrides,
});
```

### Fixtures
```typescript
// fixtures/students.json
[
  {
    "id": "1",
    "admissionNumber": "STU001",
    "firstName": "John",
    "lastName": "Doe"
  }
]
```

## CI Integration
- Tests run on every PR
- Coverage reports generated
- Minimum coverage enforced
- E2E tests run on staging
