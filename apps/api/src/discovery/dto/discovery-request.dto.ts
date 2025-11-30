import { ServiceCategory } from "@prisma/client";

export type TimeWindow = "Morning" | "Afternoon" | "Evening" | "Custom";

export class DiscoveryRequestDto {
  serviceCategory: ServiceCategory;
  city: string;
  zipCode?: string;
  timeWindow?: TimeWindow; // Optional - if not provided, returns all slots
  serviceType?: string; // Optional - service name to filter by (e.g., "Blowout", "Swedish Massage")
}
