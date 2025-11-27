'use client';

import type { Slot, MatchLikelihood } from '../types/discovery';
import { MatchBadge } from './MatchBadge';

interface SlotItemProps {
  slot: Slot;
  matchLikelihood: MatchLikelihood;
  isBestOffer: boolean;
  onBid?: (slotId: string) => void;
}

// Format time for display
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function SlotItem({ slot, matchLikelihood, isBestOffer, onBid }: SlotItemProps) {
  const startTime = formatTime(slot.startTime);
  const endTime = formatTime(slot.endTime);

  return (
    <div
      className={`
        flex items-center justify-between p-3 rounded-lg border
        ${isBestOffer ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'}
      `}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-900">
            {startTime} - {endTime}
          </span>
          {isBestOffer && (
            <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full font-medium">
              Best
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          {slot.durationMin} min | {slot.serviceName}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-lg font-bold text-slate-900">
            ${slot.maxDiscountedPrice}
          </p>
          <MatchBadge likelihood={matchLikelihood} size="sm" />
        </div>

        {onBid && (
          <button
            type="button"
            onClick={() => onBid(slot.slotId)}
            className="
              px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg
              hover:bg-slate-800 transition-colors
              min-w-[60px]
            "
            aria-label={`Bid on slot from ${startTime} to ${endTime}`}
          >
            Bid
          </button>
        )}
      </div>
    </div>
  );
}
