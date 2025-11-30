/**
 * React Query hooks for data fetching with automatic deduplication and caching
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import {
  fetchServiceTypes,
  fetchDiscovery,
  queryKeys,
  type ServiceTypesRequest,
  type DiscoveryRequest,
} from './api';

/**
 * Hook for fetching service types with caching and deduplication
 * - Automatically deduplicates concurrent requests
 * - Caches results for 60 seconds
 * - Background refetch when stale
 */
export function useServiceTypes(request: ServiceTypesRequest | null) {
  return useQuery({
    queryKey: request ? queryKeys.serviceTypes(request) : ['serviceTypes', 'disabled'],
    queryFn: () => {
      if (!request) throw new Error('Request is required');
      return fetchServiceTypes(request);
    },
    enabled: !!request && !!request.city && !!request.serviceCategory,
    staleTime: 60000, // Data is fresh for 60 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    retry: 2, // Retry failed requests twice
  });
}

/**
 * Hook for fetching discovery results with caching and deduplication
 * - Automatically deduplicates concurrent requests
 * - Caches results for 30 seconds
 * - Background refetch when stale
 */
export function useDiscovery(request: DiscoveryRequest | null) {
  return useQuery({
    queryKey: request ? queryKeys.discovery(request) : ['discovery', 'disabled'],
    queryFn: () => {
      if (!request) throw new Error('Request is required');
      return fetchDiscovery(request);
    },
    enabled: !!request && !!request.city && !!request.serviceCategory,
    staleTime: 30000, // Data is fresh for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  });
}
