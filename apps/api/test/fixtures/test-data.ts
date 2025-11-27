import { ServiceCategory, SlotStatus } from "@prisma/client";

/**
 * Test data fixtures for discovery module tests
 * All fixtures are deterministic and reusable
 */

// Fixed test constants
export const TEST_CITIES = {
  NEW_YORK: "New York",
  SAN_FRANCISCO: "San Francisco",
  LOS_ANGELES: "Los Angeles",
} as const;

export const TEST_SERVICE_CATEGORIES = {
  MASSAGE: ServiceCategory.MASSAGE,
  HAIR: ServiceCategory.HAIR,
  NAILS: ServiceCategory.NAILS,
} as const;

// Base date for all time-related tests (fixed for determinism)
export const BASE_DATE = new Date("2025-11-28T00:00:00Z");

/**
 * Creates a test city with consistent data
 */
export function createTestCity(overrides?: {
  name?: string;
  state?: string;
  timezone?: string;
}) {
  return {
    name: overrides?.name || TEST_CITIES.NEW_YORK,
    state: overrides?.state || "NY",
    timezone: overrides?.timezone || "America/New_York",
  };
}

/**
 * Creates a test provider with deterministic data
 */
export function createTestProvider(overrides?: {
  id?: string;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  rating?: number;
  ownerId?: string;
}) {
  return {
    id: overrides?.id || "test-provider-1",
    name: overrides?.name || "Test Salon & Spa",
    description: "A test provider for unit tests",
    address: overrides?.address || "123 Test Street",
    addressLine2: null,
    city: overrides?.city || TEST_CITIES.NEW_YORK,
    state: overrides?.state || "NY",
    zipCode: overrides?.zipCode || "10001",
    latitude: null,
    longitude: null,
    rating: overrides?.rating !== undefined ? overrides.rating : 4.5,
    ownerId: overrides?.ownerId || "test-owner-1",
    createdAt: new Date("2025-01-01T00:00:00Z"),
    updatedAt: new Date("2025-01-01T00:00:00Z"),
  };
}

/**
 * Creates a test service with deterministic data
 */
export function createTestService(overrides?: {
  id?: string;
  name?: string;
  category?: ServiceCategory;
  durationMin?: number;
  basePrice?: number;
  providerId?: string;
}) {
  return {
    id: overrides?.id || "test-service-1",
    name: overrides?.name || "60-Minute Massage",
    description: "A relaxing massage service",
    category: overrides?.category || TEST_SERVICE_CATEGORIES.MASSAGE,
    durationMin: overrides?.durationMin || 60,
    basePrice: overrides?.basePrice || 10000, // $100.00 in cents
    providerId: overrides?.providerId || "test-provider-1",
  };
}

/**
 * Creates a test slot with deterministic data
 * Time is in UTC for consistent testing
 */
export function createTestSlot(overrides?: {
  id?: string;
  startTime?: Date;
  endTime?: Date;
  status?: SlotStatus;
  basePrice?: number;
  maxDiscount?: number;
  maxDiscountedPrice?: number;
  serviceId?: string;
  providerId?: string;
}) {
  const basePrice = overrides?.basePrice || 10000; // $100.00
  const maxDiscount = overrides?.maxDiscount || 0.15; // 15%
  const maxDiscountedPrice =
    overrides?.maxDiscountedPrice || Math.round(basePrice * (1 - maxDiscount));

  return {
    id: overrides?.id || "test-slot-1",
    startTime: overrides?.startTime || new Date("2025-11-28T14:00:00Z"), // 9am EST
    endTime: overrides?.endTime || new Date("2025-11-28T15:00:00Z"), // 10am EST
    status: overrides?.status || SlotStatus.OPEN,
    basePrice,
    maxDiscount,
    maxDiscountedPrice,
    serviceId: overrides?.serviceId || "test-service-1",
    providerId: overrides?.providerId || "test-provider-1",
  };
}

/**
 * Creates a complete provider with services and slots
 * Useful for integration tests
 */
export function createTestProviderWithSlots(overrides?: {
  providerId?: string;
  providerName?: string;
  city?: string;
  rating?: number;
  slots?: Array<{
    id?: string;
    startTime?: Date;
    basePrice?: number;
    maxDiscount?: number;
  }>;
}) {
  const providerId = overrides?.providerId || "test-provider-1";
  const serviceId = `${providerId}-service-1`;

  const provider = createTestProvider({
    id: providerId,
    name: overrides?.providerName || "Test Salon & Spa",
    city: overrides?.city || TEST_CITIES.NEW_YORK,
    rating: overrides?.rating,
  });

  const service = createTestService({
    id: serviceId,
    providerId,
  });

  const slots = (overrides?.slots || [{ startTime: new Date("2025-11-28T14:00:00Z") }]).map(
    (slotOverride, index) => {
      const slot = createTestSlot({
        id: slotOverride.id || `${providerId}-slot-${index + 1}`,
        startTime: slotOverride.startTime,
        basePrice: slotOverride.basePrice,
        maxDiscount: slotOverride.maxDiscount,
        serviceId,
        providerId,
      });

      return {
        ...slot,
        service,
      };
    }
  );

  return {
    ...provider,
    slots,
  };
}

/**
 * Time window test helpers
 * Returns UTC times that map to specific local times in different cities
 */
export const TIME_WINDOWS = {
  // New York (EST = UTC-5)
  NEW_YORK_MORNING: {
    // 9am EST = 2pm UTC
    START: new Date("2025-11-28T14:00:00Z"),
    // 11am EST = 4pm UTC
    MID: new Date("2025-11-28T16:00:00Z"),
  },
  NEW_YORK_AFTERNOON: {
    // 12pm EST = 5pm UTC
    START: new Date("2025-11-28T17:00:00Z"),
    // 2pm EST = 7pm UTC
    MID: new Date("2025-11-28T19:00:00Z"),
  },
  NEW_YORK_EVENING: {
    // 4pm EST = 9pm UTC
    START: new Date("2025-11-28T21:00:00Z"),
    // 6pm EST = 11pm UTC
    MID: new Date("2025-11-28T23:00:00Z"),
  },

  // San Francisco/Los Angeles (PST = UTC-8)
  SF_MORNING: {
    // 9am PST = 5pm UTC
    START: new Date("2025-11-28T17:00:00Z"),
    // 11am PST = 7pm UTC
    MID: new Date("2025-11-28T19:00:00Z"),
  },
  SF_AFTERNOON: {
    // 12pm PST = 8pm UTC
    START: new Date("2025-11-28T20:00:00Z"),
    // 2pm PST = 10pm UTC
    MID: new Date("2025-11-28T22:00:00Z"),
  },
  SF_EVENING: {
    // 4pm PST = 12am UTC (next day)
    START: new Date("2025-11-29T00:00:00Z"),
    // 6pm PST = 2am UTC (next day)
    MID: new Date("2025-11-29T02:00:00Z"),
  },
};

/**
 * Boundary time helpers for edge case testing
 */
export const BOUNDARY_TIMES = {
  // Just before Morning starts (8:59am local)
  BEFORE_MORNING_EST: new Date("2025-11-28T13:59:00Z"),
  // Morning starts (9:00am EST)
  MORNING_START_EST: new Date("2025-11-28T14:00:00Z"),
  // Just before Afternoon (11:59am EST)
  BEFORE_AFTERNOON_EST: new Date("2025-11-28T16:59:00Z"),
  // Afternoon starts (12:00pm EST)
  AFTERNOON_START_EST: new Date("2025-11-28T17:00:00Z"),
  // Just before Evening (3:59pm EST)
  BEFORE_EVENING_EST: new Date("2025-11-28T20:59:00Z"),
  // Evening starts (4:00pm EST)
  EVENING_START_EST: new Date("2025-11-28T21:00:00Z"),
  // After Evening ends (8:00pm EST)
  AFTER_EVENING_EST: new Date("2025-11-29T01:00:00Z"),
};
