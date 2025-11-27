'use client';

import type { Provider, Slot, MatchLikelihood } from '../types/discovery';
import { MatchBadge, calculateMatchLikelihood } from './MatchBadge';
import { SlotItem } from './SlotItem';

interface ProviderCardProps {
  provider: Provider;
  userBid: number;
  isBestOfferProvider: boolean;
  bestOfferSlotId: string | null;
  onBid?: (slotId: string, providerId: string) => void;
}

// Get overall match likelihood for provider (best match among slots)
function getProviderMatchLikelihood(slots: Slot[], userBid: number): MatchLikelihood {
  if (slots.length === 0) return 'Very Low';

  const likelihoods = slots.map((slot) =>
    calculateMatchLikelihood(userBid, slot.maxDiscountedPrice)
  );

  // Return the best match
  if (likelihoods.includes('Very High')) return 'Very High';
  if (likelihoods.includes('High')) return 'High';
  if (likelihoods.includes('Low')) return 'Low';
  return 'Very Low';
}

export function ProviderCard({
  provider,
  userBid,
  isBestOfferProvider,
  bestOfferSlotId,
  onBid,
}: ProviderCardProps) {
  const overallMatch = getProviderMatchLikelihood(provider.slots, userBid);

  const handleBid = (slotId: string) => {
    if (onBid) {
      onBid(slotId, provider.providerId);
    }
  };

  return (
    <article
      className={`
        bg-white rounded-xl border-2 overflow-hidden
        ${isBestOfferProvider ? 'border-amber-400 shadow-lg' : 'border-slate-200'}
      `}
    >
      {/* Best Offer Badge */}
      {isBestOfferProvider && (
        <div className="bg-amber-500 text-white text-center py-2 text-sm font-semibold">
          BEST OFFER
        </div>
      )}

      {/* Provider Header */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-slate-900">
                {provider.name}
              </h3>
              <div className="flex items-center text-sm text-slate-600">
                <svg
                  className="w-4 h-4 text-amber-500 mr-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span>{provider.rating.toFixed(2)}</span>
              </div>
            </div>
            <p className="text-sm text-slate-500">
              {provider.distance} miles
            </p>
          </div>

          <div className="text-right">
            <MatchBadge likelihood={overallMatch} />
            <p className="text-sm text-slate-500 mt-1">
              From <span className="font-semibold text-slate-900">${provider.lowestPrice}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Slots List */}
      <div className="p-4">
        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3">
          Available Slots
        </h4>
        <div className="space-y-2">
          {provider.slots.map((slot) => (
            <SlotItem
              key={slot.slotId}
              slot={slot}
              matchLikelihood={calculateMatchLikelihood(userBid, slot.maxDiscountedPrice)}
              isBestOffer={slot.slotId === bestOfferSlotId}
              onBid={handleBid}
            />
          ))}
        </div>
      </div>
    </article>
  );
}
