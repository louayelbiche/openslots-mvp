/**
 * Performance Testing Script for OpenSlots API
 * Tests data fetch and loading speed for optimization
 */

const API_BASE = 'http://localhost:3001';

interface TestResult {
  endpoint: string;
  method: string;
  payload?: object;
  responseTime: number;
  statusCode: number;
  dataSize: number;
  recordCount?: number;
}

interface PerformanceReport {
  timestamp: string;
  results: TestResult[];
  summary: {
    totalTests: number;
    avgResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  };
}

async function measureRequest(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: object
): Promise<TestResult> {
  const start = performance.now();

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, options);
  const data = await response.json();
  const end = performance.now();

  const responseTime = end - start;
  const dataSize = JSON.stringify(data).length;

  // Count records if applicable
  let recordCount: number | undefined;
  if (data.providers) {
    recordCount = data.providers.length;
  } else if (data.serviceTypes) {
    recordCount = data.serviceTypes.length;
  }

  return {
    endpoint,
    method,
    payload: body,
    responseTime,
    statusCode: response.status,
    dataSize,
    recordCount,
  };
}

async function runPerformanceTests(): Promise<PerformanceReport> {
  console.log('\n🚀 Starting Performance Tests...\n');
  console.log('='.repeat(60));

  const results: TestResult[] = [];

  // Test configurations
  const testCases = [
    // Health check (baseline)
    { endpoint: '/health', method: 'GET' as const },

    // Service Types endpoint - various categories
    {
      endpoint: '/api/service-types',
      method: 'POST' as const,
      body: { serviceCategory: 'MASSAGE', city: 'New York City' }
    },
    {
      endpoint: '/api/service-types',
      method: 'POST' as const,
      body: { serviceCategory: 'MASSAGE', city: 'New York City', timeWindow: 'Morning' }
    },
    {
      endpoint: '/api/service-types',
      method: 'POST' as const,
      body: { serviceCategory: 'NAILS', city: 'San Francisco' }
    },
    {
      endpoint: '/api/service-types',
      method: 'POST' as const,
      body: { serviceCategory: 'HAIR', city: 'Los Angeles' }
    },
    {
      endpoint: '/api/service-types',
      method: 'POST' as const,
      body: { serviceCategory: 'MASSAGE', city: 'Bali' }
    },

    // Discovery endpoint - various filters
    {
      endpoint: '/api/discovery',
      method: 'POST' as const,
      body: { serviceCategory: 'MASSAGE', city: 'New York City' }
    },
    {
      endpoint: '/api/discovery',
      method: 'POST' as const,
      body: { serviceCategory: 'MASSAGE', city: 'New York City', timeWindow: 'Morning' }
    },
    {
      endpoint: '/api/discovery',
      method: 'POST' as const,
      body: { serviceCategory: 'MASSAGE', city: 'New York City', timeWindow: 'Afternoon' }
    },
    {
      endpoint: '/api/discovery',
      method: 'POST' as const,
      body: { serviceCategory: 'MASSAGE', city: 'New York City', timeWindow: 'Evening' }
    },
    {
      endpoint: '/api/discovery',
      method: 'POST' as const,
      body: { serviceCategory: 'MASSAGE', city: 'New York City', serviceType: 'Deep Tissue Massage' }
    },
    {
      endpoint: '/api/discovery',
      method: 'POST' as const,
      body: { serviceCategory: 'NAILS', city: 'San Francisco', timeWindow: 'Morning' }
    },
    {
      endpoint: '/api/discovery',
      method: 'POST' as const,
      body: { serviceCategory: 'HAIR', city: 'Los Angeles', timeWindow: 'Afternoon' }
    },
    {
      endpoint: '/api/discovery',
      method: 'POST' as const,
      body: { serviceCategory: 'FACIALS_AND_SKIN', city: 'New York City' }
    },
    {
      endpoint: '/api/discovery',
      method: 'POST' as const,
      body: { serviceCategory: 'ACUPUNCTURE', city: 'San Francisco' }
    },
    {
      endpoint: '/api/discovery',
      method: 'POST' as const,
      body: { serviceCategory: 'LASHES_AND_BROWS', city: 'Los Angeles' }
    },
    {
      endpoint: '/api/discovery',
      method: 'POST' as const,
      body: { serviceCategory: 'MASSAGE', city: 'Bali', timeWindow: 'Morning' }
    },
  ];

  // Run each test 3 times and take average
  const iterations = 3;

  for (const testCase of testCases) {
    const iterationResults: number[] = [];
    let lastResult: TestResult | null = null;

    for (let i = 0; i < iterations; i++) {
      const result = await measureRequest(
        testCase.endpoint,
        testCase.method,
        testCase.body
      );
      iterationResults.push(result.responseTime);
      lastResult = result;
    }

    // Calculate average response time
    const avgResponseTime = iterationResults.reduce((a, b) => a + b, 0) / iterations;

    if (lastResult) {
      lastResult.responseTime = avgResponseTime;
      results.push(lastResult);

      const payloadStr = testCase.body
        ? ` ${JSON.stringify(testCase.body).substring(0, 50)}...`
        : '';

      console.log(
        `${testCase.method.padEnd(4)} ${testCase.endpoint.padEnd(20)}` +
        `${avgResponseTime.toFixed(2).padStart(8)}ms` +
        `  ${(lastResult.dataSize / 1024).toFixed(2).padStart(7)}KB` +
        `  ${lastResult.recordCount !== undefined ? `(${lastResult.recordCount} records)` : ''}`
      );
    }
  }

  // Calculate summary statistics
  const responseTimes = results.map(r => r.responseTime).sort((a, b) => a - b);
  const summary = {
    totalTests: results.length,
    avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
    minResponseTime: responseTimes[0],
    maxResponseTime: responseTimes[responseTimes.length - 1],
    p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)],
    p99ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.99)],
  };

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 PERFORMANCE SUMMARY\n');
  console.log(`Total Tests:      ${summary.totalTests}`);
  console.log(`Avg Response:     ${summary.avgResponseTime.toFixed(2)}ms`);
  console.log(`Min Response:     ${summary.minResponseTime.toFixed(2)}ms`);
  console.log(`Max Response:     ${summary.maxResponseTime.toFixed(2)}ms`);
  console.log(`P95 Response:     ${summary.p95ResponseTime.toFixed(2)}ms`);
  console.log(`P99 Response:     ${summary.p99ResponseTime.toFixed(2)}ms`);

  return {
    timestamp: new Date().toISOString(),
    results,
    summary,
  };
}

// Load test - simulate concurrent requests
async function runLoadTest(concurrency: number, duration: number): Promise<void> {
  console.log(`\n🔥 Load Test: ${concurrency} concurrent requests for ${duration}ms\n`);

  const endpoint = '/api/discovery';
  const body = { serviceCategory: 'MASSAGE', city: 'New York City', timeWindow: 'Morning' };

  const startTime = Date.now();
  let requestCount = 0;
  let errorCount = 0;
  const responseTimes: number[] = [];

  const makeRequest = async () => {
    while (Date.now() - startTime < duration) {
      try {
        const result = await measureRequest(endpoint, 'POST', body);
        responseTimes.push(result.responseTime);
        requestCount++;
      } catch (error) {
        errorCount++;
      }
    }
  };

  // Start concurrent workers
  const workers = Array(concurrency).fill(null).map(() => makeRequest());
  await Promise.all(workers);

  const sortedTimes = responseTimes.sort((a, b) => a - b);
  const avgTime = sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length;

  console.log(`Total Requests:   ${requestCount}`);
  console.log(`Errors:           ${errorCount}`);
  console.log(`Requests/sec:     ${(requestCount / (duration / 1000)).toFixed(2)}`);
  console.log(`Avg Response:     ${avgTime.toFixed(2)}ms`);
  console.log(`Min Response:     ${sortedTimes[0]?.toFixed(2) || 'N/A'}ms`);
  console.log(`Max Response:     ${sortedTimes[sortedTimes.length - 1]?.toFixed(2) || 'N/A'}ms`);
  console.log(`P95 Response:     ${sortedTimes[Math.floor(sortedTimes.length * 0.95)]?.toFixed(2) || 'N/A'}ms`);
}

// Database query analysis
async function analyzeQueries(): Promise<void> {
  console.log('\n📈 Query Analysis (checking response patterns)\n');

  // Test different data sizes
  const cities = ['New York City', 'San Francisco', 'Los Angeles', 'Bali'];
  const categories = ['MASSAGE', 'NAILS', 'HAIR', 'FACIALS_AND_SKIN', 'ACUPUNCTURE', 'LASHES_AND_BROWS'];

  for (const city of cities) {
    for (const category of categories) {
      const result = await measureRequest('/api/discovery', 'POST', {
        serviceCategory: category,
        city,
      });

      if (result.recordCount !== undefined && result.recordCount > 0) {
        console.log(
          `${city.padEnd(16)} | ${category.padEnd(18)} | ` +
          `${result.recordCount.toString().padStart(2)} providers | ` +
          `${result.responseTime.toFixed(1).padStart(6)}ms | ` +
          `${(result.dataSize / 1024).toFixed(1).padStart(5)}KB`
        );
      }
    }
  }
}

// Main execution
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       OpenSlots API Performance Test Suite                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Run performance tests
  const report = await runPerformanceTests();

  // Query analysis
  await analyzeQueries();

  // Load test (5 concurrent users for 5 seconds)
  await runLoadTest(5, 5000);

  // High load test (10 concurrent users for 5 seconds)
  await runLoadTest(10, 5000);

  console.log('\n✅ Performance testing complete!\n');

  // Performance recommendations
  console.log('═'.repeat(60));
  console.log('\n🔍 ANALYSIS & RECOMMENDATIONS\n');

  const slowEndpoints = report.results.filter(r => r.responseTime > 100);
  if (slowEndpoints.length > 0) {
    console.log('⚠️  Slow Endpoints (>100ms):');
    slowEndpoints.forEach(e => {
      console.log(`   - ${e.endpoint}: ${e.responseTime.toFixed(2)}ms`);
    });
  }

  const largePayloads = report.results.filter(r => r.dataSize > 50000);
  if (largePayloads.length > 0) {
    console.log('\n⚠️  Large Payloads (>50KB):');
    largePayloads.forEach(e => {
      console.log(`   - ${e.endpoint}: ${(e.dataSize / 1024).toFixed(2)}KB`);
    });
  }
}

main().catch(console.error);
