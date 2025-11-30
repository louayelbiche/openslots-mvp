# OpenSlots Performance Analysis Report

**Date:** 2025-11-30
**Environment:** Development (Neon PostgreSQL cloud database)

---

## Executive Summary

The performance testing revealed **critical bottlenecks** in API response times, with average response times of **1,000-1,500ms** for data endpoints. This is significantly above acceptable thresholds for a responsive user experience (target: <200ms).

### Key Findings

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Avg API Response | 1,125ms | <200ms | ❌ Critical |
| P95 Response | 2,151ms | <500ms | ❌ Critical |
| Health Check | 12ms | <50ms | ✅ Good |
| Throughput (5 concurrent) | 3.4 req/s | >20 req/s | ❌ Poor |
| Throughput (10 concurrent) | 8.0 req/s | >40 req/s | ❌ Poor |

---

## Detailed Analysis

### 1. Database Query Performance

**Root Cause:** Prisma ORM executes 3 separate SQL queries per API request due to `include` statements.

```
Query Analysis Results:
- Service Types Query: 725ms (3 queries)
- Discovery Query: 1,152ms (3 queries)
- Raw SQL Query: 415ms (1 query) - 64% faster!
```

**Query Breakdown:**
| Query | Duration | Purpose |
|-------|----------|---------|
| Query 1 | ~350ms | Main entity fetch (Provider/Service) |
| Query 2 | ~360ms | Related slots fetch |
| Query 3 | ~370ms | Nested relations (Service/Provider) |

**Network Latency:** Each query to Neon cloud database incurs ~300-400ms network latency.

### 2. API Endpoint Performance

| Endpoint | Avg Response | Data Size | Records |
|----------|-------------|-----------|---------|
| `GET /health` | 12ms | 0.01KB | - |
| `POST /api/service-types` | 750-2,150ms | 0.36-0.47KB | 6-8 |
| `POST /api/discovery` | 1,085-1,556ms | 1.15-9.19KB | 1-4 |

### 3. Frontend Loading

**User Flow Timing (observed):**
- Home Page → Service Type: ~3s with loading state
- Service Type → Budget: Instant (no API call)
- Budget → Offers: ~3-4s with loading state

**Network Requests:**
- Multiple duplicate API calls observed (React Strict Mode or component re-renders)
- API calls: `POST /api/service-types`, `POST /api/discovery`

### 4. Data Volume

| Table | Records |
|-------|---------|
| Providers | 70 |
| Services | 140 |
| Slots | 698 |
| Users | 71 |

The data volume is small; performance issues are **not due to data size**.

---

## Identified Bottlenecks

### Critical (P0)

1. **Cloud Database Latency**
   - Each round-trip to Neon: ~300-400ms
   - 3 queries per request = 900-1,200ms just in DB latency

2. **Prisma N+1 Query Pattern**
   - `include` statements cause multiple queries
   - No query batching or optimization

### High (P1)

3. **No Caching Layer**
   - Service types rarely change but are fetched every time
   - Same discovery results could be cached briefly

4. **No Connection Pooling Optimization**
   - PG Pool exists but connection overhead still significant

### Medium (P2)

5. **Over-fetching Data**
   - `include` fetches all fields when only subset needed
   - Provider description, full address fetched but not displayed

6. **Duplicate API Calls**
   - Frontend makes duplicate requests (React Strict Mode + component structure)

---

## Optimization Recommendations

### Immediate Wins (Low Effort, High Impact)

#### 1. Use Raw SQL for Discovery Query
Replace Prisma `include` with a single optimized JOIN query.

**Current:**
```typescript
// 3 queries, ~1,150ms
await prisma.provider.findMany({
  where: { ... },
  include: {
    slots: {
      where: { status: 'OPEN' },
      include: { service: true }
    }
  }
});
```

**Optimized:**
```typescript
// 1 query, ~400ms (estimated 65% improvement)
await prisma.$queryRaw`
  SELECT p.id, p.name, p.rating, p.address, p.city, p."bookingUrl",
         s.id as slot_id, s."startTime", s."endTime",
         s."basePrice", s."maxDiscount", s."maxDiscountedPrice",
         sv.name as service_name, sv."durationMin"
  FROM "Provider" p
  JOIN "Slot" s ON s."providerId" = p.id
  JOIN "Service" sv ON s."serviceId" = sv.id
  WHERE LOWER(p.city) = LOWER(${city})
    AND sv.category = ${category}
    AND s.status = 'OPEN'
`;
```

**Expected Impact:** 60-70% reduction in response time

#### 2. Add In-Memory Caching for Service Types

```typescript
// Simple cache with TTL
const serviceTypesCache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 60000; // 1 minute

async getServiceTypes(request: ServiceTypesRequestDto) {
  const cacheKey = `${request.city}-${request.serviceCategory}`;
  const cached = serviceTypesCache.get(cacheKey);

  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  const result = await this.fetchServiceTypes(request);
  serviceTypesCache.set(cacheKey, { data: result, expires: Date.now() + CACHE_TTL });
  return result;
}
```

**Expected Impact:** Near-instant responses for cached data

#### 3. Use `select` Instead of `include`

```typescript
// Fetch only needed fields
await prisma.provider.findMany({
  where: { ... },
  select: {
    id: true,
    name: true,
    rating: true,
    address: true,
    city: true,
    bookingUrl: true,
    slots: {
      select: {
        id: true,
        startTime: true,
        endTime: true,
        basePrice: true,
        maxDiscount: true,
        maxDiscountedPrice: true,
        service: {
          select: { name: true, durationMin: true }
        }
      }
    }
  }
});
```

**Expected Impact:** 10-20% reduction in data transfer

### Medium-Term Improvements

#### 4. Add Redis Caching Layer

```typescript
// Redis for distributed caching
const cached = await redis.get(`discovery:${city}:${category}:${timeWindow}`);
if (cached) return JSON.parse(cached);

const result = await fetchFromDB();
await redis.setex(`discovery:${city}:${category}:${timeWindow}`, 60, JSON.stringify(result));
```

#### 5. Frontend Request Deduplication

```typescript
// Use React Query or SWR for automatic deduplication
const { data, isLoading } = useQuery({
  queryKey: ['discovery', city, category, timeWindow],
  queryFn: () => fetchDiscovery({ city, category, timeWindow }),
  staleTime: 30000, // 30 seconds
});
```

#### 6. API Response Compression

Enable gzip/brotli compression in NestJS:

```typescript
// main.ts
import compression from 'compression';
app.use(compression());
```

### Long-Term Improvements

#### 7. Database Read Replica

For read-heavy workloads, add a read replica closer to the application:
- Use Neon read replicas in the same region as the application
- Or migrate to a self-hosted PostgreSQL for lower latency

#### 8. GraphQL or Partial Response API

Allow clients to request only needed fields:

```graphql
query {
  discovery(city: "New York", category: MASSAGE) {
    providers {
      id
      name
      slots { startTime, maxDiscountedPrice }
    }
  }
}
```

#### 9. Database Denormalization

Create a materialized view for discovery queries:

```sql
CREATE MATERIALIZED VIEW discovery_view AS
SELECT p.id, p.name, p.rating, p.city, s.*, sv.name as service_name
FROM "Provider" p
JOIN "Slot" s ON s."providerId" = p.id
JOIN "Service" sv ON s."serviceId" = sv.id
WHERE s.status = 'OPEN';

-- Refresh periodically
REFRESH MATERIALIZED VIEW discovery_view;
```

---

## Implementation Priority

| Priority | Optimization | Effort | Impact | Timeline |
|----------|-------------|--------|--------|----------|
| P0 | Raw SQL for Discovery | Low | High | Immediate |
| P0 | Service Types Caching | Low | High | Immediate |
| P1 | Use `select` over `include` | Low | Medium | This week |
| P1 | Frontend Request Dedup | Medium | Medium | This week |
| P2 | Redis Caching | Medium | High | Next sprint |
| P2 | Response Compression | Low | Low | Next sprint |
| P3 | Read Replica | High | High | Future |
| P3 | GraphQL API | High | Medium | Future |

---

## Expected Results After Optimization

| Metric | Current | After P0/P1 | Target |
|--------|---------|-------------|--------|
| Avg API Response | 1,125ms | ~400ms | <200ms |
| P95 Response | 2,151ms | ~600ms | <500ms |
| Throughput | 3.4 req/s | ~10 req/s | >20 req/s |

---

## Test Files Created

- `apps/api/test/perf-test.ts` - Performance test suite
- `apps/api/test/query-analysis.ts` - Database query analysis

Run tests with:
```bash
cd apps/api
npx tsx test/perf-test.ts
npx tsx test/query-analysis.ts
```

---

## Conclusion

The primary performance bottleneck is **database query latency** caused by:
1. Cloud database network latency (~300-400ms per query)
2. Prisma's query splitting with `include` (3 queries per request)

Implementing raw SQL queries and adding caching for service types will provide the most immediate improvement, potentially reducing response times by **60-70%**.
