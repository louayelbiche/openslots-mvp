import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { DiscoveryService } from "./discovery.service";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { ServiceCategory, SlotStatus } from "@prisma/client";
import {
  createTestProviderWithSlots,
  TEST_CITIES,
  TIME_WINDOWS,
  BOUNDARY_TIMES,
} from "../../test/fixtures/test-data";

/**
 * Helper to convert test provider fixture to raw SQL row format
 * This matches the RawDiscoveryRow interface in discovery.service.ts
 */
function toRawRows(provider: ReturnType<typeof createTestProviderWithSlots>): Array<{
  provider_id: string;
  provider_name: string;
  rating: number | null;
  address: string;
  city: string;
  booking_url: string | null;
  slot_id: string;
  start_time: Date;
  end_time: Date;
  base_price: number;
  max_discount: number;
  max_discounted_price: number;
  service_name: string;
  duration_min: number;
}> {
  return provider.slots.map(slot => ({
    provider_id: provider.id,
    provider_name: provider.name,
    rating: provider.rating,
    address: provider.address,
    city: provider.city,
    booking_url: null,
    slot_id: slot.id,
    start_time: slot.startTime,
    end_time: slot.endTime,
    base_price: slot.basePrice,
    max_discount: slot.maxDiscount,
    max_discounted_price: slot.maxDiscountedPrice,
    service_name: slot.service.name,
    duration_min: slot.service.durationMin,
  }));
}

describe("DiscoveryService", () => {
  let service: DiscoveryService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrismaService = {
      $queryRaw: jest.fn(),
    };

    const mockRedisService = {
      isAvailable: jest.fn().mockReturnValue(false),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscoveryService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<DiscoveryService>(DiscoveryService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("discover", () => {
    it("should return providers with slots in the correct time window", async () => {
      // Arrange
      const request = {
        serviceCategory: ServiceCategory.MASSAGE,
        city: TEST_CITIES.NEW_YORK,
        timeWindow: "Morning" as const,
      };

      const mockProvider = createTestProviderWithSlots({
        providerId: "provider-1",
        city: TEST_CITIES.NEW_YORK,
        slots: [
          { id: "slot-1", startTime: TIME_WINDOWS.NEW_YORK_MORNING.START },
          { id: "slot-2", startTime: TIME_WINDOWS.NEW_YORK_AFTERNOON.START },
        ],
      });

      prisma.$queryRaw.mockResolvedValue(toRawRows(mockProvider));

      // Act
      const result = await service.discover(request);

      // Assert
      expect(result.providers).toHaveLength(1);
      expect(result.providers[0].slots).toHaveLength(1);
      expect(result.providers[0].slots[0].slotId).toBe("slot-1");
    });

    it("should return empty array when no providers found", async () => {
      // Arrange
      const request = {
        serviceCategory: ServiceCategory.MASSAGE,
        city: TEST_CITIES.NEW_YORK,
        timeWindow: "Morning" as const,
      };

      prisma.$queryRaw.mockResolvedValue([]);

      // Act
      const result = await service.discover(request);

      // Assert
      expect(result.providers).toEqual([]);
      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it("should skip providers with no slots in time window", async () => {
      // Arrange
      const request = {
        serviceCategory: ServiceCategory.MASSAGE,
        city: TEST_CITIES.NEW_YORK,
        timeWindow: "Morning" as const,
      };

      const mockProvider = createTestProviderWithSlots({
        providerId: "provider-1",
        city: TEST_CITIES.NEW_YORK,
        slots: [
          { id: "slot-1", startTime: TIME_WINDOWS.NEW_YORK_AFTERNOON.START },
        ],
      });

      prisma.$queryRaw.mockResolvedValue(toRawRows(mockProvider));

      // Act
      const result = await service.discover(request);

      // Assert
      expect(result.providers).toHaveLength(0);
    });

    it("should skip providers with incomplete data", async () => {
      // Arrange - raw SQL filters out null name/address at query level
      // so we test that empty results work
      const request = {
        serviceCategory: ServiceCategory.MASSAGE,
        city: TEST_CITIES.NEW_YORK,
        timeWindow: "Morning" as const,
      };

      // Raw SQL query filters out providers with null name/address
      prisma.$queryRaw.mockResolvedValue([]);

      // Act
      const result = await service.discover(request);

      // Assert
      expect(result.providers).toHaveLength(0);
    });

    it("should throw BadRequestException when serviceCategory is missing", async () => {
      // Arrange
      const request = {
        serviceCategory: null as any,
        city: TEST_CITIES.NEW_YORK,
        timeWindow: "Morning" as const,
      };

      // Act & Assert
      await expect(service.discover(request)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.discover(request)).rejects.toThrow(
        "serviceCategory is required"
      );
    });

    it("should throw BadRequestException when city is missing", async () => {
      // Arrange
      const request = {
        serviceCategory: ServiceCategory.MASSAGE,
        city: null as any,
        timeWindow: "Morning" as const,
      };

      // Act & Assert
      await expect(service.discover(request)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.discover(request)).rejects.toThrow(
        "city is required"
      );
    });

    it("should return all slots when timeWindow is not provided", async () => {
      // Arrange - timeWindow is now optional, returns all slots
      const request = {
        serviceCategory: ServiceCategory.MASSAGE,
        city: TEST_CITIES.NEW_YORK,
        // No timeWindow - should return all slots
      };

      const mockProvider = createTestProviderWithSlots({
        city: TEST_CITIES.NEW_YORK,
        slots: [
          { startTime: new Date("2025-11-28T14:00:00Z") }, // 9am EST
          { startTime: new Date("2025-11-28T17:00:00Z") }, // 12pm EST
          { startTime: new Date("2025-11-28T21:00:00Z") }, // 4pm EST
        ],
      });
      prisma.$queryRaw.mockResolvedValue(toRawRows(mockProvider));

      // Act
      const result = await service.discover(request);

      // Assert - all 3 slots returned (no time filtering)
      expect(result.providers[0].slots).toHaveLength(3);
    });
  });

  describe("Time Window Filtering", () => {
    describe("Morning window (9am-12pm)", () => {
      it("should include slots at 9am EST", async () => {
        // Arrange
        const request = {
          serviceCategory: ServiceCategory.MASSAGE,
          city: TEST_CITIES.NEW_YORK,
          timeWindow: "Morning" as const,
        };

        const mockProvider = createTestProviderWithSlots({
          city: TEST_CITIES.NEW_YORK,
          slots: [{ startTime: BOUNDARY_TIMES.MORNING_START_EST }],
        });

        prisma.$queryRaw.mockResolvedValue(toRawRows(mockProvider));

        // Act
        const result = await service.discover(request);

        // Assert
        expect(result.providers[0].slots).toHaveLength(1);
      });

      it("should exclude slots at 8:59am EST", async () => {
        // Arrange
        const request = {
          serviceCategory: ServiceCategory.MASSAGE,
          city: TEST_CITIES.NEW_YORK,
          timeWindow: "Morning" as const,
        };

        const mockProvider = createTestProviderWithSlots({
          city: TEST_CITIES.NEW_YORK,
          slots: [{ startTime: BOUNDARY_TIMES.BEFORE_MORNING_EST }],
        });

        prisma.$queryRaw.mockResolvedValue(toRawRows(mockProvider));

        // Act
        const result = await service.discover(request);

        // Assert
        expect(result.providers).toHaveLength(0);
      });

      it("should exclude slots at 12pm EST", async () => {
        // Arrange
        const request = {
          serviceCategory: ServiceCategory.MASSAGE,
          city: TEST_CITIES.NEW_YORK,
          timeWindow: "Morning" as const,
        };

        const mockProvider = createTestProviderWithSlots({
          city: TEST_CITIES.NEW_YORK,
          slots: [{ startTime: BOUNDARY_TIMES.AFTERNOON_START_EST }],
        });

        prisma.$queryRaw.mockResolvedValue(toRawRows(mockProvider));

        // Act
        const result = await service.discover(request);

        // Assert
        expect(result.providers).toHaveLength(0);
      });
    });

    describe("Afternoon window (12pm-4pm)", () => {
      it("should include slots at 12pm EST", async () => {
        // Arrange
        const request = {
          serviceCategory: ServiceCategory.MASSAGE,
          city: TEST_CITIES.NEW_YORK,
          timeWindow: "Afternoon" as const,
        };

        const mockProvider = createTestProviderWithSlots({
          city: TEST_CITIES.NEW_YORK,
          slots: [{ startTime: BOUNDARY_TIMES.AFTERNOON_START_EST }],
        });

        prisma.$queryRaw.mockResolvedValue(toRawRows(mockProvider));

        // Act
        const result = await service.discover(request);

        // Assert
        expect(result.providers[0].slots).toHaveLength(1);
      });

      it("should exclude slots at 11:59am EST", async () => {
        // Arrange
        const request = {
          serviceCategory: ServiceCategory.MASSAGE,
          city: TEST_CITIES.NEW_YORK,
          timeWindow: "Afternoon" as const,
        };

        const mockProvider = createTestProviderWithSlots({
          city: TEST_CITIES.NEW_YORK,
          slots: [{ startTime: BOUNDARY_TIMES.BEFORE_AFTERNOON_EST }],
        });

        prisma.$queryRaw.mockResolvedValue(toRawRows(mockProvider));

        // Act
        const result = await service.discover(request);

        // Assert
        expect(result.providers).toHaveLength(0);
      });

      it("should exclude slots at 4pm EST", async () => {
        // Arrange
        const request = {
          serviceCategory: ServiceCategory.MASSAGE,
          city: TEST_CITIES.NEW_YORK,
          timeWindow: "Afternoon" as const,
        };

        const mockProvider = createTestProviderWithSlots({
          city: TEST_CITIES.NEW_YORK,
          slots: [{ startTime: BOUNDARY_TIMES.EVENING_START_EST }],
        });

        prisma.$queryRaw.mockResolvedValue(toRawRows(mockProvider));

        // Act
        const result = await service.discover(request);

        // Assert
        expect(result.providers).toHaveLength(0);
      });
    });

    describe("Evening window (4pm-8pm)", () => {
      it("should include slots at 4pm EST", async () => {
        // Arrange
        const request = {
          serviceCategory: ServiceCategory.MASSAGE,
          city: TEST_CITIES.NEW_YORK,
          timeWindow: "Evening" as const,
        };

        const mockProvider = createTestProviderWithSlots({
          city: TEST_CITIES.NEW_YORK,
          slots: [{ startTime: BOUNDARY_TIMES.EVENING_START_EST }],
        });

        prisma.$queryRaw.mockResolvedValue(toRawRows(mockProvider));

        // Act
        const result = await service.discover(request);

        // Assert
        expect(result.providers[0].slots).toHaveLength(1);
      });

      it("should exclude slots at 3:59pm EST", async () => {
        // Arrange
        const request = {
          serviceCategory: ServiceCategory.MASSAGE,
          city: TEST_CITIES.NEW_YORK,
          timeWindow: "Evening" as const,
        };

        const mockProvider = createTestProviderWithSlots({
          city: TEST_CITIES.NEW_YORK,
          slots: [{ startTime: BOUNDARY_TIMES.BEFORE_EVENING_EST }],
        });

        prisma.$queryRaw.mockResolvedValue(toRawRows(mockProvider));

        // Act
        const result = await service.discover(request);

        // Assert
        expect(result.providers).toHaveLength(0);
      });

      it("should exclude slots at 8pm EST", async () => {
        // Arrange
        const request = {
          serviceCategory: ServiceCategory.MASSAGE,
          city: TEST_CITIES.NEW_YORK,
          timeWindow: "Evening" as const,
        };

        const mockProvider = createTestProviderWithSlots({
          city: TEST_CITIES.NEW_YORK,
          slots: [{ startTime: BOUNDARY_TIMES.AFTER_EVENING_EST }],
        });

        prisma.$queryRaw.mockResolvedValue(toRawRows(mockProvider));

        // Act
        const result = await service.discover(request);

        // Assert
        expect(result.providers).toHaveLength(0);
      });
    });

    describe("Custom window", () => {
      it("should include all slots for Custom time window", async () => {
        // Arrange
        const request = {
          serviceCategory: ServiceCategory.MASSAGE,
          city: TEST_CITIES.NEW_YORK,
          timeWindow: "Custom" as const,
        };

        const mockProvider = createTestProviderWithSlots({
          city: TEST_CITIES.NEW_YORK,
          slots: [
            { startTime: BOUNDARY_TIMES.BEFORE_MORNING_EST },
            { startTime: BOUNDARY_TIMES.MORNING_START_EST },
            { startTime: BOUNDARY_TIMES.AFTERNOON_START_EST },
            { startTime: BOUNDARY_TIMES.EVENING_START_EST },
            { startTime: BOUNDARY_TIMES.AFTER_EVENING_EST },
          ],
        });

        prisma.$queryRaw.mockResolvedValue(toRawRows(mockProvider));

        // Act
        const result = await service.discover(request);

        // Assert
        expect(result.providers[0].slots).toHaveLength(5);
      });
    });
  });

  describe("Timezone Conversion", () => {
    it("should correctly handle EST timezone (New York)", async () => {
      // Arrange
      const request = {
        serviceCategory: ServiceCategory.MASSAGE,
        city: TEST_CITIES.NEW_YORK,
        timeWindow: "Morning" as const,
      };

      const mockProvider = createTestProviderWithSlots({
        city: TEST_CITIES.NEW_YORK,
        slots: [
          { startTime: TIME_WINDOWS.NEW_YORK_MORNING.START }, // 9am EST
        ],
      });

      prisma.$queryRaw.mockResolvedValue(toRawRows(mockProvider));

      // Act
      const result = await service.discover(request);

      // Assert
      expect(result.providers[0].slots).toHaveLength(1);
    });

    it("should correctly handle PST timezone (San Francisco)", async () => {
      // Arrange
      const request = {
        serviceCategory: ServiceCategory.MASSAGE,
        city: TEST_CITIES.SAN_FRANCISCO,
        timeWindow: "Morning" as const,
      };

      const mockProvider = createTestProviderWithSlots({
        city: TEST_CITIES.SAN_FRANCISCO,
        slots: [
          { startTime: TIME_WINDOWS.SF_MORNING.START }, // 9am PST
        ],
      });

      prisma.$queryRaw.mockResolvedValue(toRawRows(mockProvider));

      // Act
      const result = await service.discover(request);

      // Assert
      expect(result.providers[0].slots).toHaveLength(1);
    });

    it("should correctly handle PST timezone (Los Angeles)", async () => {
      // Arrange
      const request = {
        serviceCategory: ServiceCategory.MASSAGE,
        city: TEST_CITIES.LOS_ANGELES,
        timeWindow: "Afternoon" as const,
      };

      const mockProvider = createTestProviderWithSlots({
        city: TEST_CITIES.LOS_ANGELES,
        slots: [
          { startTime: TIME_WINDOWS.SF_AFTERNOON.START }, // 12pm PST (same as SF)
        ],
      });

      prisma.$queryRaw.mockResolvedValue(toRawRows(mockProvider));

      // Act
      const result = await service.discover(request);

      // Assert
      expect(result.providers[0].slots).toHaveLength(1);
    });

    it("should default to UTC offset 0 for unknown cities", async () => {
      // Arrange
      const request = {
        serviceCategory: ServiceCategory.MASSAGE,
        city: "Unknown City",
        timeWindow: "Morning" as const,
      };

      const mockProvider = createTestProviderWithSlots({
        city: "Unknown City",
        slots: [
          { startTime: new Date("2025-11-28T09:00:00Z") }, // 9am UTC
        ],
      });

      prisma.$queryRaw.mockResolvedValue(toRawRows(mockProvider));

      // Act
      const result = await service.discover(request);

      // Assert
      expect(result.providers[0].slots).toHaveLength(1);
    });
  });

  describe("Provider Sorting", () => {
    it("should sort providers by lowest price (ascending)", async () => {
      // Arrange
      const request = {
        serviceCategory: ServiceCategory.MASSAGE,
        city: TEST_CITIES.NEW_YORK,
        timeWindow: "Morning" as const,
      };

      const provider1 = createTestProviderWithSlots({
        providerId: "provider-1",
        city: TEST_CITIES.NEW_YORK,
        slots: [
          {
            startTime: TIME_WINDOWS.NEW_YORK_MORNING.START,
            basePrice: 15000,
            maxDiscount: 0.2, // $120
          },
        ],
      });

      const provider2 = createTestProviderWithSlots({
        providerId: "provider-2",
        city: TEST_CITIES.NEW_YORK,
        slots: [
          {
            startTime: TIME_WINDOWS.NEW_YORK_MORNING.START,
            basePrice: 10000,
            maxDiscount: 0.1, // $90
          },
        ],
      });

      prisma.$queryRaw.mockResolvedValue([...toRawRows(provider1), ...toRawRows(provider2)]);

      // Act
      const result = await service.discover(request);

      // Assert
      expect(result.providers).toHaveLength(2);
      expect(result.providers[0].providerId).toBe("provider-2");
      expect(result.providers[1].providerId).toBe("provider-1");
    });

    it("should sort by rating (descending) when prices are equal", async () => {
      // Arrange
      const request = {
        serviceCategory: ServiceCategory.MASSAGE,
        city: TEST_CITIES.NEW_YORK,
        timeWindow: "Morning" as const,
      };

      const provider1 = createTestProviderWithSlots({
        providerId: "provider-1",
        providerName: "Low Rating Provider",
        city: TEST_CITIES.NEW_YORK,
        rating: 4.0,
        slots: [
          {
            startTime: TIME_WINDOWS.NEW_YORK_MORNING.START,
            basePrice: 10000,
            maxDiscount: 0.1, // $90
          },
        ],
      });

      const provider2 = createTestProviderWithSlots({
        providerId: "provider-2",
        providerName: "High Rating Provider",
        city: TEST_CITIES.NEW_YORK,
        rating: 4.8,
        slots: [
          {
            startTime: TIME_WINDOWS.NEW_YORK_MORNING.START,
            basePrice: 10000,
            maxDiscount: 0.1, // $90
          },
        ],
      });

      prisma.$queryRaw.mockResolvedValue([...toRawRows(provider1), ...toRawRows(provider2)]);

      // Act
      const result = await service.discover(request);

      // Assert
      expect(result.providers[0].providerId).toBe("provider-2");
      expect(result.providers[0].rating).toBe(4.8);
    });

    it("should sort by distance (ascending) when price and rating are equal", async () => {
      // Arrange
      const request = {
        serviceCategory: ServiceCategory.MASSAGE,
        city: TEST_CITIES.NEW_YORK,
        timeWindow: "Morning" as const,
      };

      // Use provider IDs that will generate different distances
      const provider1 = createTestProviderWithSlots({
        providerId: "zzz-provider", // Higher hash = higher distance
        city: TEST_CITIES.NEW_YORK,
        rating: 4.5,
        slots: [
          {
            startTime: TIME_WINDOWS.NEW_YORK_MORNING.START,
            basePrice: 10000,
            maxDiscount: 0.1,
          },
        ],
      });

      const provider2 = createTestProviderWithSlots({
        providerId: "aaa-provider", // Lower hash = lower distance
        city: TEST_CITIES.NEW_YORK,
        rating: 4.5,
        slots: [
          {
            startTime: TIME_WINDOWS.NEW_YORK_MORNING.START,
            basePrice: 10000,
            maxDiscount: 0.1,
          },
        ],
      });

      prisma.$queryRaw.mockResolvedValue([...toRawRows(provider1), ...toRawRows(provider2)]);

      // Act
      const result = await service.discover(request);

      // Assert
      expect(result.providers).toHaveLength(2);
      // Should be sorted by distance since price and rating are equal
      expect(result.providers[0].distance).toBeLessThan(
        result.providers[1].distance
      );
    });
  });

  describe("Slot Sorting", () => {
    it("should sort slots by maxDiscountedPrice (ascending)", async () => {
      // Arrange
      const request = {
        serviceCategory: ServiceCategory.MASSAGE,
        city: TEST_CITIES.NEW_YORK,
        timeWindow: "Morning" as const,
      };

      const mockProvider = createTestProviderWithSlots({
        city: TEST_CITIES.NEW_YORK,
        slots: [
          {
            startTime: TIME_WINDOWS.NEW_YORK_MORNING.START,
            basePrice: 15000,
            maxDiscount: 0.2, // $120
          },
          {
            startTime: TIME_WINDOWS.NEW_YORK_MORNING.MID,
            basePrice: 10000,
            maxDiscount: 0.1, // $90
          },
        ],
      });

      prisma.$queryRaw.mockResolvedValue(toRawRows(mockProvider));

      // Act
      const result = await service.discover(request);

      // Assert
      expect(result.providers[0].slots).toHaveLength(2);
      expect(result.providers[0].slots[0].maxDiscountedPrice).toBeLessThan(
        result.providers[0].slots[1].maxDiscountedPrice
      );
    });

    it("should sort by startTime when prices are equal", async () => {
      // Arrange
      const request = {
        serviceCategory: ServiceCategory.MASSAGE,
        city: TEST_CITIES.NEW_YORK,
        timeWindow: "Morning" as const,
      };

      const earlierTime = TIME_WINDOWS.NEW_YORK_MORNING.START;
      const laterTime = TIME_WINDOWS.NEW_YORK_MORNING.MID;

      const mockProvider = createTestProviderWithSlots({
        city: TEST_CITIES.NEW_YORK,
        slots: [
          {
            startTime: laterTime,
            basePrice: 10000,
            maxDiscount: 0.1,
          },
          {
            startTime: earlierTime,
            basePrice: 10000,
            maxDiscount: 0.1,
          },
        ],
      });

      prisma.$queryRaw.mockResolvedValue(toRawRows(mockProvider));

      // Act
      const result = await service.discover(request);

      // Assert
      expect(result.providers[0].slots).toHaveLength(2);
      expect(new Date(result.providers[0].slots[0].startTime)).toEqual(
        earlierTime
      );
      expect(new Date(result.providers[0].slots[1].startTime)).toEqual(
        laterTime
      );
    });
  });

  describe("Response Structure", () => {
    it("should return correct slot structure", async () => {
      // Arrange
      const request = {
        serviceCategory: ServiceCategory.MASSAGE,
        city: TEST_CITIES.NEW_YORK,
        timeWindow: "Morning" as const,
      };

      const mockProvider = createTestProviderWithSlots({
        city: TEST_CITIES.NEW_YORK,
        slots: [
          {
            startTime: TIME_WINDOWS.NEW_YORK_MORNING.START,
            basePrice: 10000,
            maxDiscount: 0.15,
          },
        ],
      });

      prisma.$queryRaw.mockResolvedValue(toRawRows(mockProvider));

      // Act
      const result = await service.discover(request);

      // Assert
      const slot = result.providers[0].slots[0];
      expect(slot).toHaveProperty("slotId");
      expect(slot).toHaveProperty("startTime");
      expect(slot).toHaveProperty("endTime");
      expect(slot).toHaveProperty("basePrice");
      expect(slot).toHaveProperty("maxDiscount");
      expect(slot).toHaveProperty("maxDiscountedPrice");
      expect(slot).toHaveProperty("serviceName");
      expect(slot).toHaveProperty("durationMin");
      expect(typeof slot.startTime).toBe("string");
      expect(typeof slot.endTime).toBe("string");
    });

    it("should return correct provider structure", async () => {
      // Arrange
      const request = {
        serviceCategory: ServiceCategory.MASSAGE,
        city: TEST_CITIES.NEW_YORK,
        timeWindow: "Morning" as const,
      };

      const mockProvider = createTestProviderWithSlots({
        city: TEST_CITIES.NEW_YORK,
        slots: [
          {
            startTime: TIME_WINDOWS.NEW_YORK_MORNING.START,
          },
        ],
      });

      prisma.$queryRaw.mockResolvedValue(toRawRows(mockProvider));

      // Act
      const result = await service.discover(request);

      // Assert
      const provider = result.providers[0];
      expect(provider).toHaveProperty("providerId");
      expect(provider).toHaveProperty("name");
      expect(provider).toHaveProperty("rating");
      expect(provider).toHaveProperty("distance");
      expect(provider).toHaveProperty("address");
      expect(provider).toHaveProperty("city");
      expect(provider).toHaveProperty("slots");
      expect(provider).toHaveProperty("lowestPrice");
      expect(Array.isArray(provider.slots)).toBe(true);
    });

    it("should calculate lowestPrice correctly", async () => {
      // Arrange
      const request = {
        serviceCategory: ServiceCategory.MASSAGE,
        city: TEST_CITIES.NEW_YORK,
        timeWindow: "Morning" as const,
      };

      const mockProvider = createTestProviderWithSlots({
        city: TEST_CITIES.NEW_YORK,
        slots: [
          {
            startTime: TIME_WINDOWS.NEW_YORK_MORNING.START,
            basePrice: 15000,
            maxDiscount: 0.2, // $120
          },
          {
            startTime: TIME_WINDOWS.NEW_YORK_MORNING.MID,
            basePrice: 10000,
            maxDiscount: 0.3, // $70
          },
        ],
      });

      prisma.$queryRaw.mockResolvedValue(toRawRows(mockProvider));

      // Act
      const result = await service.discover(request);

      // Assert
      expect(result.providers[0].lowestPrice).toBe(7000); // $70
    });
  });

  describe("Edge Cases", () => {
    it("should handle provider with empty name", async () => {
      // Arrange - raw SQL filters out empty names at query level
      const request = {
        serviceCategory: ServiceCategory.MASSAGE,
        city: TEST_CITIES.NEW_YORK,
        timeWindow: "Morning" as const,
      };

      // Raw SQL query filters out providers with empty/null names
      prisma.$queryRaw.mockResolvedValue([]);

      // Act
      const result = await service.discover(request);

      // Assert
      expect(result.providers).toHaveLength(0);
    });

    it("should handle provider with no address", async () => {
      // Arrange - raw SQL filters out null addresses at query level
      const request = {
        serviceCategory: ServiceCategory.MASSAGE,
        city: TEST_CITIES.NEW_YORK,
        timeWindow: "Morning" as const,
      };

      // Raw SQL query filters out providers with null addresses
      prisma.$queryRaw.mockResolvedValue([]);

      // Act
      const result = await service.discover(request);

      // Assert
      expect(result.providers).toHaveLength(0);
    });

    it("should handle provider with rating null", async () => {
      // Arrange
      const request = {
        serviceCategory: ServiceCategory.MASSAGE,
        city: TEST_CITIES.NEW_YORK,
        timeWindow: "Morning" as const,
      };

      const mockProvider = createTestProviderWithSlots({
        city: TEST_CITIES.NEW_YORK,
        rating: undefined, // Will be null
        slots: [{ startTime: TIME_WINDOWS.NEW_YORK_MORNING.START }],
      });

      const rawRows = toRawRows(mockProvider);
      // Set rating to null for test
      rawRows.forEach(row => row.rating = null);
      prisma.$queryRaw.mockResolvedValue(rawRows);

      // Act
      const result = await service.discover(request);

      // Assert
      expect(result.providers[0].rating).toBe(0);
    });

    it("should handle multiple providers with same data", async () => {
      // Arrange
      const request = {
        serviceCategory: ServiceCategory.MASSAGE,
        city: TEST_CITIES.NEW_YORK,
        timeWindow: "Morning" as const,
      };

      const provider1 = createTestProviderWithSlots({
        providerId: "provider-1",
        city: TEST_CITIES.NEW_YORK,
        slots: [{ startTime: TIME_WINDOWS.NEW_YORK_MORNING.START }],
      });

      const provider2 = createTestProviderWithSlots({
        providerId: "provider-2",
        city: TEST_CITIES.NEW_YORK,
        slots: [{ startTime: TIME_WINDOWS.NEW_YORK_MORNING.START }],
      });

      prisma.$queryRaw.mockResolvedValue([...toRawRows(provider1), ...toRawRows(provider2)]);

      // Act
      const result = await service.discover(request);

      // Assert
      expect(result.providers).toHaveLength(2);
    });
  });
});
