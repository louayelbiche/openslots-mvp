export class ServiceTypeDto {
  name: string;
  durationMin: number;
  slotCount: number; // Number of available slots for this service type
}

export class ServiceTypesResponseDto {
  serviceTypes: ServiceTypeDto[];
}
