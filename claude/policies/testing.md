# Testing Policy

This document defines the mandatory testing standards, conventions, and practices for the OpenSlots project.

---

## Core Principle

**All business logic, critical paths, and bug fixes must be covered by automated tests.**

Quality testing ensures:
- Features work as designed
- Regressions are caught before deployment
- Refactoring can be done with confidence
- Code quality remains high over time

---

## 1. Testing Philosophy

### Test-Driven Development (Optional)
While TDD is encouraged, it is not mandatory. However, all code must have tests before being merged.

### Test Pyramid
Follow the testing pyramid pattern:
- **70% Unit Tests**: Fast, isolated, test single units of logic
- **20% Integration Tests**: Test module interactions and service boundaries
- **10% E2E Tests**: Test complete user flows and critical paths

### Quality Over Quantity
- Aim for meaningful coverage, not just high percentages
- Test behavior and outcomes, not implementation details
- Focus on edge cases and error handling
- Every bug fix requires a regression test

---

## 2. Framework and Tools

### API (NestJS)
- **Framework**: Jest 30.x
- **Test Runner**: Jest with ts-jest transform
- **HTTP Testing**: Supertest for E2E tests
- **Mocking**: Jest mocks and NestJS Testing utilities
- **Configuration**: See `apps/api/package.json`

### Web (Next.js + React)
- **Framework**: Vitest (to be configured)
- **Component Testing**: React Testing Library
- **DOM Testing**: jsdom environment
- **Mocking**: Vitest mocks
- **Future**: Consider Playwright for E2E browser tests

### Shared Utilities
- **Framework**: Jest or Vitest depending on package location
- **Type Testing**: Use TypeScript compiler for type checks

---

## 3. Naming Conventions

### File Naming

#### API (apps/api)
```
src/
  module/
    module.service.ts          # Implementation
    module.service.spec.ts     # Unit/Integration tests
    module.controller.ts       # Controller
    module.controller.spec.ts  # Controller tests
test/
  module.e2e-spec.ts          # End-to-end tests
```

#### Web (apps/web)
```
src/
  components/
    Button.tsx                 # Component
    Button.test.tsx            # Component tests
  hooks/
    useSlotSearch.ts          # Hook
    useSlotSearch.test.tsx    # Hook tests
  utils/
    formatDate.ts             # Utility
    formatDate.test.ts        # Utility tests
```

### Test Suite Naming
Use clear, descriptive names:

```typescript
// Good
describe('SlotMatchingService', () => {
  describe('findMatchingSlots', () => {
    it('should return slots within budget range', () => {});
    it('should filter slots by service type', () => {});
    it('should throw error when budget is negative', () => {});
  });
});

// Bad
describe('tests', () => {
  it('works', () => {});
});
```

### Test Case Naming
Follow the pattern: `should [expected behavior] when [condition]`

```typescript
// Good
it('should return empty array when no slots match criteria', () => {});
it('should throw ValidationError when budget exceeds maximum', () => {});

// Avoid
it('test slot matching', () => {});
it('handles errors', () => {});
```

---

## 4. Directory Structure

### API Directory Structure
```
apps/api/
  src/
    discovery/
      discovery.service.ts
      discovery.service.spec.ts       # Unit + Integration
      discovery.controller.ts
      discovery.controller.spec.ts    # Controller tests
      dto/
        search-slots.dto.ts
        search-slots.dto.spec.ts      # DTO validation tests
    bidding/
      bidding.service.ts
      bidding.service.spec.ts
      bidding.controller.ts
      bidding.controller.spec.ts
  test/
    fixtures/
      slot.fixture.ts                 # Shared test data
      provider.fixture.ts
    discovery.e2e-spec.ts            # E2E tests
    bidding.e2e-spec.ts              # E2E tests
```

### Web Directory Structure
```
apps/web/
  src/
    app/
      (routes)/
        search/
          page.tsx
          page.test.tsx               # Route/page tests
    components/
      ui/
        Button.tsx
        Button.test.tsx               # Component tests
    hooks/
      useSlotSearch.ts
      useSlotSearch.test.tsx          # Hook tests
    lib/
      utils.ts
      utils.test.ts                   # Utility tests
  __tests__/
    fixtures/
      slot.fixture.ts                 # Shared test data
```

---

## 5. Test Types

### Unit Tests (*.spec.ts, *.test.ts)

**Purpose**: Test individual functions, methods, or components in isolation

**Characteristics**:
- Fast execution (milliseconds)
- No external dependencies (database, network, file system)
- Use mocks/stubs for dependencies
- Test single responsibility

**Example (API Service)**:
```typescript
// bidding.service.spec.ts
import { Test } from '@nestjs/testing';
import { BiddingService } from './bidding.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BiddingService', () => {
  let service: BiddingService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        BiddingService,
        {
          provide: PrismaService,
          useValue: {
            slot: { findMany: jest.fn() },
            bid: { create: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<BiddingService>(BiddingService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should calculate optimal bid within budget constraints', async () => {
    const slot = { id: '1', basePrice: 100 };
    const budget = 120;

    const bid = await service.calculateOptimalBid(slot, budget);

    expect(bid).toBeLessThanOrEqual(budget);
    expect(bid).toBeGreaterThanOrEqual(slot.basePrice);
  });
});
```

**Example (Web Component)**:
```typescript
// Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('should call onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);

    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Integration Tests (*.spec.ts)

**Purpose**: Test interactions between multiple units/modules

**Characteristics**:
- Moderate execution time (seconds)
- Tests module boundaries and data flow
- May use test database or in-memory alternatives
- Validates service composition

**Example (API Module Integration)**:
```typescript
// discovery.service.spec.ts (integration style)
import { Test } from '@nestjs/testing';
import { DiscoveryService } from './discovery.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('DiscoveryService Integration', () => {
  let service: DiscoveryService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DiscoveryService,
        PrismaService,
        ConfigService,
      ],
    }).compile();

    service = module.get<DiscoveryService>(DiscoveryService);
    prisma = module.get<PrismaService>(PrismaService);

    // Use real database connection or test container
    await prisma.$connect();
  });

  afterEach(async () => {
    await prisma.$disconnect();
  });

  it('should find slots and apply bidding logic together', async () => {
    // Tests real interaction between discovery and bidding modules
    const result = await service.searchWithBidding({
      serviceType: 'haircut',
      budget: 100,
      location: 'SF',
    });

    expect(result.slots).toBeDefined();
    expect(result.bids).toBeDefined();
  });
});
```

### E2E Tests (*.e2e-spec.ts)

**Purpose**: Test complete user flows and API contracts

**Characteristics**:
- Slowest execution (seconds to minutes)
- Tests full application stack
- Uses real or test database
- Validates HTTP contracts and responses

**Example (API E2E)**:
```typescript
// discovery.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Discovery Flow (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /discovery/search should return available slots', () => {
    return request(app.getHttpServer())
      .get('/discovery/search')
      .query({ serviceType: 'haircut', budget: 100 })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('slots');
        expect(Array.isArray(res.body.slots)).toBe(true);
      });
  });

  it('POST /bidding/submit should create bid and return confirmation', async () => {
    const response = await request(app.getHttpServer())
      .post('/bidding/submit')
      .send({
        slotId: 'slot-123',
        amount: 95,
      })
      .expect(201);

    expect(response.body).toHaveProperty('bidId');
    expect(response.body).toHaveProperty('status', 'pending');
  });
});
```

---

## 6. Fixture Guidelines

### Fixture Principles
1. **Deterministic**: Fixtures must produce consistent, predictable data
2. **Minimal**: Include only data necessary for the test
3. **Readable**: Use clear, semantic names and values
4. **Reusable**: Share fixtures across tests when appropriate
5. **Isolated**: Each test should get fresh fixture data

### Fixture Organization

```typescript
// test/fixtures/slot.fixture.ts
export const createSlotFixture = (overrides = {}) => ({
  id: 'slot-1',
  providerId: 'provider-1',
  serviceType: 'haircut',
  startTime: new Date('2025-11-28T10:00:00Z'),
  duration: 60,
  basePrice: 100,
  status: 'available',
  ...overrides,
});

export const createProviderFixture = (overrides = {}) => ({
  id: 'provider-1',
  name: 'Test Salon',
  location: 'San Francisco',
  rating: 4.5,
  verified: true,
  ...overrides,
});

// Usage in tests
import { createSlotFixture } from '../fixtures/slot.fixture';

it('should handle expired slots', () => {
  const expiredSlot = createSlotFixture({
    startTime: new Date('2020-01-01T10:00:00Z'),
    status: 'expired',
  });

  // Test logic here
});
```

### Fixture Anti-Patterns

**Avoid randomness**:
```typescript
// BAD - Non-deterministic
const fixture = {
  id: Math.random().toString(),
  price: Math.floor(Math.random() * 100),
};

// GOOD - Deterministic
const fixture = {
  id: 'test-slot-1',
  price: 100,
};
```

**Avoid shared mutable state**:
```typescript
// BAD - Tests can interfere with each other
const sharedSlot = { id: '1', status: 'available' };

it('test 1', () => {
  sharedSlot.status = 'booked'; // Mutates shared state
});

it('test 2', () => {
  expect(sharedSlot.status).toBe('available'); // FAILS
});

// GOOD - Fresh instance per test
beforeEach(() => {
  slot = createSlotFixture({ status: 'available' });
});
```

---

## 7. Mocking Strategy

### When to Mock
- External API calls (Stripe, Google Maps, etc.)
- Database calls in unit tests
- Third-party services
- Time-dependent operations (Date.now(), timers)
- File system operations
- Network requests

### When NOT to Mock
- Pure functions
- Simple utility functions
- DTOs and data structures
- The code under test itself
- In integration/E2E tests (use real implementations)

### Mock Examples

**Mocking Services (NestJS)**:
```typescript
const mockPrismaService = {
  slot: {
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
  },
};

const module = await Test.createTestingModule({
  providers: [
    MyService,
    { provide: PrismaService, useValue: mockPrismaService },
  ],
}).compile();
```

**Mocking API Calls (Web)**:
```typescript
import { vi } from 'vitest';

const mockFetch = vi.fn();
global.fetch = mockFetch;

it('should handle API errors', async () => {
  mockFetch.mockRejectedValueOnce(new Error('Network error'));

  // Test error handling
});
```

**Mocking Time**:
```typescript
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2025-11-28T10:00:00Z'));
});

afterEach(() => {
  jest.useRealTimers();
});
```

---

## 8. Coverage Requirements

### Coverage Targets

| Code Type | Minimum Coverage | Target Coverage |
|-----------|-----------------|-----------------|
| Business Logic (Services) | 80% | 90% |
| Controllers / Handlers | 70% | 85% |
| Utilities / Helpers | 100% | 100% |
| Components (UI) | 70% | 80% |
| DTOs / Types | N/A | Type-checked |

### Running Coverage

**API**:
```bash
cd apps/api
pnpm test:cov
```

**Web**:
```bash
cd apps/web
pnpm test:coverage  # When Vitest is configured
```

### Coverage Exceptions
Document any intentional coverage gaps:

```typescript
/* istanbul ignore next - integration point tested in E2E */
export async function externalApiCall() {
  // External integration
}
```

### Coverage Metrics
Track these metrics:
- **Line Coverage**: Percentage of lines executed
- **Branch Coverage**: Percentage of conditional branches tested
- **Function Coverage**: Percentage of functions called
- **Statement Coverage**: Percentage of statements executed

**Minimum acceptable**: All metrics above 70% for critical modules

---

## 9. Regression Test Policy

### Core Rule
**Every bug fix must include a regression test that fails without the fix and passes with it.**

### Regression Test Workflow

1. **Reproduce the bug**: Write a failing test that demonstrates the bug
2. **Fix the bug**: Implement the fix
3. **Verify the test passes**: Ensure the test now passes
4. **Document the bug**: Add comments linking to issue/ticket

### Regression Test Example

```typescript
describe('BiddingService - Regression Tests', () => {
  // Bug: Bidding allowed negative amounts (Issue #123)
  it('should reject bids with negative amounts', async () => {
    await expect(
      service.submitBid({ slotId: 'slot-1', amount: -10 })
    ).rejects.toThrow('Bid amount must be positive');
  });

  // Bug: Timezone conversion error caused off-by-one date (Issue #145)
  it('should correctly handle timezone boundaries for slot availability', () => {
    const slot = createSlotFixture({
      startTime: new Date('2025-11-28T00:00:00-08:00'),
    });
    const searchDate = new Date('2025-11-28T08:00:00Z'); // Same day in UTC

    expect(service.isSlotAvailableOnDate(slot, searchDate)).toBe(true);
  });
});
```

### Regression Test Naming
Use this pattern: `should [correct behavior] (Issue #[number])`

---

## 10. Test Isolation Rules

### Isolation Principles

1. **No shared mutable state between tests**
2. **Each test can run independently**
3. **Tests can run in any order**
4. **Tests do not depend on other tests**
5. **Clean up resources after each test**

### Setup and Teardown

**Use proper lifecycle hooks**:
```typescript
describe('MyService', () => {
  let service: MyService;
  let testData: TestData;

  beforeEach(() => {
    // Fresh setup for each test
    service = new MyService();
    testData = createTestFixture();
  });

  afterEach(() => {
    // Clean up
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Global cleanup
    await prisma.$disconnect();
  });
});
```

### Database Test Isolation

**Option 1: Transactions (Preferred)**:
```typescript
beforeEach(async () => {
  await prisma.$executeRaw`BEGIN`;
});

afterEach(async () => {
  await prisma.$executeRaw`ROLLBACK`;
});
```

**Option 2: Clean Database**:
```typescript
beforeEach(async () => {
  await prisma.bid.deleteMany();
  await prisma.slot.deleteMany();
  await prisma.provider.deleteMany();
});
```

### Parallel Test Execution

Tests must be safe to run in parallel:
- Use unique IDs for test data
- Avoid global state modifications
- Use separate test database instances if needed

---

## 11. Running Tests

### API Commands

```bash
# Run all unit/integration tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run E2E tests
pnpm test:e2e

# Run with coverage
pnpm test:cov

# Run specific test file
pnpm test discovery.service.spec.ts

# Run tests matching pattern
pnpm test -- --testNamePattern="should find slots"

# Debug tests
pnpm test:debug
```

### Web Commands

```bash
# Run all tests (when configured)
pnpm test

# Run in watch mode
pnpm test:watch

# Run with UI
pnpm test:ui

# Run coverage
pnpm test:coverage
```

### CI/CD Integration

Tests must pass in CI before merging:
```yaml
# Example GitHub Actions
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3
    - uses: pnpm/action-setup@v2
    - run: pnpm install
    - run: pnpm test:cov
    - run: pnpm test:e2e
```

---

## 12. Writing Quality Tests

### Test Quality Checklist

- [ ] Test has a clear, descriptive name
- [ ] Test follows AAA pattern (Arrange, Act, Assert)
- [ ] Test is isolated and independent
- [ ] Test uses deterministic fixtures
- [ ] Test has meaningful assertions
- [ ] Test handles edge cases
- [ ] Test documents complex scenarios
- [ ] Test is fast (< 1s for unit tests)

### AAA Pattern

```typescript
it('should calculate total price with tax', () => {
  // Arrange - Set up test data and dependencies
  const items = [
    { price: 100, quantity: 2 },
    { price: 50, quantity: 1 },
  ];
  const taxRate = 0.1;

  // Act - Execute the code under test
  const result = calculateTotal(items, taxRate);

  // Assert - Verify the outcome
  expect(result.subtotal).toBe(250);
  expect(result.tax).toBe(25);
  expect(result.total).toBe(275);
});
```

### Assertion Best Practices

```typescript
// Good - Specific assertions
expect(result.slots).toHaveLength(3);
expect(result.slots[0]).toMatchObject({
  id: 'slot-1',
  status: 'available',
});

// Bad - Vague assertions
expect(result).toBeTruthy();
expect(result.slots.length > 0).toBe(true);
```

### Error Testing

```typescript
// Test error messages and types
await expect(
  service.bookSlot('invalid-id')
).rejects.toThrow(NotFoundException);

await expect(
  service.submitBid({ amount: -10 })
).rejects.toThrow('Bid amount must be positive');
```

### Edge Cases to Test

Always test:
- Empty inputs ([], '', null, undefined)
- Boundary values (0, -1, MAX_INT)
- Invalid inputs (wrong type, malformed data)
- Error conditions (network failure, database error)
- Concurrent operations (race conditions)
- Edge timestamps (timezone boundaries, DST changes)

---

## 13. Test Maintenance

### Keeping Tests Updated

- Update tests when requirements change
- Refactor tests alongside production code
- Remove obsolete tests
- Keep fixtures up to date with schema changes

### Test Debt

Avoid these test smells:
- Skipped tests (`it.skip`) without explanation
- Commented-out tests
- Tests that always pass (no meaningful assertions)
- Flaky tests (inconsistent pass/fail)
- Slow tests (> 5s for unit tests)

### Flaky Test Policy

If a test is flaky:
1. Mark it with `.skip` and create a ticket
2. Investigate root cause (timing, shared state, external dependency)
3. Fix the flakiness
4. Re-enable the test

**Never ignore flaky tests permanently.**

---

## 14. Examples and Templates

### Service Unit Test Template

```typescript
// my-service.service.spec.ts
import { Test } from '@nestjs/testing';
import { MyService } from './my-service.service';
import { DependencyService } from '../dependency/dependency.service';

describe('MyService', () => {
  let service: MyService;
  let dependency: jest.Mocked<DependencyService>;

  beforeEach(async () => {
    const mockDependency = {
      someMethod: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        MyService,
        { provide: DependencyService, useValue: mockDependency },
      ],
    }).compile();

    service = module.get<MyService>(MyService);
    dependency = module.get(DependencyService);
  });

  describe('methodName', () => {
    it('should handle success case', async () => {
      // Arrange
      dependency.someMethod.mockResolvedValue({ data: 'test' });

      // Act
      const result = await service.methodName('input');

      // Assert
      expect(result).toBeDefined();
      expect(dependency.someMethod).toHaveBeenCalledWith('input');
    });

    it('should handle error case', async () => {
      // Arrange
      dependency.someMethod.mockRejectedValue(new Error('Failed'));

      // Act & Assert
      await expect(service.methodName('input')).rejects.toThrow('Failed');
    });
  });
});
```

### Component Test Template

```typescript
// MyComponent.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render with default props', () => {
    render(<MyComponent title="Test" />);

    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const onSubmit = jest.fn();
    render(<MyComponent onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
  });

  it('should display error state', () => {
    render(<MyComponent error="Something went wrong" />);

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });
});
```

---

## 15. Enforcement

### Pre-Merge Requirements

All pull requests must:
- Have tests for new features
- Have regression tests for bug fixes
- Pass all existing tests
- Meet coverage thresholds
- Have no skipped tests without explanation

### Review Checklist

Code reviewers should verify:
- [ ] Tests exist for new/changed code
- [ ] Tests follow naming conventions
- [ ] Tests are isolated and deterministic
- [ ] Fixtures are reusable and clear
- [ ] Coverage meets thresholds
- [ ] No test anti-patterns present

### Continuous Improvement

- Review test failures in CI regularly
- Refactor slow or flaky tests
- Update this policy as patterns emerge
- Share testing knowledge across team

---

## 16. Resources

### Documentation
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Vitest Documentation](https://vitest.dev/guide/)
- [React Testing Library](https://testing-library.com/react)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)

### Internal Resources
- Test fixtures: `apps/api/test/fixtures/`, `apps/web/__tests__/fixtures/`
- Example tests: `apps/api/src/**/*.spec.ts`
- CI configuration: `.github/workflows/`

---

## Summary

This policy ensures:
- Consistent testing practices across the codebase
- High-quality, maintainable test suites
- Comprehensive coverage of critical paths
- Fast, reliable test execution
- Clear patterns for all developers to follow

**Remember**: Good tests are an investment in code quality and team velocity. Write tests that you would want to maintain.
