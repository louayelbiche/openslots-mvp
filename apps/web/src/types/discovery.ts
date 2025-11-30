// Service categories matching the API
export type ServiceCategory =
  | 'MASSAGE'
  | 'ACUPUNCTURE'
  | 'NAILS'
  | 'HAIR'
  | 'FACIALS_AND_SKIN'
  | 'LASHES_AND_BROWS';

// Time window options
export type TimeWindow = 'Morning' | 'Afternoon' | 'Evening' | 'Custom';

// Match likelihood levels
export type MatchLikelihood = 'Very High' | 'High' | 'Low' | 'Very Low';

// Discovery request payload
export interface DiscoveryRequest {
  serviceCategory: ServiceCategory;
  city: string;
  zipCode?: string;
  timeWindow: TimeWindow;
}

// Slot from API response
export interface Slot {
  slotId: string;
  startTime: string;
  endTime: string;
  basePrice: number;
  maxDiscount: number;
  maxDiscountedPrice: number;
  serviceName: string;
  durationMin: number;
}

// Provider from API response
export interface Provider {
  providerId: string;
  name: string;
  rating: number;
  distance: number;
  address: string;
  city: string;
  slots: Slot[];
  lowestPrice: number;
  bookingUrl?: string; // Provider's external booking website
}

// Discovery API response
export interface DiscoveryResponse {
  providers: Provider[];
}

// Service category display info
export interface ServiceCategoryInfo {
  value: ServiceCategory;
  label: string;
  icon: string;
}

// Time window display info
export interface TimeWindowInfo {
  value: TimeWindow;
  label: string;
  description: string;
}

// Search params for navigation
export interface DiscoverySearchParams {
  service: ServiceCategory;
  city: string;
  zipCode?: string;
  timeWindow: TimeWindow;
}

// Budget params for navigation
export interface BudgetSearchParams extends DiscoverySearchParams {
  budget: string;
}
