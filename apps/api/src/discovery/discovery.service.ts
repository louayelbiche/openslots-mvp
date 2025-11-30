import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { Prisma } from "@prisma/client";
import {
  DiscoveryRequestDto,
  TimeWindow,
} from "./dto/discovery-request.dto";
import {
  DiscoveryResponseDto,
  ProviderDto,
  SlotDto,
} from "./dto/discovery-response.dto";
import { ServiceTypesRequestDto } from "./dto/service-types-request.dto";
import {
  ServiceTypesResponseDto,
  ServiceTypeDto,
} from "./dto/service-types-response.dto";

// Cache entry interface for in-memory fallback
interface CacheEntry<T> {
  data: T;
  expires: number;
}

// Raw query result types
interface RawServiceTypeRow {
  service_name: string;
  duration_min: number;
  slot_count: bigint;
  city: string;
  start_time: Date;
}

interface RawDiscoveryRow {
  provider_id: string;
  provider_name: string;
  rating: Prisma.Decimal | null;
  address: string;
  city: string;
  booking_url: string | null;
  slot_id: string;
  start_time: Date;
  end_time: Date;
  base_price: number;
  max_discount: Prisma.Decimal;
  max_discounted_price: number;
  service_name: string;
  duration_min: number;
}

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  // Redis cache TTLs (in seconds)
  private readonly REDIS_SERVICE_TYPES_TTL = 120; // 2 minutes
  private readonly REDIS_DISCOVERY_TTL = 60; // 1 minute

  // In-memory cache fallback (when Redis unavailable)
  private serviceTypesCache = new Map<string, CacheEntry<ServiceTypesResponseDto>>();
  private discoveryCache = new Map<string, CacheEntry<DiscoveryResponseDto>>();
  private readonly MEMORY_SERVICE_TYPES_TTL = 60000; // 1 minute
  private readonly MEMORY_DISCOVERY_TTL = 30000; // 30 seconds

  // Timezone offsets for cities (hours from UTC, standard time)
  private readonly CITY_TIMEZONE_OFFSETS: Record<string, number> = {
    "New York": -5,
    "New York City": -5,
    "San Francisco": -8,
    "Los Angeles": -8,
    "Bali": 8,
  };

  constructor(
    private prisma: PrismaService,
    private redis: RedisService
  ) {}

  async getServiceTypes(
    request: ServiceTypesRequestDto
  ): Promise<ServiceTypesResponseDto> {
    if (!request.serviceCategory) {
      throw new BadRequestException("serviceCategory is required");
    }
    if (!request.city) {
      throw new BadRequestException("city is required");
    }

    const cacheKey = this.getServiceTypesCacheKey(request);

    // Try Redis first
    if (this.redis.isAvailable()) {
      const cached = await this.redis.get<ServiceTypesResponseDto>(cacheKey);
      if (cached) {
        this.logger.debug(`Redis HIT: ${cacheKey}`);
        return cached;
      }
    } else {
      // Fallback to in-memory cache
      const memCached = this.serviceTypesCache.get(cacheKey);
      if (memCached && memCached.expires > Date.now()) {
        this.logger.debug(`Memory HIT: ${cacheKey}`);
        return memCached.data;
      }
    }

    // Cache miss - fetch from database with time window filter in SQL
    this.logger.debug(`Cache MISS: ${cacheKey}`);

    // Get timezone offset for the city
    const timezoneOffset = this.CITY_TIMEZONE_OFFSETS[request.city] || 0;

    // Build time window filter conditions
    let timeFilter = '';
    if (request.timeWindow && request.timeWindow !== 'Custom') {
      const hourRanges = {
        Morning: { start: 9, end: 12 },
        Afternoon: { start: 12, end: 16 },
        Evening: { start: 16, end: 20 },
      };
      const range = hourRanges[request.timeWindow as keyof typeof hourRanges];
      if (range) {
        // Convert local hours to UTC by subtracting timezone offset
        const utcStart = (range.start - timezoneOffset + 24) % 24;
        const utcEnd = (range.end - timezoneOffset + 24) % 24;

        if (utcStart < utcEnd) {
          timeFilter = `AND EXTRACT(HOUR FROM s."startTime") >= ${utcStart} AND EXTRACT(HOUR FROM s."startTime") < ${utcEnd}`;
        } else {
          // Handle wraparound (e.g., UTC 21:00 to 01:00)
          timeFilter = `AND (EXTRACT(HOUR FROM s."startTime") >= ${utcStart} OR EXTRACT(HOUR FROM s."startTime") < ${utcEnd})`;
        }
      }
    }

    // Use Prisma.sql for dynamic query building
    const rows = await this.prisma.$queryRawUnsafe<Array<{
      service_name: string;
      duration_min: number;
      slot_count: bigint;
    }>>(
      `SELECT
        sv.name as service_name,
        sv."durationMin" as duration_min,
        COUNT(s.id) as slot_count
      FROM "Service" sv
      JOIN "Provider" p ON sv."providerId" = p.id
      JOIN "Slot" s ON s."serviceId" = sv.id
      WHERE sv.category::text = $1
        AND LOWER(p.city) = LOWER($2)
        AND s.status = 'OPEN'
        ${timeFilter}
      GROUP BY sv.name, sv."durationMin"`,
      request.serviceCategory,
      request.city
    );

    const serviceTypes: ServiceTypeDto[] = rows
      .filter(row => Number(row.slot_count) > 0)
      .map(row => ({
        name: row.service_name,
        durationMin: row.duration_min,
        slotCount: Number(row.slot_count),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const result = { serviceTypes };

    // Store in Redis (or fallback to memory)
    if (this.redis.isAvailable()) {
      await this.redis.set(cacheKey, result, this.REDIS_SERVICE_TYPES_TTL);
    } else {
      this.serviceTypesCache.set(cacheKey, {
        data: result,
        expires: Date.now() + this.MEMORY_SERVICE_TYPES_TTL,
      });
    }

    return result;
  }

  async discover(request: DiscoveryRequestDto): Promise<DiscoveryResponseDto> {
    this.validateRequest(request);

    const cacheKey = this.getDiscoveryCacheKey(request);

    // Try Redis first
    if (this.redis.isAvailable()) {
      const cached = await this.redis.get<DiscoveryResponseDto>(cacheKey);
      if (cached) {
        this.logger.debug(`Redis HIT: ${cacheKey}`);
        return cached;
      }
    } else {
      // Fallback to in-memory cache
      const memCached = this.discoveryCache.get(cacheKey);
      if (memCached && memCached.expires > Date.now()) {
        this.logger.debug(`Memory HIT: ${cacheKey}`);
        return memCached.data;
      }
    }

    // Cache miss - fetch from database
    this.logger.debug(`Cache MISS: ${cacheKey}`);
    const rows = await this.fetchProvidersRaw(
      request.city,
      request.serviceCategory,
      request.serviceType
    );

    const providersWithSlots = this.transformRawResults(rows, request.timeWindow);
    const sortedProviders = this.sortProviders(providersWithSlots);
    const result = { providers: sortedProviders };

    // Store in Redis (or fallback to memory)
    if (this.redis.isAvailable()) {
      await this.redis.set(cacheKey, result, this.REDIS_DISCOVERY_TTL);
    } else {
      this.discoveryCache.set(cacheKey, {
        data: result,
        expires: Date.now() + this.MEMORY_DISCOVERY_TTL,
      });
    }

    return result;
  }

  private validateRequest(request: DiscoveryRequestDto): void {
    if (!request.serviceCategory) {
      throw new BadRequestException("serviceCategory is required");
    }
    if (!request.city) {
      throw new BadRequestException("city is required");
    }
  }

  private async fetchProvidersRaw(
    city: string,
    serviceCategory: string,
    serviceType?: string
  ): Promise<RawDiscoveryRow[]> {
    if (serviceType) {
      return await this.prisma.$queryRaw<RawDiscoveryRow[]>`
        SELECT
          p.id as provider_id,
          p.name as provider_name,
          p.rating,
          p.address,
          p.city,
          p."bookingUrl" as booking_url,
          s.id as slot_id,
          s."startTime" as start_time,
          s."endTime" as end_time,
          s."basePrice" as base_price,
          s."maxDiscount" as max_discount,
          s."maxDiscountedPrice" as max_discounted_price,
          sv.name as service_name,
          sv."durationMin" as duration_min
        FROM "Provider" p
        JOIN "Slot" s ON s."providerId" = p.id
        JOIN "Service" sv ON s."serviceId" = sv.id
        WHERE LOWER(p.city) = LOWER(${city})
          AND sv.category::text = ${serviceCategory}
          AND s.status = 'OPEN'
          AND sv.name = ${serviceType}
          AND p.name IS NOT NULL
          AND p.address IS NOT NULL
      `;
    }

    return await this.prisma.$queryRaw<RawDiscoveryRow[]>`
      SELECT
        p.id as provider_id,
        p.name as provider_name,
        p.rating,
        p.address,
        p.city,
        p."bookingUrl" as booking_url,
        s.id as slot_id,
        s."startTime" as start_time,
        s."endTime" as end_time,
        s."basePrice" as base_price,
        s."maxDiscount" as max_discount,
        s."maxDiscountedPrice" as max_discounted_price,
        sv.name as service_name,
        sv."durationMin" as duration_min
      FROM "Provider" p
      JOIN "Slot" s ON s."providerId" = p.id
      JOIN "Service" sv ON s."serviceId" = sv.id
      WHERE LOWER(p.city) = LOWER(${city})
        AND sv.category::text = ${serviceCategory}
        AND s.status = 'OPEN'
        AND p.name IS NOT NULL
        AND p.address IS NOT NULL
    `;
  }

  private transformRawResults(
    rows: RawDiscoveryRow[],
    timeWindow?: TimeWindow
  ): ProviderDto[] {
    const providerMap = new Map<string, {
      providerId: string;
      name: string;
      rating: number;
      address: string;
      city: string;
      bookingUrl?: string;
      slots: SlotDto[];
    }>();

    for (const row of rows) {
      if (timeWindow && !this.isSlotInTimeWindow(row.start_time, timeWindow, row.city)) {
        continue;
      }

      let provider = providerMap.get(row.provider_id);
      if (!provider) {
        provider = {
          providerId: row.provider_id,
          name: row.provider_name,
          rating: row.rating ? parseFloat(row.rating.toString()) : 0,
          address: row.address,
          city: row.city,
          bookingUrl: row.booking_url || undefined,
          slots: [],
        };
        providerMap.set(row.provider_id, provider);
      }

      provider.slots.push({
        slotId: row.slot_id,
        startTime: row.start_time.toISOString(),
        endTime: row.end_time.toISOString(),
        basePrice: row.base_price,
        maxDiscount: parseFloat(row.max_discount.toString()),
        maxDiscountedPrice: row.max_discounted_price,
        serviceName: row.service_name,
        durationMin: row.duration_min,
      });
    }

    const result: ProviderDto[] = [];

    for (const provider of providerMap.values()) {
      if (provider.slots.length === 0) {
        continue;
      }

      provider.slots.sort((a, b) => {
        if (a.maxDiscountedPrice !== b.maxDiscountedPrice) {
          return a.maxDiscountedPrice - b.maxDiscountedPrice;
        }
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      });

      const lowestPrice = Math.min(...provider.slots.map((s) => s.maxDiscountedPrice));
      const distance = this.calculateDistance(provider.providerId);

      result.push({
        ...provider,
        lowestPrice,
        distance,
      });
    }

    return result;
  }

  private isSlotInTimeWindow(startTime: Date, timeWindow: TimeWindow, city: string): boolean {
    const timezoneOffset = this.CITY_TIMEZONE_OFFSETS[city] || 0;
    const utcHour = startTime.getUTCHours();
    const localHour = (utcHour + timezoneOffset + 24) % 24;

    switch (timeWindow) {
      case "Morning":
        return localHour >= 9 && localHour < 12;
      case "Afternoon":
        return localHour >= 12 && localHour < 16;
      case "Evening":
        return localHour >= 16 && localHour < 20;
      case "Custom":
        return true;
      default:
        return false;
    }
  }

  private calculateDistance(providerId: string): number {
    const hash = providerId
      .split("")
      .reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    return Math.round((hash % 100) / 10) + 1;
  }

  private sortProviders(providers: ProviderDto[]): ProviderDto[] {
    return providers.sort((a, b) => {
      if (a.lowestPrice !== b.lowestPrice) {
        return a.lowestPrice - b.lowestPrice;
      }
      if (a.rating !== b.rating) {
        return b.rating - a.rating;
      }
      return a.distance - b.distance;
    });
  }

  private getServiceTypesCacheKey(request: ServiceTypesRequestDto): string {
    return `service-types:${request.city}:${request.serviceCategory}:${request.timeWindow || 'all'}`;
  }

  private getDiscoveryCacheKey(request: DiscoveryRequestDto): string {
    return `discovery:${request.city}:${request.serviceCategory}:${request.timeWindow || 'all'}:${request.serviceType || 'all'}`;
  }

  // Clear all caches (Redis + in-memory)
  async clearCache(): Promise<void> {
    this.serviceTypesCache.clear();
    this.discoveryCache.clear();
    if (this.redis.isAvailable()) {
      await this.redis.clearServiceTypesCache();
      await this.redis.clearDiscoveryCache();
    }
    this.logger.log("All caches cleared");
  }
}
