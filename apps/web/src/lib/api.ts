/**
 * API client with optimized fetching
 */

import type {
  ServiceCategory,
  TimeWindow,
  DiscoveryResponse,
} from '../types/discovery';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

// Types for API requests
export interface ServiceTypesRequest {
  serviceCategory: ServiceCategory;
  city: string;
  timeWindow?: TimeWindow;
}

export interface ServiceTypesResponse {
  serviceTypes: Array<{
    name: string;
    durationMin: number;
    slotCount: number;
  }>;
}

export interface DiscoveryRequest {
  serviceCategory: ServiceCategory;
  city: string;
  zipCode?: string;
  timeWindow?: TimeWindow;
  serviceType?: string;
}

// Fetch functions for React Query
export async function fetchServiceTypes(request: ServiceTypesRequest): Promise<ServiceTypesResponse> {
  const response = await fetch(`${API_BASE_URL}/api/service-types`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export async function fetchDiscovery(request: DiscoveryRequest): Promise<DiscoveryResponse> {
  const response = await fetch(`${API_BASE_URL}/api/discovery`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

// Query key factories for consistent cache keys
export const queryKeys = {
  serviceTypes: (request: ServiceTypesRequest) =>
    ['serviceTypes', request.city, request.serviceCategory, request.timeWindow] as const,
  discovery: (request: DiscoveryRequest) =>
    ['discovery', request.city, request.serviceCategory, request.timeWindow, request.serviceType] as const,
};
