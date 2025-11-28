'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type {
  ServiceCategory,
  TimeWindow,
  Provider,
  Slot,
  DiscoveryResponse,
} from '../../types/discovery';
import { ProviderCard } from '../../components/ProviderCard';
import { calculateMatchLikelihood } from '../../components/MatchBadge';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

// Service labels for display
const SERVICE_LABELS: Record<ServiceCategory, string> = {
  MASSAGE: 'Massage',
  ACUPUNCTURE: 'Acupuncture',
  NAILS: 'Nails',
  HAIR: 'Hair',
  FACIALS_AND_SKIN: 'Facials & Skin',
  LASHES_AND_BROWS: 'Lashes & Brows',
};

// Time window labels for display
const TIME_WINDOW_LABELS: Record<TimeWindow, string> = {
  Morning: '9 AM - 12 PM',
  Afternoon: '12 PM - 4 PM',
  Evening: '4 PM - 8 PM',
  Custom: 'Any Time',
};

// Time window hour ranges
const TIME_WINDOW_RANGES: Record<TimeWindow, { start: number; end: number }> = {
  Morning: { start: 9, end: 12 },
  Afternoon: { start: 12, end: 16 },
  Evening: { start: 16, end: 20 },
  Custom: { start: 0, end: 24 },
};

// Filter slots by time window
function filterSlotsByTimeWindow(slots: Slot[], timeWindow: TimeWindow): Slot[] {
  const range = TIME_WINDOW_RANGES[timeWindow];
  return slots.filter((slot) => {
    const slotHour = new Date(slot.startTime).getHours();
    return slotHour >= range.start && slotHour < range.end;
  });
}

// Find the Best Offer slot (closest price to user bid) - only within time window
function findBestOffer(
  providers: Provider[],
  userBid: number,
  timeWindow: TimeWindow
): { providerId: string; slotId: string } | null {
  let bestSlot: { providerId: string; slotId: string; diff: number; price: number } | null = null;

  for (const provider of providers) {
    const filteredSlots = filterSlotsByTimeWindow(provider.slots, timeWindow);
    for (const slot of filteredSlots) {
      const diff = Math.abs(slot.maxDiscountedPrice - userBid);

      if (
        bestSlot === null ||
        diff < bestSlot.diff ||
        (diff === bestSlot.diff && slot.maxDiscountedPrice < bestSlot.price)
      ) {
        bestSlot = { providerId: provider.providerId, slotId: slot.slotId, diff, price: slot.maxDiscountedPrice };
      }
    }
  }

  return bestSlot ? { providerId: bestSlot.providerId, slotId: bestSlot.slotId } : null;
}

// Sort providers with Best Offer first, then by match score and other criteria
function sortProviders(providers: Provider[], userBid: number, bestOfferProviderId: string | null): Provider[] {
  return [...providers].sort((a, b) => {
    // Best offer provider always first
    if (a.providerId === bestOfferProviderId) return -1;
    if (b.providerId === bestOfferProviderId) return 1;

    // Then by best match likelihood
    const aMatch = getBestMatchScore(a, userBid);
    const bMatch = getBestMatchScore(b, userBid);
    if (aMatch !== bMatch) return bMatch - aMatch;

    // Then by lowest price
    if (a.lowestPrice !== b.lowestPrice) return a.lowestPrice - b.lowestPrice;

    // Then by rating
    if (a.rating !== b.rating) return b.rating - a.rating;

    // Finally by distance
    return a.distance - b.distance;
  });
}

// Get best match score for a provider (0-3, higher is better)
function getBestMatchScore(provider: Provider, userBid: number): number {
  let bestScore = 0;
  for (const slot of provider.slots) {
    const likelihood = calculateMatchLikelihood(userBid, slot.maxDiscountedPrice);
    const score =
      likelihood === 'Very High' ? 3 :
      likelihood === 'High' ? 2 :
      likelihood === 'Low' ? 1 : 0;
    if (score > bestScore) bestScore = score;
  }
  return bestScore;
}

function LiveOffersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract params from URL
  const service = searchParams.get('service') as ServiceCategory | null;
  const city = searchParams.get('city');
  const zipCode = searchParams.get('zipCode');
  const timeWindow = searchParams.get('timeWindow') as TimeWindow | null;
  const budgetParam = searchParams.get('budget');
  const userBid = budgetParam ? parseInt(budgetParam, 10) : 75;

  // State
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if missing required params
  useEffect(() => {
    if (!service || !city || !timeWindow) {
      router.push('/');
    }
  }, [service, city, timeWindow, router]);

  // Fetch providers from API
  const fetchProviders = useCallback(async () => {
    if (!service || !city || !timeWindow) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/discovery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceCategory: service,
          city,
          zipCode: zipCode || undefined,
          timeWindow,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = (await response.json()) as DiscoveryResponse;
      setProviders(data.providers || []);
    } catch (err) {
      console.error('Discovery fetch error:', err);
      setError('Failed to load offers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [service, city, zipCode, timeWindow]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  // Calculate best offer (only within time window)
  const bestOffer = timeWindow ? findBestOffer(providers, userBid, timeWindow) : null;

  // Sort providers
  const sortedProviders = sortProviders(providers, userBid, bestOffer?.providerId || null);

  // Handle bid action (placeholder for MVP)
  const handleBid = (slotId: string, providerId: string) => {
    // In MVP, just show an alert
    // In full implementation, this would initiate negotiation
    alert(`Bid initiated for slot ${slotId} with provider ${providerId}. Negotiation feature coming soon!`);
  };

  // Show nothing while redirecting if params are missing
  if (!service || !city || !timeWindow) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Back button */}
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center text-slate-600 hover:text-slate-900 mb-6 text-sm"
          aria-label="Go back"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Available Slots
          </h1>
          <p className="text-slate-600 text-sm">
            {city} | {timeWindow} ({TIME_WINDOW_LABELS[timeWindow]})
          </p>
        </div>

        {/* Context bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm">
                {SERVICE_LABELS[service]}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Your bid:</span>
              <span className="bg-slate-900 text-white px-3 py-1 rounded-full text-sm font-semibold">
                ${userBid}
              </span>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-32 mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-24 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-16 bg-slate-100 rounded"></div>
                  <div className="h-16 bg-slate-100 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-white rounded-xl border border-red-200 p-8 text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-slate-700 font-medium mb-2">{error}</p>
            <button
              type="button"
              onClick={fetchProviders}
              className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && sortedProviders.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <div className="text-slate-400 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-slate-700 font-medium mb-2">No available slots found</p>
            <p className="text-slate-500 text-sm mb-4">
              Try adjusting your time window or try a different service.
            </p>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
            >
              Change Search
            </button>
          </div>
        )}

        {/* Provider Cards */}
        {!loading && !error && sortedProviders.length > 0 && (
          <div className="space-y-4">
            {/* Results count */}
            <p className="text-sm text-slate-500">
              {sortedProviders.length} provider{sortedProviders.length !== 1 ? 's' : ''} found
            </p>

            {sortedProviders.map((provider) => (
              <ProviderCard
                key={provider.providerId}
                provider={provider}
                userBid={userBid}
                isBestOfferProvider={provider.providerId === bestOffer?.providerId}
                bestOfferSlotId={
                  provider.providerId === bestOffer?.providerId ? bestOffer.slotId : null
                }
                timeWindow={timeWindow}
                onBid={handleBid}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

// Loading fallback
function LiveOffersLoading() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-48 mb-4"></div>
          <div className="h-4 bg-slate-200 rounded w-64 mb-8"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-slate-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LiveOffersPage() {
  return (
    <Suspense fallback={<LiveOffersLoading />}>
      <LiveOffersContent />
    </Suspense>
  );
}
