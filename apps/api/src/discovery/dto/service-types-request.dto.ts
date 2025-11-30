import { ServiceCategory } from "@prisma/client";

export class ServiceTypesRequestDto {
  serviceCategory: ServiceCategory;
  city: string;
}
