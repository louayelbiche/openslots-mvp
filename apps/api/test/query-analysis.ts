/**
 * Database Query Analysis Script
 * Analyzes Prisma query patterns and identifies optimization opportunities
 */

import "dotenv/config";
import { PrismaClient, ServiceCategory, SlotStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Enable query logging
const prisma = new PrismaClient({
  adapter,
  log: [
    { level: 'query', emit: 'event' },
    { level: 'info', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
    { level: 'error', emit: 'stdout' },
  ],
});

interface QueryLog {
  query: string;
  params: string;
  duration: number;
}

const queryLogs: QueryLog[] = [];

// @ts-ignore - Prisma event typing
prisma.$on('query', (e: any) => {
  queryLogs.push({
    query: e.query,
    params: e.params,
    duration: e.duration,
  });
});

async function analyzeServiceTypesQuery() {
  console.log('\n📊 Analyzing Service Types Query\n');
  console.log('='.repeat(60));

  queryLogs.length = 0;
  const start = performance.now();

  // This mirrors the getServiceTypes query
  const services = await prisma.service.findMany({
    where: {
      category: ServiceCategory.MASSAGE,
      provider: {
        city: {
          equals: 'New York City',
          mode: 'insensitive',
        },
      },
    },
    include: {
      slots: {
        where: {
          status: SlotStatus.OPEN,
        },
      },
      provider: true,
    },
  });

  const end = performance.now();

  console.log(`\nTotal time: ${(end - start).toFixed(2)}ms`);
  console.log(`Services found: ${services.length}`);
  console.log(`Total slots: ${services.reduce((acc, s) => acc + s.slots.length, 0)}`);
  console.log(`\nQueries executed: ${queryLogs.length}`);

  queryLogs.forEach((log, i) => {
    console.log(`\n[Query ${i + 1}] Duration: ${log.duration}ms`);
    console.log(`SQL: ${log.query.substring(0, 200)}...`);
  });
}

async function analyzeDiscoveryQuery() {
  console.log('\n📊 Analyzing Discovery Query\n');
  console.log('='.repeat(60));

  queryLogs.length = 0;
  const start = performance.now();

  // This mirrors the fetchProviders query
  const providers = await prisma.provider.findMany({
    where: {
      city: {
        equals: 'New York City',
        mode: 'insensitive',
      },
      services: {
        some: {
          category: ServiceCategory.MASSAGE,
        },
      },
    },
    include: {
      slots: {
        where: {
          status: SlotStatus.OPEN,
        },
        include: {
          service: true,
        },
      },
    },
  });

  const end = performance.now();

  console.log(`\nTotal time: ${(end - start).toFixed(2)}ms`);
  console.log(`Providers found: ${providers.length}`);
  console.log(`Total slots: ${providers.reduce((acc, p) => acc + p.slots.length, 0)}`);
  console.log(`\nQueries executed: ${queryLogs.length}`);

  queryLogs.forEach((log, i) => {
    console.log(`\n[Query ${i + 1}] Duration: ${log.duration}ms`);
    console.log(`SQL: ${log.query.substring(0, 200)}...`);
  });
}

async function countRecords() {
  console.log('\n📊 Database Record Counts\n');
  console.log('='.repeat(60));

  const [providers, services, slots, users] = await Promise.all([
    prisma.provider.count(),
    prisma.service.count(),
    prisma.slot.count(),
    prisma.user.count(),
  ]);

  console.log(`Providers: ${providers}`);
  console.log(`Services:  ${services}`);
  console.log(`Slots:     ${slots}`);
  console.log(`Users:     ${users}`);
}

async function testRawQueryPerformance() {
  console.log('\n📊 Raw Query Performance Test\n');
  console.log('='.repeat(60));

  // Test raw query performance
  const start = performance.now();

  const results = await prisma.$queryRaw`
    SELECT
      p.id as provider_id,
      p.name as provider_name,
      p.rating,
      p.address,
      p.city,
      p."bookingUrl",
      s.id as slot_id,
      s."startTime",
      s."endTime",
      s."basePrice",
      s."maxDiscount",
      s."maxDiscountedPrice",
      sv.name as service_name,
      sv."durationMin"
    FROM "Provider" p
    JOIN "Slot" s ON s."providerId" = p.id
    JOIN "Service" sv ON s."serviceId" = sv.id
    WHERE
      LOWER(p.city) = LOWER('New York City')
      AND sv.category = 'MASSAGE'
      AND s.status = 'OPEN'
    ORDER BY p.rating DESC, s."maxDiscountedPrice" ASC
  `;

  const end = performance.now();

  console.log(`Raw query time: ${(end - start).toFixed(2)}ms`);
  console.log(`Results: ${(results as any[]).length} rows`);
}

async function testOptimizedQuery() {
  console.log('\n📊 Optimized Query Test (using select)\n');
  console.log('='.repeat(60));

  queryLogs.length = 0;
  const start = performance.now();

  // Using select to reduce data transfer
  const providers = await prisma.provider.findMany({
    where: {
      city: {
        equals: 'New York City',
        mode: 'insensitive',
      },
      services: {
        some: {
          category: ServiceCategory.MASSAGE,
        },
      },
    },
    select: {
      id: true,
      name: true,
      rating: true,
      address: true,
      city: true,
      bookingUrl: true,
      slots: {
        where: {
          status: SlotStatus.OPEN,
        },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          basePrice: true,
          maxDiscount: true,
          maxDiscountedPrice: true,
          service: {
            select: {
              name: true,
              durationMin: true,
            },
          },
        },
      },
    },
  });

  const end = performance.now();

  console.log(`Optimized query time: ${(end - start).toFixed(2)}ms`);
  console.log(`Providers found: ${providers.length}`);
  console.log(`\nQueries executed: ${queryLogs.length}`);
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       OpenSlots Database Query Analysis                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    await countRecords();
    await analyzeServiceTypesQuery();
    await analyzeDiscoveryQuery();
    await testRawQueryPerformance();
    await testOptimizedQuery();

    console.log('\n' + '='.repeat(60));
    console.log('\n🔍 OPTIMIZATION RECOMMENDATIONS\n');
    console.log('1. Consider using raw SQL for complex joins');
    console.log('2. Use select() instead of include() to reduce data');
    console.log('3. Add database connection pooling');
    console.log('4. Consider caching for service-types endpoint');
    console.log('5. Evaluate using a read replica for queries');

  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch(console.error);
