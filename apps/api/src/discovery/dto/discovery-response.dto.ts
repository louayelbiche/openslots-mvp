export class SlotDto {
  slotId: string;
  startTime: string;
  endTime: string;
  basePrice: number;
  maxDiscount: number;
  maxDiscountedPrice: number;
  serviceName: string;
  durationMin: number;
}

export class ProviderDto {
  providerId: string;
  name: string;
  rating: number;
  distance: number;
  address: string;
  city: string;
  slots: SlotDto[];
  lowestPrice: number;
  bookingUrl?: string; // Provider's external booking website
}

export class DiscoveryResponseDto {
  providers: ProviderDto[];
}
