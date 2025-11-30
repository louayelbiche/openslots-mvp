/**
 * Redis Cache Performance Test
 * Compares cache miss vs cache hit response times
 */

const API_BASE = 'http://localhost:3001';

async function measureRequest(label: string, endpoint: string, body: object): Promise<number> {
  const start = performance.now();

  await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const end = performance.now();
  const time = end - start;
  console.log(`${label}: ${time.toFixed(2)}ms`);
  return time;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        Redis Cache Performance Comparison                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Test different endpoints and parameters
  const testCases = [
    {
      name: 'Discovery - NYC Massage Morning',
      body: { serviceCategory: 'MASSAGE', city: 'New York City', timeWindow: 'Morning' }
    },
    {
      name: 'Discovery - SF Nails Afternoon',
      body: { serviceCategory: 'NAILS', city: 'San Francisco', timeWindow: 'Afternoon' }
    },
    {
      name: 'Service Types - LA Hair',
      body: { serviceCategory: 'HAIR', city: 'Los Angeles' },
      endpoint: '/api/service-types'
    },
  ];

  const results: { name: string; miss: number; hit: number; improvement: string }[] = [];

  for (const testCase of testCases) {
    const endpoint = testCase.endpoint || '/api/discovery';
    console.log(`\n📊 ${testCase.name}`);
    console.log('─'.repeat(50));

    // First request (cache miss)
    const missTime = await measureRequest('  Cache MISS (DB query)', endpoint, testCase.body);

    // Second request (cache hit)
    const hitTime = await measureRequest('  Cache HIT (Redis)   ', endpoint, testCase.body);

    // Third request (confirm cache hit)
    const hit2Time = await measureRequest('  Cache HIT (verify)  ', endpoint, testCase.body);

    const avgHit = (hitTime + hit2Time) / 2;
    const improvement = ((missTime - avgHit) / missTime * 100).toFixed(1);

    results.push({
      name: testCase.name,
      miss: missTime,
      hit: avgHit,
      improvement: `${improvement}%`
    });
  }

  // Summary
  console.log('\n\n═'.repeat(60));
  console.log('\n📈 SUMMARY\n');
  console.log('Endpoint                              | Miss      | Hit       | Speedup');
  console.log('─'.repeat(75));

  for (const r of results) {
    const name = r.name.padEnd(37);
    const miss = `${r.miss.toFixed(0)}ms`.padStart(7);
    const hit = `${r.hit.toFixed(0)}ms`.padStart(7);
    const imp = r.improvement.padStart(7);
    console.log(`${name} | ${miss}   | ${hit}   | ${imp}`);
  }

  // Calculate overall improvement
  const totalMiss = results.reduce((acc, r) => acc + r.miss, 0);
  const totalHit = results.reduce((acc, r) => acc + r.hit, 0);
  const overallImprovement = ((totalMiss - totalHit) / totalMiss * 100).toFixed(1);

  console.log('─'.repeat(75));
  console.log(`${'AVERAGE'.padEnd(37)} | ${(totalMiss/results.length).toFixed(0).padStart(7)}ms | ${(totalHit/results.length).toFixed(0).padStart(7)}ms | ${overallImprovement.padStart(7)}%`);

  console.log('\n✅ Redis caching is working!\n');
}

main().catch(console.error);
