import { ServiceCategory } from "@prisma/client";
import { TimeWindow } from "./discovery-request.dto";

export class ServiceTypesRequestDto {
  serviceCategory: ServiceCategory;
  city: string;
  timeWindow?: TimeWindow;
}
