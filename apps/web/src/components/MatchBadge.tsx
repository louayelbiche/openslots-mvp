'use client';

import type { MatchLikelihood } from '../types/discovery';

interface MatchBadgeProps {
  likelihood: MatchLikelihood;
  size?: 'sm' | 'md';
}

// Match likelihood colors (from design spec)
const MATCH_COLORS: Record<MatchLikelihood, { bg: string; text: string }> = {
  'Very High': { bg: 'bg-emerald-700', text: 'text-white' },
  'High': { bg: 'bg-emerald-500', text: 'text-white' },
  'Low': { bg: 'bg-amber-500', text: 'text-white' },
  'Very Low': { bg: 'bg-red-500', text: 'text-white' },
};

export function MatchBadge({ likelihood, size = 'md' }: MatchBadgeProps) {
  const colors = MATCH_COLORS[likelihood];
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium
        ${colors.bg} ${colors.text} ${sizeClasses}
      `}
      role="status"
    >
      {likelihood}
    </span>
  );
}

// Helper function to calculate match likelihood from bid and slot price
export function calculateMatchLikelihood(
  userBid: number,
  maxDiscountedPrice: number
): MatchLikelihood {
  if (userBid >= maxDiscountedPrice) {
    return 'Very High';
  } else if (userBid >= maxDiscountedPrice * 0.95) {
    return 'High';
  } else if (userBid >= maxDiscountedPrice * 0.85) {
    return 'Low';
  } else {
    return 'Very Low';
  }
}
