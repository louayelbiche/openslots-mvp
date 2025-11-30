import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SlotStatus } from "@prisma/client";
import {
  DiscoveryRequestDto,
  TimeWindow,
} from "./dto/discovery-request.dto";
import {
  DiscoveryResponseDto,
  ProviderDto,
  SlotDto,
} from "./dto/discovery-response.dto";

@Injectable()
export class DiscoveryService {
  constructor(private prisma: PrismaService) {}

  async discover(request: DiscoveryRequestDto): Promise<DiscoveryResponseDto> {
    // Step 1: Validate inputs
    this.validateRequest(request);

    // Step 2: Fetch providers matching city and service category
    const providers = await this.fetchProviders(
      request.city,
      request.serviceCategory
    );

    // Step 3: Filter slots by time window and transform data
    const providersWithSlots = this.filterAndTransformProviders(
      providers,
      request.timeWindow
    );

    // Step 4: Sort providers
    const sortedProviders = this.sortProviders(providersWithSlots);

    return { providers: sortedProviders };
  }

  private validateRequest(request: DiscoveryRequestDto): void {
    if (!request.serviceCategory) {
      throw new BadRequestException("serviceCategory is required");
    }
    if (!request.city) {
      throw new BadRequestException("city is required");
    }
    // timeWindow is optional - if not provided, returns all slots
  }

  private async fetchProviders(city: string, serviceCategory: string) {
    return await this.prisma.provider.findMany({
      where: {
        city: {
          equals: city,
          mode: "insensitive",
        },
        services: {
          some: {
            category: serviceCategory as any,
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
  }

  private filterAndTransformProviders(
    providers: any[],
    timeWindow?: TimeWindow
  ): ProviderDto[] {
    const result: ProviderDto[] = [];

    for (const provider of providers) {
      // Filter slots by time window (if provided), considering provider's city timezone
      const filteredSlots = timeWindow
        ? provider.slots.filter((slot: any) =>
            this.isSlotInTimeWindow(slot.startTime, timeWindow, provider.city)
          )
        : provider.slots;

      // Skip providers with no valid slots
      if (filteredSlots.length === 0) {
        continue;
      }

      // Skip providers with incomplete data
      if (!provider.name || !provider.address) {
        continue;
      }

      // Transform slots
      const slots: SlotDto[] = filteredSlots.map((slot: any) => ({
        slotId: slot.id,
        startTime: slot.startTime.toISOString(),
        endTime: slot.endTime.toISOString(),
        basePrice: slot.basePrice,
        maxDiscount: parseFloat(slot.maxDiscount.toString()),
        maxDiscountedPrice: slot.maxDiscountedPrice,
        serviceName: slot.service.name,
        durationMin: slot.service.durationMin,
      }));

      // Sort slots by maxDiscountedPrice (ascending), then by startTime (ascending)
      slots.sort((a, b) => {
        if (a.maxDiscountedPrice !== b.maxDiscountedPrice) {
          return a.maxDiscountedPrice - b.maxDiscountedPrice;
        }
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      });

      // Calculate lowest price
      const lowestPrice = Math.min(
        ...slots.map((s) => s.maxDiscountedPrice)
      );

      // Calculate distance (placeholder for MVP)
      const distance = this.calculateDistance(provider);

      result.push({
        providerId: provider.id,
        name: provider.name,
        rating: provider.rating ? parseFloat(provider.rating.toString()) : 0,
        distance,
        address: provider.address,
        city: provider.city,
        slots,
        lowestPrice,
      });
    }

    return result;
  }

  private isSlotInTimeWindow(startTime: Date, timeWindow: TimeWindow, city: string): boolean {
    // Timezone offsets for cities (hours from UTC, standard time)
    const CITY_TIMEZONE_OFFSETS: Record<string, number> = {
      "New York": -5,      // EST (UTC-5)
      "New York City": -5, // EST (UTC-5)
      "San Francisco": -8, // PST (UTC-8)
      "Los Angeles": -8,   // PST (UTC-8)
      "Bali": 8,           // WITA (UTC+8)
    };

    // Convert UTC time to city's local time
    const timezoneOffset = CITY_TIMEZONE_OFFSETS[city] || 0;
    const utcHour = startTime.getUTCHours();
    const localHour = (utcHour + timezoneOffset + 24) % 24; // Add 24 to handle negative wrapping

    switch (timeWindow) {
      case "Morning":
        return localHour >= 9 && localHour < 12;
      case "Afternoon":
        return localHour >= 12 && localHour < 16;
      case "Evening":
        return localHour >= 16 && localHour < 20;
      case "Custom":
        // For Custom, accept all slots for MVP
        return true;
      default:
        return false;
    }
  }

  private calculateDistance(provider: any): number {
    // Simple placeholder distance calculation for MVP
    // In production, this would use Haversine formula with user's lat/long
    // For now, generate a deterministic distance based on provider ID
    const hash = provider.id
      .split("")
      .reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    return Math.round((hash % 100) / 10) + 1; // Returns 1-11 miles
  }

  private sortProviders(providers: ProviderDto[]): ProviderDto[] {
    return providers.sort((a, b) => {
      // 1. Sort by lowest maxDiscountedPrice (ascending)
      if (a.lowestPrice !== b.lowestPrice) {
        return a.lowestPrice - b.lowestPrice;
      }

      // 2. Sort by rating (descending)
      if (a.rating !== b.rating) {
        return b.rating - a.rating;
      }

      // 3. Sort by distance (ascending)
      return a.distance - b.distance;
    });
  }
}
