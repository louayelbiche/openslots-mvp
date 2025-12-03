# Testing Guide - OpenSlots MVP

Complete guide to testing in the OpenSlots project.

---

## Quick Start

```bash
# Run all tests
pnpm test

# Run only unit tests (fast)
pnpm test:unit

# Run tests with coverage
pnpm test:cov

# Run tests in watch mode (development)
pnpm test:watch
```

---

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Frameworks](#test-frameworks)
3. [Running Tests Locally](#running-tests-locally)
4. [Adding New Tests](#adding-new-tests)
5. [Test Structure](#test-structure)
6. [Fixtures and Test Data](#fixtures-and-test-data)
7. [Mocking](#mocking)
8. [Coverage Requirements](#coverage-requirements)
9. [Interpreting Test Logs](#interpreting-test-logs)
10. [Regression Tests](#regression-tests)
11. [CI/CD Integration](#cicd-integration)
12. [Troubleshooting](#troubleshooting)

---

## Testing Philosophy

OpenSlots follows a pragmatic testing approach:

- **Test Pyramid**: Many unit tests, fewer integration tests, minimal E2E tests
- **Behavior-Driven**: Test what the code does, not how it does it
- **Isolation**: Tests run independently with no shared state
- **Determinism**: Tests produce the same results every time (no flaky tests)
- **Fast Feedback**: Unit tests run in seconds, full suite in minutes

---

## Test Frameworks

### API Tests (NestJS Backend)
- **Framework**: Jest 30.0
- **Location**: `apps/api/src/**/*.spec.ts` (unit), `apps/api/test/**/*.e2e-spec.ts` (E2E)
- **Tools**: `@nestjs/testing`, `supertest`

### Web Tests (Next.js Frontend)
- **Framework**: Vitest
- **Location**: `apps/web/src/**/*.test.tsx`
- **Tools**: `@testing-library/react`, `@testing-library/jest-dom`

---

## Running Tests Locally

### All Tests (Monorepo-Wide)

```bash
# From root directory
pnpm test              # Run all tests in all workspaces
pnpm test:unit         # Run only unit tests
pnpm test:watch        # Watch mode for development
pnpm test:cov          # Generate coverage report
```

### API Tests Only

```bash
cd apps/api

# Run all API tests
pnpm test

# Run specific test file
pnpm test discovery.service.spec.ts

# Run specific test suite
pnpm test -- -t "should filter by Morning time window"

# Unit tests only (fast, no E2E)
pnpm test:unit

# E2E tests only (requires database)
pnpm test:e2e

# Watch mode (re-runs on file changes)
pnpm test:watch

# Coverage report
pnpm test:cov
open coverage/lcov-report/index.html
```

### Web Tests Only

```bash
cd apps/web

# Run all web tests
pnpm test              # Watch mode (default)

# Run once (CI mode)
pnpm test:run

# Run specific test file
pnpm test MatchBadge.test.tsx

# Run specific test suite
pnpm test -t "should render with High likelihood"

# Interactive UI
pnpm test:ui

# Coverage report
pnpm test:coverage
open coverage/index.html
```

---

## Adding New Tests

### Adding an API Unit Test

1. **Create test file** next to the source file:
   ```
   apps/api/src/module/service.ts
   apps/api/src/module/service.spec.ts  ← Create this
   ```

2. **Use the template**:
   ```typescript
   import { Test, TestingModule } from '@nestjs/testing';
   import { MyService } from './my.service';

   describe('MyService', () => {
     let service: MyService;

     beforeEach(async () => {
       const module: TestingModule = await Test.createTestingModule({
         providers: [MyService],
       }).compile();

       service = module.get<MyService>(MyService);
     });

     it('should be defined', () => {
       expect(service).toBeDefined();
     });

     describe('myMethod', () => {
       it('should return expected result', () => {
         // Arrange
         const input = 'test';

         // Act
         const result = service.myMethod(input);

         // Assert
         expect(result).toBe('expected');
       });
     });
   });
   ```

3. **Run the test**:
   ```bash
   cd apps/api
   pnpm test my.service.spec.ts
   ```

### Adding a Web Component Test

1. **Create test file** next to the component:
   ```
   apps/web/src/components/Button.tsx
   apps/web/src/components/Button.test.tsx  ← Create this
   ```

2. **Use the template**:
   ```typescript
   import { render, screen } from '@testing-library/react';
   import { describe, it, expect } from 'vitest';
   import { Button } from './Button';

   describe('Button', () => {
     it('should render with text', () => {
       // Arrange & Act
       render(<Button>Click me</Button>);

       // Assert
       expect(screen.getByText('Click me')).toBeInTheDocument();
     });

     it('should call onClick when clicked', async () => {
       // Arrange
       const handleClick = vi.fn();
       render(<Button onClick={handleClick}>Click</Button>);

       // Act
       await userEvent.click(screen.getByText('Click'));

       // Assert
       expect(handleClick).toHaveBeenCalledOnce();
     });
   });
   ```

3. **Run the test**:
   ```bash
   cd apps/web
   pnpm test Button.test.tsx
   ```

### Adding an E2E Test

1. **Create test file** in `apps/api/test/`:
   ```
   apps/api/test/my-feature.e2e-spec.ts
   ```

2. **Use the template**:
   ```typescript
   import * as request from 'supertest';
   import { Test } from '@nestjs/testing';
   import { INestApplication } from '@nestjs/common';
   import { AppModule } from '../src/app.module';

   describe('MyFeature (E2E)', () => {
     let app: INestApplication;

     beforeAll(async () => {
       const moduleRef = await Test.createTestingModule({
         imports: [AppModule],
       }).compile();

       app = moduleRef.createNestApplication();
       await app.init();
     });

     afterAll(async () => {
       await app.close();
     });

     it('/my-endpoint (POST)', () => {
       return request(app.getHttpServer())
         .post('/my-endpoint')
         .send({ data: 'test' })
         .expect(201)
         .expect((res) => {
           expect(res.body).toHaveProperty('id');
         });
     });
   });
   ```

3. **Run the test**:
   ```bash
   cd apps/api
   pnpm test:e2e my-feature.e2e-spec.ts
   ```

---

## Test Structure

### AAA Pattern

All tests follow **Arrange-Act-Assert** pattern:

```typescript
it('should calculate total price', () => {
  // Arrange - Set up test data and conditions
  const items = [{ price: 10 }, { price: 20 }];
  const service = new PricingService();

  // Act - Execute the code being tested
  const total = service.calculateTotal(items);

  // Assert - Verify the result
  expect(total).toBe(30);
});
```

### Descriptive Test Names

Use clear, behavior-focused names:

```typescript
// Good ✅
it('should filter slots by Morning time window', () => {});
it('should return empty array when no slots match', () => {});
it('should throw BadRequestException when city is invalid', () => {});

// Bad ❌
it('should work', () => {});
it('test filtering', () => {});
it('handles errors', () => {});
```

### Grouping with describe()

Group related tests:

```typescript
describe('DiscoveryService', () => {
  describe('findSlots', () => {
    it('should filter by Morning time window', () => {});
    it('should filter by Afternoon time window', () => {});
    it('should filter by Evening time window', () => {});
  });

  describe('sortProviders', () => {
    it('should sort by price ascending', () => {});
    it('should sort by rating when prices are equal', () => {});
  });
});
```

---

## Fixtures and Test Data

### Creating Reusable Fixtures

**API Fixtures** (`apps/api/test/fixtures/test-data.ts`):

```typescript
export function createTestProvider(overrides = {}) {
  return {
    id: 1,
    name: 'Test Provider',
    rating: 4.5,
    distance: 2.3,
    ...overrides,
  };
}

export function createTestSlot(overrides = {}) {
  return {
    id: 1,
    serviceId: 1,
    startTime: new Date('2025-01-15T09:00:00Z'),
    durationMinutes: 60,
    basePrice: 100,
    ...overrides,
  };
}
```

**Usage**:

```typescript
import { createTestProvider, createTestSlot } from '../test/fixtures/test-data';

it('should process provider', () => {
  const provider = createTestProvider({ rating: 5.0 });
  // ...
});
```

### Deterministic Data

**Always use fixed values**:

```typescript
// Good ✅
const testDate = new Date('2025-01-15T09:00:00Z');
const testPrice = 100;

// Bad ❌
const testDate = new Date();  // Changes every run
const testPrice = Math.random() * 100;  // Non-deterministic
```

---

## Mocking

### Mocking Prisma (API)

```typescript
const mockPrismaService = {
  slot: {
    findMany: jest.fn().mockResolvedValue([
      { id: 1, startTime: new Date(), basePrice: 100 },
    ]),
  },
};

const module: TestingModule = await Test.createTestingModule({
  providers: [
    DiscoveryService,
    { provide: PrismaService, useValue: mockPrismaService },
  ],
}).compile();
```

### Mocking Functions (Web)

```typescript
import { vi } from 'vitest';

const mockOnClick = vi.fn();

render(<Button onClick={mockOnClick}>Click</Button>);
await userEvent.click(screen.getByText('Click'));

expect(mockOnClick).toHaveBeenCalledOnce();
```

### When to Mock

- **Mock external dependencies**: APIs, databases, file system
- **Mock slow operations**: Network requests, heavy computations
- **Don't mock** the code you're testing

---

## Coverage Requirements

| Code Type | Minimum Coverage |
|-----------|------------------|
| **Business Logic** (bidding, matching, discovery) | **80%** |
| **Controllers/Components** | **70%** |
| **Utilities** | **100%** |

### Checking Coverage

```bash
# API
cd apps/api
pnpm test:cov
open coverage/lcov-report/index.html

# Web
cd apps/web
pnpm test:coverage
open coverage/index.html
```

### Coverage in Test Logs

Coverage is automatically tracked in `tests/logs/tests-YYYY-mm-dd.json`:

```json
"coverage": {
  "statements": 98.24,
  "branches": 96.96,
  "functions": 100,
  "lines": 98.14
}
```

---

## Interpreting Test Logs

### Log File Location

Test runs are logged to: `tests/logs/tests-YYYY-mm-dd.json`

Each file contains an array of test runs for that day.

### Log Structure

```json
[
  {
    "timestamp": "2025-11-27T14:30:22Z",
    "sessionId": "session-04",
    "command": "pnpm test:unit",
    "summary": {
      "total": 46,
      "passed": 46,
      "failed": 0,
      "skipped": 0,
      "duration": "5.2s"
    },
    "failures": [],
    "coverage": {
      "statements": 98.24,
      "branches": 96.96,
      "functions": 100,
      "lines": 98.14
    }
  }
]
```

### Viewing Logs

```bash
# View today's test runs
cat tests/logs/tests-$(date +%Y-%m-%d).json | jq .

# View latest run
cat tests/logs/tests-$(date +%Y-%m-%d).json | jq '.[-1]'

# View failures
cat tests/logs/tests-$(date +%Y-%m-%d).json | jq '.[-1].failures'
```

### Human-Readable Summary

See `claude-docs/reports/test-runs.md` for a table of recent test runs.

---

## Regression Tests

### Policy

**Every bug fix must include a regression test.**

### Writing Regression Tests

1. **Reproduce the bug** in a test (should fail)
2. **Fix the bug** in production code
3. **Verify test passes** after fix
4. **Document the bug** in test name

**Example**:

```typescript
it('should handle Evening time window correctly (regression: timezone bug)', () => {
  // This test reproduces the bug where Evening slots were not returned
  // Bug: timezone conversion was not accounting for city
  const result = service.findSlots({
    city: 'New York',
    serviceCategory: 'MASSAGE',
    timeWindow: 'Evening',
  });

  expect(result.length).toBeGreaterThan(0);
  expect(result[0].slots[0].startTime.getHours()).toBeGreaterThanOrEqual(16);
});
```

---

## CI/CD Integration

### GitHub Actions (Future)

When CI is configured, tests will run automatically on:
- Every push to branches
- Every pull request
- Scheduled nightly builds

### Local Pre-Commit Check

Before committing:

```bash
# Run tests
pnpm test:run

# Check coverage
pnpm test:cov

# Ensure all pass before git commit
```

---

## Troubleshooting

### Tests Fail Locally But Pass in CI

- Check Node.js version matches CI
- Verify dependencies are installed: `pnpm install`
- Clear caches: `rm -rf node_modules/.cache`

### Tests Are Slow

- Run only unit tests: `pnpm test:unit`
- Use `.only()` to focus on specific tests during development
- Check for missing mocks (real DB/API calls are slow)

### Flaky Tests

If a test fails intermittently:

1. Run it 100 times: `for i in {1..100}; do pnpm test mytest; done`
2. Identify the cause: timing, shared state, async
3. Fix root cause: add waits, ensure isolation, improve mocking
4. If unfixable, quarantine with `.skip()` and create issue

### Coverage Is Low

1. Check which files are uncovered:
   ```bash
   pnpm test:cov
   # Look for red/yellow files in coverage report
   ```
2. Add tests for uncovered code
3. Focus on business logic first (most important)

### Import Errors in Tests

**API**:
- Ensure `tsconfig-paths` is configured in jest config
- Use absolute imports from src/

**Web**:
- Ensure path aliases are configured in `vitest.config.ts`
- Use `@/` prefix for imports

---

## Additional Resources

- **Testing Policy**: `claude-docs/policies/testing.md`
- **Test-Runner Agent**: `claude-docs/agents/test-runner.md`
- **Test Logs**: `tests/logs/tests-YYYY-mm-dd.json`
- **Test Run History**: `claude-docs/reports/test-runs.md`

---

## Summary

- **Run tests**: `pnpm test`
- **Add unit test**: Create `*.spec.ts` (API) or `*.test.tsx` (Web) next to source
- **Use AAA pattern**: Arrange → Act → Assert
- **Mock external deps**: DB, APIs, slow operations
- **Aim for >80% coverage**: Especially business logic
- **Write regression tests**: For every bug fix
- **Check logs**: `tests/logs/tests-YYYY-mm-dd.json`

Happy testing! 🧪
