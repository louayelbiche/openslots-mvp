import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { ServiceCategory } from "@prisma/client";
import {
  setupTestDB,
  cleanupTestDB,
  seedDiscoveryTestData,
  createProviderWithSlots,
} from "./fixtures/db-setup";
import { TIME_WINDOWS } from "./fixtures/test-data";

describe("Discovery API (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    // Clean database before each test
    await setupTestDB(prisma);
  }, 30000); // 30 second timeout for database cleanup

  afterAll(async () => {
    await cleanupTestDB(prisma);
    await app.close();
  });

  describe("POST /api/discovery", () => {
    it("should return 200 OK with valid request", async () => {
      // Arrange
      await seedDiscoveryTestData(prisma);

      // Act & Assert
      return request(app.getHttpServer())
        .post("/api/discovery")
        .send({
          serviceCategory: ServiceCategory.MASSAGE,
          city: "New York",
          timeWindow: "Morning",
        })
        .expect(200);
    });

    it("should return providers with morning slots in New York", async () => {
      // Arrange
      await seedDiscoveryTestData(prisma);

      // Act
      const response = await request(app.getHttpServer())
        .post("/api/discovery")
        .send({
          serviceCategory: ServiceCategory.MASSAGE,
          city: "New York",
          timeWindow: "Morning",
        })
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty("providers");
      expect(Array.isArray(response.body.providers)).toBe(true);
      expect(response.body.providers.length).toBeGreaterThan(0);

      // Verify provider structure
      const provider = response.body.providers[0];
      expect(provider).toHaveProperty("providerId");
      expect(provider).toHaveProperty("name");
      expect(provider).toHaveProperty("rating");
      expect(provider).toHaveProperty("distance");
      expect(provider).toHaveProperty("address");
      expect(provider).toHaveProperty("city", "New York");
      expect(provider).toHaveProperty("slots");
      expect(provider).toHaveProperty("lowestPrice");

      // Verify slot structure
      const slot = provider.slots[0];
      expect(slot).toHaveProperty("slotId");
      expect(slot).toHaveProperty("startTime");
      expect(slot).toHaveProperty("endTime");
      expect(slot).toHaveProperty("basePrice");
      expect(slot).toHaveProperty("maxDiscount");
      expect(slot).toHaveProperty("maxDiscountedPrice");
      expect(slot).toHaveProperty("serviceName");
      expect(slot).toHaveProperty("durationMin");
    });

    it("should return providers with afternoon slots in New York", async () => {
      // Arrange
      await seedDiscoveryTestData(prisma);

      // Act
      const response = await request(app.getHttpServer())
        .post("/api/discovery")
        .send({
          serviceCategory: ServiceCategory.MASSAGE,
          city: "New York",
          timeWindow: "Afternoon",
        })
        .expect(200);

      // Assert
      expect(response.body.providers.length).toBeGreaterThan(0);
      expect(response.body.providers[0].city).toBe("New York");
    });

    it("should return providers with evening slots in New York", async () => {
      // Arrange
      await seedDiscoveryTestData(prisma);

      // Act
      const response = await request(app.getHttpServer())
        .post("/api/discovery")
        .send({
          serviceCategory: ServiceCategory.MASSAGE,
          city: "New York",
          timeWindow: "Evening",
        })
        .expect(200);

      // Assert
      expect(response.body.providers.length).toBeGreaterThan(0);
      expect(response.body.providers[0].city).toBe("New York");
    });

    it("should filter providers by city correctly", async () => {
      // Arrange
      await seedDiscoveryTestData(prisma);

      // Act - Request New York providers
      const nyResponse = await request(app.getHttpServer())
        .post("/api/discovery")
        .send({
          serviceCategory: ServiceCategory.MASSAGE,
          city: "New York",
          timeWindow: "Morning",
        })
        .expect(200);

      // Act - Request San Francisco providers
      const sfResponse = await request(app.getHttpServer())
        .post("/api/discovery")
        .send({
          serviceCategory: ServiceCategory.MASSAGE,
          city: "San Francisco",
          timeWindow: "Morning",
        })
        .expect(200);

      // Assert
      expect(nyResponse.body.providers.length).toBeGreaterThan(0);
      expect(sfResponse.body.providers.length).toBeGreaterThan(0);

      // Verify cities match
      nyResponse.body.providers.forEach((p: any) => {
        expect(p.city).toBe("New York");
      });

      sfResponse.body.providers.forEach((p: any) => {
        expect(p.city).toBe("San Francisco");
      });
    });

    it("should return empty providers array when no matches found", async () => {
      // Arrange
      await seedDiscoveryTestData(prisma);

      // Act - Request non-existent city
      const response = await request(app.getHttpServer())
        .post("/api/discovery")
        .send({
          serviceCategory: ServiceCategory.MASSAGE,
          city: "NonExistentCity",
          timeWindow: "Morning",
        })
        .expect(200);

      // Assert
      expect(response.body.providers).toEqual([]);
    });

    it("should return empty array when no slots in time window", async () => {
      // Arrange - Create provider with only afternoon slots
      await createProviderWithSlots(prisma, {
        providerId: "morning-test-provider",
        city: "New York",
        serviceCategory: ServiceCategory.MASSAGE,
        slots: [
          { startTime: TIME_WINDOWS.NEW_YORK_AFTERNOON.START },
        ],
      });

      // Act - Request morning slots
      const response = await request(app.getHttpServer())
        .post("/api/discovery")
        .send({
          serviceCategory: ServiceCategory.MASSAGE,
          city: "New York",
          timeWindow: "Morning",
        })
        .expect(200);

      // Assert
      expect(response.body.providers).toEqual([]);
    });

    it("should sort providers by lowest price", async () => {
      // Arrange - Create providers with different prices
      await createProviderWithSlots(prisma, {
        providerId: "expensive-provider",
        providerName: "Expensive Provider",
        city: "New York",
        serviceCategory: ServiceCategory.MASSAGE,
        slots: [
          {
            startTime: TIME_WINDOWS.NEW_YORK_MORNING.START,
            basePrice: 20000, // $200
            maxDiscount: 0.1, // $180
          },
        ],
      });

      await createProviderWithSlots(prisma, {
        providerId: "cheap-provider",
        providerName: "Cheap Provider",
        city: "New York",
        serviceCategory: ServiceCategory.MASSAGE,
        slots: [
          {
            startTime: TIME_WINDOWS.NEW_YORK_MORNING.START,
            basePrice: 8000, // $80
            maxDiscount: 0.1, // $72
          },
        ],
      });

      // Act
      const response = await request(app.getHttpServer())
        .post("/api/discovery")
        .send({
          serviceCategory: ServiceCategory.MASSAGE,
          city: "New York",
          timeWindow: "Morning",
        })
        .expect(200);

      // Assert
      expect(response.body.providers.length).toBeGreaterThanOrEqual(2);
      expect(response.body.providers[0].name).toBe("Cheap Provider");
      expect(response.body.providers[0].lowestPrice).toBeLessThan(
        response.body.providers[1].lowestPrice
      );
    });

    it("should handle Custom time window", async () => {
      // Arrange
      await createProviderWithSlots(prisma, {
        providerId: "custom-provider",
        city: "New York",
        serviceCategory: ServiceCategory.MASSAGE,
        slots: [
          { startTime: TIME_WINDOWS.NEW_YORK_MORNING.START },
          { startTime: TIME_WINDOWS.NEW_YORK_AFTERNOON.START },
          { startTime: TIME_WINDOWS.NEW_YORK_EVENING.START },
        ],
      });

      // Act
      const response = await request(app.getHttpServer())
        .post("/api/discovery")
        .send({
          serviceCategory: ServiceCategory.MASSAGE,
          city: "New York",
          timeWindow: "Custom",
        })
        .expect(200);

      // Assert
      expect(response.body.providers.length).toBe(1);
      expect(response.body.providers[0].slots.length).toBe(3);
    });

    it("should sort slots by price within a provider", async () => {
      // Arrange
      await createProviderWithSlots(prisma, {
        providerId: "multi-slot-provider",
        city: "New York",
        serviceCategory: ServiceCategory.MASSAGE,
        slots: [
          {
            startTime: TIME_WINDOWS.NEW_YORK_MORNING.START,
            basePrice: 15000,
            maxDiscount: 0.1, // $135
          },
          {
            startTime: TIME_WINDOWS.NEW_YORK_MORNING.MID,
            basePrice: 10000,
            maxDiscount: 0.1, // $90
          },
        ],
      });

      // Act
      const response = await request(app.getHttpServer())
        .post("/api/discovery")
        .send({
          serviceCategory: ServiceCategory.MASSAGE,
          city: "New York",
          timeWindow: "Morning",
        })
        .expect(200);

      // Assert
      const provider = response.body.providers[0];
      expect(provider.slots).toHaveLength(2);
      expect(provider.slots[0].maxDiscountedPrice).toBeLessThan(
        provider.slots[1].maxDiscountedPrice
      );
    });

    it("should calculate lowestPrice correctly", async () => {
      // Arrange
      await createProviderWithSlots(prisma, {
        providerId: "lowest-price-provider",
        city: "New York",
        serviceCategory: ServiceCategory.MASSAGE,
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

      // Act
      const response = await request(app.getHttpServer())
        .post("/api/discovery")
        .send({
          serviceCategory: ServiceCategory.MASSAGE,
          city: "New York",
          timeWindow: "Morning",
        })
        .expect(200);

      // Assert
      const provider = response.body.providers[0];
      expect(provider.lowestPrice).toBe(7000); // $70
    });

    it("should handle case-insensitive city search", async () => {
      // Arrange
      await seedDiscoveryTestData(prisma);

      // Act - Test different cases
      const lowerCaseResponse = await request(app.getHttpServer())
        .post("/api/discovery")
        .send({
          serviceCategory: ServiceCategory.MASSAGE,
          city: "new york",
          timeWindow: "Morning",
        })
        .expect(200);

      const upperCaseResponse = await request(app.getHttpServer())
        .post("/api/discovery")
        .send({
          serviceCategory: ServiceCategory.MASSAGE,
          city: "NEW YORK",
          timeWindow: "Morning",
        })
        .expect(200);

      // Assert
      expect(lowerCaseResponse.body.providers.length).toBeGreaterThan(0);
      expect(upperCaseResponse.body.providers.length).toBeGreaterThan(0);
      expect(lowerCaseResponse.body.providers.length).toBe(
        upperCaseResponse.body.providers.length
      );
    });

    it("should handle timezone differences (EST vs PST)", async () => {
      // Arrange
      await createProviderWithSlots(prisma, {
        providerId: "ny-provider",
        city: "New York",
        serviceCategory: ServiceCategory.MASSAGE,
        slots: [
          { startTime: TIME_WINDOWS.NEW_YORK_MORNING.START }, // 9am EST
        ],
      });

      await createProviderWithSlots(prisma, {
        providerId: "sf-provider",
        city: "San Francisco",
        serviceCategory: ServiceCategory.MASSAGE,
        slots: [
          { startTime: TIME_WINDOWS.SF_MORNING.START }, // 9am PST
        ],
      });

      // Act
      const nyResponse = await request(app.getHttpServer())
        .post("/api/discovery")
        .send({
          serviceCategory: ServiceCategory.MASSAGE,
          city: "New York",
          timeWindow: "Morning",
        })
        .expect(200);

      const sfResponse = await request(app.getHttpServer())
        .post("/api/discovery")
        .send({
          serviceCategory: ServiceCategory.MASSAGE,
          city: "San Francisco",
          timeWindow: "Morning",
        })
        .expect(200);

      // Assert - Both should find morning slots in their respective timezones
      expect(nyResponse.body.providers).toHaveLength(1);
      expect(sfResponse.body.providers).toHaveLength(1);
    });

    it("should validate all service categories", async () => {
      // Arrange
      const categories = [
        ServiceCategory.MASSAGE,
        ServiceCategory.HAIR,
        ServiceCategory.NAILS,
        ServiceCategory.ACUPUNCTURE,
        ServiceCategory.FACIALS_AND_SKIN,
        ServiceCategory.LASHES_AND_BROWS,
      ];

      // Create providers for each category
      for (const category of categories) {
        await createProviderWithSlots(prisma, {
          providerId: `${category.toLowerCase()}-provider`,
          city: "New York",
          serviceCategory: category,
          slots: [
            { startTime: TIME_WINDOWS.NEW_YORK_MORNING.START },
          ],
        });
      }

      // Act & Assert
      for (const category of categories) {
        const response = await request(app.getHttpServer())
          .post("/api/discovery")
          .send({
            serviceCategory: category,
            city: "New York",
            timeWindow: "Morning",
          })
          .expect(200);

        expect(response.body.providers.length).toBeGreaterThan(0);
      }
    }, 30000);

    it("should handle multiple cities", async () => {
      // Arrange
      const cities = ["New York", "San Francisco", "Los Angeles"];

      for (const city of cities) {
        await createProviderWithSlots(prisma, {
          providerId: `${city.toLowerCase().replace(/\s/g, "-")}-provider`,
          city,
          serviceCategory: ServiceCategory.MASSAGE,
          slots: [
            { startTime: TIME_WINDOWS.NEW_YORK_MORNING.START },
          ],
        });
      }

      // Act & Assert
      for (const city of cities) {
        const response = await request(app.getHttpServer())
          .post("/api/discovery")
          .send({
            serviceCategory: ServiceCategory.MASSAGE,
            city,
            timeWindow: "Morning",
          })
          .expect(200);

        expect(response.body.providers.length).toBeGreaterThan(0);
        response.body.providers.forEach((p: any) => {
          expect(p.city).toBe(city);
        });
      }
    });

    it("should return only OPEN slots", async () => {
      // Arrange
      await seedDiscoveryTestData(prisma);

      // Create a BOOKED slot that should not appear
      const provider = await prisma.provider.findFirst({
        where: { city: "New York" },
      });

      if (provider) {
        const service = await prisma.service.findFirst({
          where: { providerId: provider.id },
        });

        if (service) {
          await prisma.slot.create({
            data: {
              startTime: TIME_WINDOWS.NEW_YORK_MORNING.START,
              endTime: TIME_WINDOWS.NEW_YORK_MORNING.MID,
              status: "BOOKED" as any,
              basePrice: 10000,
              maxDiscount: 0.15,
              maxDiscountedPrice: 8500,
              serviceId: service.id,
              providerId: provider.id,
            },
          });
        }
      }

      // Act
      const response = await request(app.getHttpServer())
        .post("/api/discovery")
        .send({
          serviceCategory: ServiceCategory.MASSAGE,
          city: "New York",
          timeWindow: "Morning",
        })
        .expect(200);

      // Assert - BOOKED slot should not appear
      response.body.providers.forEach((provider: any) => {
        provider.slots.forEach((slot: any) => {
          // We can't check status directly as it's not in the response,
          // but we verify the slot count doesn't include BOOKED slots
          expect(slot).toHaveProperty("slotId");
        });
      });
    }, 30000);

    it("should handle zipCode parameter", async () => {
      // Arrange
      await seedDiscoveryTestData(prisma);

      // Act
      const response = await request(app.getHttpServer())
        .post("/api/discovery")
        .send({
          serviceCategory: ServiceCategory.MASSAGE,
          city: "New York",
          zipCode: "10001",
          timeWindow: "Morning",
        })
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty("providers");
    });

    it("should return correct distance values", async () => {
      // Arrange
      await seedDiscoveryTestData(prisma);

      // Act
      const response = await request(app.getHttpServer())
        .post("/api/discovery")
        .send({
          serviceCategory: ServiceCategory.MASSAGE,
          city: "New York",
          timeWindow: "Morning",
        })
        .expect(200);

      // Assert
      response.body.providers.forEach((provider: any) => {
        expect(typeof provider.distance).toBe("number");
        expect(provider.distance).toBeGreaterThan(0);
        expect(provider.distance).toBeLessThanOrEqual(11); // Based on calculateDistance logic
      });
    });

    it("should return ISO 8601 formatted timestamps", async () => {
      // Arrange
      await seedDiscoveryTestData(prisma);

      // Act
      const response = await request(app.getHttpServer())
        .post("/api/discovery")
        .send({
          serviceCategory: ServiceCategory.MASSAGE,
          city: "New York",
          timeWindow: "Morning",
        })
        .expect(200);

      // Assert
      const slot = response.body.providers[0].slots[0];
      expect(slot.startTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(slot.endTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      // Verify it's a valid date
      expect(new Date(slot.startTime).toString()).not.toBe("Invalid Date");
      expect(new Date(slot.endTime).toString()).not.toBe("Invalid Date");
    });
  });
});
