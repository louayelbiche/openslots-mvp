import { PrismaClient, ServiceCategory, SlotStatus } from "@prisma/client";
import { createTestProvider, createTestService, createTestSlot } from "./test-data";

/**
 * Database setup and teardown helpers for E2E tests
 * These helpers manage test data lifecycle for integration/E2E tests
 */

/**
 * Creates a PrismaClient instance for testing
 */
export function createTestPrismaClient(): PrismaClient {
  return new PrismaClient();
}

/**
 * Sets up the test database by clearing existing data
 * Called before each test suite
 */
export async function setupTestDB(prisma: PrismaClient): Promise<void> {
  // Clear all test data in correct order (respecting foreign keys)
  await prisma.booking.deleteMany();
  await prisma.negotiationOffer.deleteMany();
  await prisma.negotiation.deleteMany();
  await prisma.slot.deleteMany();
  await prisma.service.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.user.deleteMany();
}

/**
 * Cleans up the test database after tests
 * Called after each test suite
 */
export async function cleanupTestDB(prisma: PrismaClient): Promise<void> {
  await setupTestDB(prisma); // Same cleanup logic
  await prisma.$disconnect();
}

/**
 * Seeds the database with test data for discovery E2E tests
 * Creates providers, services, and slots across multiple cities
 */
export async function seedDiscoveryTestData(prisma: PrismaClient): Promise<{
  providers: any[];
  services: any[];
  slots: any[];
}> {
  // Create test users (owners)
  const owner1 = await prisma.user.create({
    data: {
      id: "test-owner-1",
      email: "owner1@test.com",
      name: "Test Owner 1",
      role: "PROVIDER",
    },
  });

  const owner2 = await prisma.user.create({
    data: {
      id: "test-owner-2",
      email: "owner2@test.com",
      name: "Test Owner 2",
      role: "PROVIDER",
    },
  });

  const owner3 = await prisma.user.create({
    data: {
      id: "test-owner-3",
      email: "owner3@test.com",
      name: "Test Owner 3",
      role: "PROVIDER",
    },
  });

  // Create providers in different cities
  const provider1 = await prisma.provider.create({
    data: createTestProvider({
      id: "ny-massage-1",
      name: "NYC Massage Therapy",
      city: "New York",
      state: "NY",
      zipCode: "10001",
      rating: 4.8,
      ownerId: owner1.id,
    }),
  });

  const provider2 = await prisma.provider.create({
    data: createTestProvider({
      id: "ny-massage-2",
      name: "Manhattan Wellness",
      city: "New York",
      state: "NY",
      zipCode: "10002",
      rating: 4.5,
      ownerId: owner2.id,
    }),
  });

  const provider3 = await prisma.provider.create({
    data: createTestProvider({
      id: "sf-massage-1",
      name: "SF Healing Touch",
      city: "San Francisco",
      state: "CA",
      zipCode: "94102",
      rating: 4.9,
      ownerId: owner3.id,
    }),
  });

  // Create services
  const service1 = await prisma.service.create({
    data: createTestService({
      id: "service-ny-massage-1",
      name: "Deep Tissue Massage",
      category: ServiceCategory.MASSAGE,
      durationMin: 60,
      basePrice: 12000, // $120
      providerId: provider1.id,
    }),
  });

  const service2 = await prisma.service.create({
    data: createTestService({
      id: "service-ny-massage-2",
      name: "Swedish Massage",
      category: ServiceCategory.MASSAGE,
      durationMin: 60,
      basePrice: 10000, // $100
      providerId: provider2.id,
    }),
  });

  const service3 = await prisma.service.create({
    data: createTestService({
      id: "service-sf-massage-1",
      name: "Hot Stone Massage",
      category: ServiceCategory.MASSAGE,
      durationMin: 90,
      basePrice: 15000, // $150
      providerId: provider3.id,
    }),
  });

  // Create slots for different time windows
  // Morning slots (9am-12pm local time)
  const slot1 = await prisma.slot.create({
    data: createTestSlot({
      id: "slot-ny-morning-1",
      startTime: new Date("2025-11-28T14:00:00Z"), // 9am EST
      endTime: new Date("2025-11-28T15:00:00Z"), // 10am EST
      status: SlotStatus.OPEN,
      basePrice: 12000,
      maxDiscount: 0.15,
      maxDiscountedPrice: 10200, // $102
      serviceId: service1.id,
      providerId: provider1.id,
    }),
  });

  const slot2 = await prisma.slot.create({
    data: createTestSlot({
      id: "slot-ny-morning-2",
      startTime: new Date("2025-11-28T16:00:00Z"), // 11am EST
      endTime: new Date("2025-11-28T17:00:00Z"), // 12pm EST
      status: SlotStatus.OPEN,
      basePrice: 10000,
      maxDiscount: 0.20,
      maxDiscountedPrice: 8000, // $80
      serviceId: service2.id,
      providerId: provider2.id,
    }),
  });

  // Afternoon slots (12pm-4pm local time)
  const slot3 = await prisma.slot.create({
    data: createTestSlot({
      id: "slot-ny-afternoon-1",
      startTime: new Date("2025-11-28T17:00:00Z"), // 12pm EST
      endTime: new Date("2025-11-28T18:00:00Z"), // 1pm EST
      status: SlotStatus.OPEN,
      basePrice: 12000,
      maxDiscount: 0.10,
      maxDiscountedPrice: 10800, // $108
      serviceId: service1.id,
      providerId: provider1.id,
    }),
  });

  const slot4 = await prisma.slot.create({
    data: createTestSlot({
      id: "slot-ny-afternoon-2",
      startTime: new Date("2025-11-28T19:00:00Z"), // 2pm EST
      endTime: new Date("2025-11-28T20:00:00Z"), // 3pm EST
      status: SlotStatus.OPEN,
      basePrice: 10000,
      maxDiscount: 0.15,
      maxDiscountedPrice: 8500, // $85
      serviceId: service2.id,
      providerId: provider2.id,
    }),
  });

  // Evening slots (4pm-8pm local time)
  const slot5 = await prisma.slot.create({
    data: createTestSlot({
      id: "slot-ny-evening-1",
      startTime: new Date("2025-11-28T21:00:00Z"), // 4pm EST
      endTime: new Date("2025-11-28T22:00:00Z"), // 5pm EST
      status: SlotStatus.OPEN,
      basePrice: 12000,
      maxDiscount: 0.25,
      maxDiscountedPrice: 9000, // $90
      serviceId: service1.id,
      providerId: provider1.id,
    }),
  });

  const slot6 = await prisma.slot.create({
    data: createTestSlot({
      id: "slot-ny-evening-2",
      startTime: new Date("2025-11-28T23:00:00Z"), // 6pm EST
      endTime: new Date("2025-11-29T00:00:00Z"), // 7pm EST
      status: SlotStatus.OPEN,
      basePrice: 10000,
      maxDiscount: 0.30,
      maxDiscountedPrice: 7000, // $70
      serviceId: service2.id,
      providerId: provider2.id,
    }),
  });

  // San Francisco morning slots
  const slot7 = await prisma.slot.create({
    data: createTestSlot({
      id: "slot-sf-morning-1",
      startTime: new Date("2025-11-28T17:00:00Z"), // 9am PST
      endTime: new Date("2025-11-28T18:30:00Z"), // 10:30am PST
      status: SlotStatus.OPEN,
      basePrice: 15000,
      maxDiscount: 0.20,
      maxDiscountedPrice: 12000, // $120
      serviceId: service3.id,
      providerId: provider3.id,
    }),
  });

  return {
    providers: [provider1, provider2, provider3],
    services: [service1, service2, service3],
    slots: [slot1, slot2, slot3, slot4, slot5, slot6, slot7],
  };
}

/**
 * Helper to create a single provider with slots for testing
 */
export async function createProviderWithSlots(
  prisma: PrismaClient,
  overrides?: {
    providerId?: string;
    providerName?: string;
    city?: string;
    serviceCategory?: ServiceCategory;
    slots?: Array<{
      startTime: Date;
      basePrice?: number;
      maxDiscount?: number;
    }>;
  }
): Promise<any> {
  // Create owner
  const ownerId = `owner-${overrides?.providerId || "test"}`;
  const owner = await prisma.user.create({
    data: {
      id: ownerId,
      email: `${ownerId}@test.com`,
      name: "Test Owner",
      role: "PROVIDER",
    },
  });

  // Create provider
  const provider = await prisma.provider.create({
    data: createTestProvider({
      id: overrides?.providerId || "test-provider",
      name: overrides?.providerName || "Test Provider",
      city: overrides?.city || "New York",
      ownerId: owner.id,
    }),
  });

  // Create service
  const service = await prisma.service.create({
    data: createTestService({
      id: `service-${provider.id}`,
      category: overrides?.serviceCategory || ServiceCategory.MASSAGE,
      providerId: provider.id,
    }),
  });

  // Create slots
  const slots = await Promise.all(
    (overrides?.slots || []).map((slotData, index) =>
      prisma.slot.create({
        data: createTestSlot({
          id: `slot-${provider.id}-${index}`,
          startTime: slotData.startTime,
          basePrice: slotData.basePrice,
          maxDiscount: slotData.maxDiscount,
          serviceId: service.id,
          providerId: provider.id,
        }),
      })
    )
  );

  return { provider, service, slots };
}
