import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { DiscoveryController } from "./discovery.controller";
import { DiscoveryService } from "./discovery.service";
import { ServiceCategory } from "@prisma/client";
import { DiscoveryRequestDto } from "./dto/discovery-request.dto";
import { DiscoveryResponseDto } from "./dto/discovery-response.dto";

describe("DiscoveryController", () => {
  let controller: DiscoveryController;
  let service: jest.Mocked<DiscoveryService>;

  beforeEach(async () => {
    const mockDiscoveryService = {
      discover: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiscoveryController],
      providers: [
        {
          provide: DiscoveryService,
          useValue: mockDiscoveryService,
        },
      ],
    }).compile();

    controller = module.get<DiscoveryController>(DiscoveryController);
    service = module.get(DiscoveryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("discover", () => {
    it("should be defined", () => {
      expect(controller).toBeDefined();
    });

    it("should call service.discover with correct parameters", async () => {
      // Arrange
      const request: DiscoveryRequestDto = {
        serviceCategory: ServiceCategory.MASSAGE,
        city: "New York",
        timeWindow: "Morning",
      };

      const expectedResponse: DiscoveryResponseDto = {
        providers: [
          {
            providerId: "provider-1",
            name: "Test Provider",
            rating: 4.5,
            distance: 2,
            address: "123 Test St",
            city: "New York",
            slots: [
              {
                slotId: "slot-1",
                startTime: "2025-11-28T14:00:00Z",
                endTime: "2025-11-28T15:00:00Z",
                basePrice: 10000,
                maxDiscount: 0.15,
                maxDiscountedPrice: 8500,
                serviceName: "60-Minute Massage",
                durationMin: 60,
              },
            ],
            lowestPrice: 8500,
          },
        ],
      };

      service.discover.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.discover(request);

      // Assert
      expect(service.discover).toHaveBeenCalledWith(request);
      expect(service.discover).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResponse);
    });

    it("should return empty providers array when no matches found", async () => {
      // Arrange
      const request: DiscoveryRequestDto = {
        serviceCategory: ServiceCategory.MASSAGE,
        city: "New York",
        timeWindow: "Morning",
      };

      const expectedResponse: DiscoveryResponseDto = {
        providers: [],
      };

      service.discover.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.discover(request);

      // Assert
      expect(result.providers).toEqual([]);
      expect(result.providers).toHaveLength(0);
    });

    it("should handle multiple providers in response", async () => {
      // Arrange
      const request: DiscoveryRequestDto = {
        serviceCategory: ServiceCategory.MASSAGE,
        city: "New York",
        timeWindow: "Afternoon",
      };

      const expectedResponse: DiscoveryResponseDto = {
        providers: [
          {
            providerId: "provider-1",
            name: "Provider 1",
            rating: 4.8,
            distance: 1,
            address: "123 Test St",
            city: "New York",
            slots: [
              {
                slotId: "slot-1",
                startTime: "2025-11-28T17:00:00Z",
                endTime: "2025-11-28T18:00:00Z",
                basePrice: 10000,
                maxDiscount: 0.15,
                maxDiscountedPrice: 8500,
                serviceName: "Swedish Massage",
                durationMin: 60,
              },
            ],
            lowestPrice: 8500,
          },
          {
            providerId: "provider-2",
            name: "Provider 2",
            rating: 4.5,
            distance: 2,
            address: "456 Test Ave",
            city: "New York",
            slots: [
              {
                slotId: "slot-2",
                startTime: "2025-11-28T19:00:00Z",
                endTime: "2025-11-28T20:00:00Z",
                basePrice: 12000,
                maxDiscount: 0.20,
                maxDiscountedPrice: 9600,
                serviceName: "Deep Tissue Massage",
                durationMin: 60,
              },
            ],
            lowestPrice: 9600,
          },
        ],
      };

      service.discover.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.discover(request);

      // Assert
      expect(result.providers).toHaveLength(2);
      expect(result.providers[0].providerId).toBe("provider-1");
      expect(result.providers[1].providerId).toBe("provider-2");
    });

    it("should propagate BadRequestException from service", async () => {
      // Arrange
      const request: DiscoveryRequestDto = {
        serviceCategory: null as any,
        city: "New York",
        timeWindow: "Morning",
      };

      service.discover.mockRejectedValue(
        new BadRequestException("serviceCategory is required")
      );

      // Act & Assert
      await expect(controller.discover(request)).rejects.toThrow(
        BadRequestException
      );
      await expect(controller.discover(request)).rejects.toThrow(
        "serviceCategory is required"
      );
    });

    it("should handle different service categories", async () => {
      // Arrange
      const requests = [
        {
          serviceCategory: ServiceCategory.MASSAGE,
          city: "New York",
          timeWindow: "Morning" as const,
        },
        {
          serviceCategory: ServiceCategory.HAIR,
          city: "New York",
          timeWindow: "Morning" as const,
        },
        {
          serviceCategory: ServiceCategory.NAILS,
          city: "New York",
          timeWindow: "Morning" as const,
        },
      ];

      service.discover.mockResolvedValue({ providers: [] });

      // Act & Assert
      for (const request of requests) {
        await controller.discover(request);
        expect(service.discover).toHaveBeenCalledWith(
          expect.objectContaining({
            serviceCategory: request.serviceCategory,
          })
        );
      }
    });

    it("should handle different time windows", async () => {
      // Arrange
      const timeWindows = ["Morning", "Afternoon", "Evening", "Custom"] as const;

      service.discover.mockResolvedValue({ providers: [] });

      // Act & Assert
      for (const timeWindow of timeWindows) {
        const request: DiscoveryRequestDto = {
          serviceCategory: ServiceCategory.MASSAGE,
          city: "New York",
          timeWindow,
        };

        await controller.discover(request);
        expect(service.discover).toHaveBeenCalledWith(
          expect.objectContaining({
            timeWindow,
          })
        );
      }
    });

    it("should handle different cities", async () => {
      // Arrange
      const cities = ["New York", "San Francisco", "Los Angeles"];

      service.discover.mockResolvedValue({ providers: [] });

      // Act & Assert
      for (const city of cities) {
        const request: DiscoveryRequestDto = {
          serviceCategory: ServiceCategory.MASSAGE,
          city,
          timeWindow: "Morning",
        };

        await controller.discover(request);
        expect(service.discover).toHaveBeenCalledWith(
          expect.objectContaining({
            city,
          })
        );
      }
    });

    it("should pass optional zipCode parameter", async () => {
      // Arrange
      const request: DiscoveryRequestDto = {
        serviceCategory: ServiceCategory.MASSAGE,
        city: "New York",
        zipCode: "10001",
        timeWindow: "Morning",
      };

      service.discover.mockResolvedValue({ providers: [] });

      // Act
      await controller.discover(request);

      // Assert
      expect(service.discover).toHaveBeenCalledWith(
        expect.objectContaining({
          zipCode: "10001",
        })
      );
    });

    it("should handle request without optional zipCode", async () => {
      // Arrange
      const request: DiscoveryRequestDto = {
        serviceCategory: ServiceCategory.MASSAGE,
        city: "New York",
        timeWindow: "Morning",
      };

      service.discover.mockResolvedValue({ providers: [] });

      // Act
      await controller.discover(request);

      // Assert
      expect(service.discover).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceCategory: ServiceCategory.MASSAGE,
          city: "New York",
          timeWindow: "Morning",
        })
      );
    });

    it("should return providers with multiple slots", async () => {
      // Arrange
      const request: DiscoveryRequestDto = {
        serviceCategory: ServiceCategory.MASSAGE,
        city: "New York",
        timeWindow: "Evening",
      };

      const expectedResponse: DiscoveryResponseDto = {
        providers: [
          {
            providerId: "provider-1",
            name: "Test Provider",
            rating: 4.5,
            distance: 2,
            address: "123 Test St",
            city: "New York",
            slots: [
              {
                slotId: "slot-1",
                startTime: "2025-11-28T21:00:00Z",
                endTime: "2025-11-28T22:00:00Z",
                basePrice: 10000,
                maxDiscount: 0.15,
                maxDiscountedPrice: 8500,
                serviceName: "60-Minute Massage",
                durationMin: 60,
              },
              {
                slotId: "slot-2",
                startTime: "2025-11-28T22:00:00Z",
                endTime: "2025-11-28T23:00:00Z",
                basePrice: 10000,
                maxDiscount: 0.20,
                maxDiscountedPrice: 8000,
                serviceName: "60-Minute Massage",
                durationMin: 60,
              },
              {
                slotId: "slot-3",
                startTime: "2025-11-28T23:00:00Z",
                endTime: "2025-11-29T00:00:00Z",
                basePrice: 10000,
                maxDiscount: 0.25,
                maxDiscountedPrice: 7500,
                serviceName: "60-Minute Massage",
                durationMin: 60,
              },
            ],
            lowestPrice: 7500,
          },
        ],
      };

      service.discover.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.discover(request);

      // Assert
      expect(result.providers[0].slots).toHaveLength(3);
      expect(result.providers[0].lowestPrice).toBe(7500);
    });

    it("should handle service errors gracefully", async () => {
      // Arrange
      const request: DiscoveryRequestDto = {
        serviceCategory: ServiceCategory.MASSAGE,
        city: "New York",
        timeWindow: "Morning",
      };

      service.discover.mockRejectedValue(new Error("Database connection failed"));

      // Act & Assert
      await expect(controller.discover(request)).rejects.toThrow(
        "Database connection failed"
      );
    });

    it("should return correct data types in response", async () => {
      // Arrange
      const request: DiscoveryRequestDto = {
        serviceCategory: ServiceCategory.MASSAGE,
        city: "New York",
        timeWindow: "Morning",
      };

      const expectedResponse: DiscoveryResponseDto = {
        providers: [
          {
            providerId: "provider-1",
            name: "Test Provider",
            rating: 4.5,
            distance: 2,
            address: "123 Test St",
            city: "New York",
            slots: [
              {
                slotId: "slot-1",
                startTime: "2025-11-28T14:00:00Z",
                endTime: "2025-11-28T15:00:00Z",
                basePrice: 10000,
                maxDiscount: 0.15,
                maxDiscountedPrice: 8500,
                serviceName: "60-Minute Massage",
                durationMin: 60,
              },
            ],
            lowestPrice: 8500,
          },
        ],
      };

      service.discover.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.discover(request);

      // Assert
      const provider = result.providers[0];
      const slot = provider.slots[0];

      expect(typeof provider.providerId).toBe("string");
      expect(typeof provider.name).toBe("string");
      expect(typeof provider.rating).toBe("number");
      expect(typeof provider.distance).toBe("number");
      expect(typeof provider.address).toBe("string");
      expect(typeof provider.city).toBe("string");
      expect(typeof provider.lowestPrice).toBe("number");

      expect(typeof slot.slotId).toBe("string");
      expect(typeof slot.startTime).toBe("string");
      expect(typeof slot.endTime).toBe("string");
      expect(typeof slot.basePrice).toBe("number");
      expect(typeof slot.maxDiscount).toBe("number");
      expect(typeof slot.maxDiscountedPrice).toBe("number");
      expect(typeof slot.serviceName).toBe("string");
      expect(typeof slot.durationMin).toBe("number");
    });
  });
});
