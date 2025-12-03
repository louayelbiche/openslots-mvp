# Test Logs Directory

This directory stores structured logs for all test runs in the OpenSlots project.

## Structure

```
tests/logs/
├── tests-2025-11-27.json         # Test run log for 2025-11-27
├── tests-2025-11-28.json         # Test run log for 2025-11-28
└── tests-YYYY-mm-dd.json         # Format: tests-YYYY-mm-dd.json
```

**Naming Convention**: `tests-YYYY-mm-dd.json` (lowercase month format)

Example: `tests-2025-11-27.json`, `tests-2025-12-01.json`

## Log File Format

Each test run log file contains an array of test run records:

```json
[
  {
    "timestamp": "2025-11-27T14:30:22Z",
    "sessionId": "session-04",
    "command": "pnpm test:unit",
    "environment": {
      "node": "v20.x.x",
      "pnpm": "10.23.0"
    },
    "summary": {
      "total": 42,
      "passed": 40,
      "failed": 2,
      "skipped": 0,
      "duration": "12.45s"
    },
    "failures": [
      {
        "file": "apps/api/src/discovery/discovery.service.spec.ts",
        "test": "DiscoveryService > findSlots > should filter by Evening time window",
        "error": "Expected 5 slots, received 0"
      }
    ],
    "coverage": {
      "statements": 82.5,
      "branches": 78.3,
      "functions": 85.0,
      "lines": 82.1
    }
  }
]
```

**Note**: Each daily log file contains an array of test runs. New runs are appended to the array for that day.

## Retention Policy

- Keep logs for the last 30 days
- Archive older logs if needed for historical analysis
- Logs referenced in session history should be preserved

## Usage

Test logs are automatically created by the test-runner agent after each test execution. To manually inspect logs:

```bash
# View today's test log
cat tests/logs/tests-$(date +%Y-%m-%d).json | jq .

# View latest test run from today
cat tests/logs/tests-$(date +%Y-%m-%d).json | jq '.[-1]'

# View failures from latest run
cat tests/logs/tests-$(date +%Y-%m-%d).json | jq '.[-1].failures'

# View all runs for today
cat tests/logs/tests-$(date +%Y-%m-%d).json | jq '.[] | {timestamp, command, status: .summary}'

# Count total test runs today
cat tests/logs/tests-$(date +%Y-%m-%d).json | jq 'length'
```

## Integration

- Test logs are linked from `claude-docs/reports/test-runs.md` for easy access
- Session history references test logs via the `testsRun.logFile` field (e.g., `tests/logs/tests-2025-11-27.json`)
- CI/CD systems can parse these logs for build reporting

## File Management

- Each day gets one log file: `tests-YYYY-mm-dd.json`
- Multiple test runs on the same day are appended to the same file as array entries
- Logs are retained for 30 days (configurable)
- Logs referenced in session history are preserved indefinitely
