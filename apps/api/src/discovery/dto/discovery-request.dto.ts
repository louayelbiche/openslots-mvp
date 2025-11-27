import { ServiceCategory } from "@prisma/client";

export type TimeWindow = "Morning" | "Afternoon" | "Evening" | "Custom";

export class DiscoveryRequestDto {
  serviceCategory: ServiceCategory;
  city: string;
  zipCode?: string;
  timeWindow: TimeWindow;
}
