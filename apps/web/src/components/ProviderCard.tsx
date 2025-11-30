'use client';

import { useState, useEffect } from 'react';
import type { Provider, Slot } from '../types/discovery';
import { SlotDropdown } from './SlotDropdown';

interface ProviderCardProps {
  provider: Provider;
  userBid: number;
  isBestOfferProvider: boolean;
  isHighestRated?: boolean;
  isClosest?: boolean;
  bestOfferSlotId: string | null;
  onBid?: (slotId: string, providerId: string) => void;
}

// Find the best offer slot among provider's slots
function findBestOfferInSlots(slots: Slot[], userBid: number): string | null {
  if (slots.length === 0) return null;

  let bestSlot = slots[0];
  let bestDiff = Math.abs(slots[0].maxDiscountedPrice - userBid);

  for (const slot of slots) {
    const diff = Math.abs(slot.maxDiscountedPrice - userBid);
    if (diff < bestDiff || (diff === bestDiff && slot.maxDiscountedPrice < bestSlot.maxDiscountedPrice)) {
      bestSlot = slot;
      bestDiff = diff;
    }
  }

  return bestSlot.slotId;
}

export function ProviderCard({
  provider,
  userBid,
  isBestOfferProvider,
  isHighestRated = false,
  isClosest = false,
  bestOfferSlotId,
  onBid,
}: ProviderCardProps) {
  const slots = provider.slots;

  // Find the best offer among provider's slots
  const localBestOfferSlotId = findBestOfferInSlots(slots, userBid);

  // Use the global best offer slot if it's in this provider, otherwise use local best
  const effectiveBestOfferSlotId = slots.some(s => s.slotId === bestOfferSlotId)
    ? bestOfferSlotId
    : localBestOfferSlotId;

  // Pre-select the best offer slot
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(effectiveBestOfferSlotId);

  // Update selection if best offer changes
  useEffect(() => {
    if (effectiveBestOfferSlotId && !selectedSlotId) {
      setSelectedSlotId(effectiveBestOfferSlotId);
    }
  }, [effectiveBestOfferSlotId, selectedSlotId]);

  const handleBid = (slotId: string) => {
    if (onBid) {
      onBid(slotId, provider.providerId);
    }
  };

  // Calculate lowest price from slots
  const lowestPrice = Math.min(...slots.map(s => s.maxDiscountedPrice));

  // Collect all badges this provider has
  const badges: Array<{ label: string; color: string }> = [];
  if (isBestOfferProvider) badges.push({ label: 'Best Offer', color: 'bg-amber-500' });
  if (isHighestRated) badges.push({ label: 'Highest Rated', color: 'bg-blue-500' });
  if (isClosest) badges.push({ label: 'Closest', color: 'bg-emerald-500' });

  const hasBadges = badges.length > 0;

  return (
    <article
      className={`
        bg-white rounded-xl border-2 overflow-hidden
        ${isBestOfferProvider ? 'border-amber-400 shadow-lg' : 'border-slate-200'}
      `}
    >
      {/* Provider Badges */}
      {hasBadges && (
        <div className="flex">
          {badges.map((badge) => (
            <div
              key={badge.label}
              className={`${badge.color} text-white text-center py-2 text-sm font-semibold flex-1`}
            >
              {badge.label.toUpperCase()}
            </div>
          ))}
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
            <p className="text-sm text-slate-500">
              From <span className="font-semibold text-slate-900">${(lowestPrice / 100).toFixed(lowestPrice % 100 === 0 ? 0 : 2)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Slot Dropdown */}
      <div className="p-4">
        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3">
          Select Time Slot
        </h4>
        <SlotDropdown
          slots={slots}
          bestOfferSlotId={effectiveBestOfferSlotId}
          selectedSlotId={selectedSlotId}
          isBestOfferProvider={isBestOfferProvider}
          bookingUrl={provider.bookingUrl}
          providerName={provider.name}
          onSelect={setSelectedSlotId}
          onBid={handleBid}
        />
      </div>
    </article>
  );
}
