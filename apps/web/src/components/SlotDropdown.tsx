'use client';

import { useState } from 'react';
import type { Slot, MatchLikelihood } from '../types/discovery';

interface SlotDropdownProps {
  slots: Slot[];
  bestOfferSlotId: string | null;
  selectedSlotId: string | null;
  isBestOfferProvider: boolean;
  onSelect: (slotId: string) => void;
  onBid: (slotId: string) => void;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export function SlotDropdown({
  slots,
  bestOfferSlotId,
  selectedSlotId,
  isBestOfferProvider,
  onSelect,
  onBid,
}: SlotDropdownProps) {
  const selectedSlot = slots.find((s) => s.slotId === selectedSlotId) || slots[0];

  if (slots.length === 0) {
    return (
      <div className="text-sm text-slate-500 italic">
        No slots available in this time window
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Dropdown */}
      <div className="relative">
        <select
          value={selectedSlotId || ''}
          onChange={(e) => onSelect(e.target.value)}
          className="
            w-full appearance-none bg-white border-2 border-slate-200 rounded-lg
            px-4 py-3 pr-10 text-sm font-medium text-slate-900
            focus:outline-none focus:border-slate-400
            cursor-pointer
          "
          aria-label="Select time slot"
        >
          {slots.map((slot) => {
            const isBest = isBestOfferProvider && slot.slotId === bestOfferSlotId;
            const slotDate = formatDate(slot.startTime);
            const startTime = formatTime(slot.startTime);
            const endTime = formatTime(slot.endTime);
            const price = formatPrice(slot.maxDiscountedPrice);

            return (
              <option key={slot.slotId} value={slot.slotId}>
                {slotDate} • {startTime} - {endTime} • {price}{isBest ? ' • Best Offer' : ''}
              </option>
            );
          })}
        </select>

        {/* Dropdown arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg
            className="w-5 h-5 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {/* Selected slot details + Bid button */}
      {selectedSlot && (
        <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3 border border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-900">
                {selectedSlot.serviceName}
              </span>
              {isBestOfferProvider && selectedSlot.slotId === bestOfferSlotId && (
                <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full font-medium">
                  Best Offer
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedSlot.durationMin} min
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-slate-900">
              {formatPrice(selectedSlot.maxDiscountedPrice)}
            </span>
            <button
              type="button"
              onClick={() => onBid(selectedSlot.slotId)}
              className="
                px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg
                hover:bg-slate-800 transition-colors
              "
              aria-label={`Bid on ${selectedSlot.serviceName} slot`}
            >
              Bid
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
