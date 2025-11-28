# Test Run History

This document tracks all test runs in the OpenSlots project, providing a quick overview of test health and trends.

---

## Latest Test Runs

| Timestamp | Command | Status | Pass Rate | Duration | Failures | Log |
|-----------|---------|--------|-----------|----------|----------|-----|
| 2025-11-27T23:45:00Z | pnpm test:unit | ✅ PASS | 100% (48/48) | 2.2s | 0 | [tests-2025-11-27.json](../../tests/logs/tests-2025-11-27.json) |

---

## How to Read This Report

- **Timestamp**: When the test run occurred (ISO 8601 format)
- **Command**: The test command executed (e.g., `pnpm test:unit`, `pnpm test:e2e`)
- **Status**: `✅ PASS` (all tests passed) or `❌ FAIL` (some tests failed)
- **Pass Rate**: Percentage of tests that passed (passed/total)
- **Duration**: Total time for test execution
- **Failures**: Number of failed tests
- **Log**: Link to detailed JSON log file

---

## Test Run Guidelines

### When to Run Tests

Tests should be run:
1. **Before committing code** - Ensure changes don't break existing functionality
2. **After feature implementation** - Validate new features work correctly
3. **After bug fixes** - Ensure regression tests pass
4. **In CI/CD pipeline** - Automated validation on every push
5. **Before deployment** - Final validation before production

### Test Log File Naming

**Convention**: `tests/logs/tests-YYYY-mm-dd.json`

Examples:
- `tests/logs/tests-2025-11-27.json`
- `tests/logs/tests-2025-12-15.json`

Each file contains an array of test runs for that day. Multiple runs append to the same file.

### Test Commands

```bash
# Run all tests (unit + integration + E2E)
pnpm test

# Run only unit tests (fast, no external dependencies)
pnpm test:unit

# Run integration tests (with test database)
pnpm test:integration

# Run E2E tests (full application flow)
pnpm test:e2e

# Run tests with coverage report
pnpm test:cov

# Run tests in watch mode (development)
pnpm test:watch
```

---

## Coverage Trends

Coverage metrics from recent test runs will be tracked here.

| Date | Statements | Branches | Functions | Lines | Status |
|------|------------|----------|-----------|-------|--------|
| *No coverage data yet* | - | - | - | - | - |

**Coverage Targets** (per `claude/policies/testing.md`):
- Business Logic (bidding, matching, discovery): **>80%**
- Controllers/Components: **>70%**
- Utilities: **100%**

---

## Failed Test Patterns

This section tracks recurring test failures to identify systematic issues:

*No patterns identified yet*

---

## Notes

- This file is automatically updated by the test-runner agent after each test run
- For detailed test output, see log files in `tests/logs/YYYY-MM-DD/`
- For test run context, see session files in `claude/history/YYYY-MM-DD/session-XX.json`
- Test failures should be addressed promptly - no failing tests should be committed

---

**Last Updated**: 2025-11-27 (initial creation)
