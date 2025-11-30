'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ServiceCategory, TimeWindow, MatchLikelihood, DiscoveryResponse } from '../../types/discovery';

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

// Match likelihood colors (from design spec)
const MATCH_COLORS: Record<MatchLikelihood, { bg: string; text: string; border: string }> = {
  'Very High': { bg: 'bg-emerald-700', text: 'text-white', border: 'border-emerald-700' },
  'High': { bg: 'bg-emerald-500', text: 'text-white', border: 'border-emerald-500' },
  'Low': { bg: 'bg-amber-500', text: 'text-white', border: 'border-amber-500' },
  'Very Low': { bg: 'bg-red-500', text: 'text-white', border: 'border-red-500' },
};

// Budget range constants
const MIN_BUDGET = 30;
const MAX_BUDGET = 200;
const DEFAULT_BUDGET = 75;

function getMatchLikelihood(budget: number): MatchLikelihood {
  // For MVP, use simple thresholds based on typical service prices
  // This provides visual feedback before actual API data
  // Real match calculation happens on Live Offers with actual slot prices
  if (budget >= 100) return 'Very High';
  if (budget >= 70) return 'High';
  if (budget >= 50) return 'Low';
  return 'Very Low';
}

function BudgetSelectorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract params from URL
  const service = searchParams.get('service') as ServiceCategory | null;
  const city = searchParams.get('city');
  const zipCode = searchParams.get('zipCode');
  const timeWindow = searchParams.get('timeWindow') as TimeWindow | null;

  const [budget, setBudget] = useState(DEFAULT_BUDGET);
  const [inputValue, setInputValue] = useState(DEFAULT_BUDGET.toString());
  const [inputError, setInputError] = useState('');
  const [recommendedPrice, setRecommendedPrice] = useState<number | null>(null);
  const [loadingRecommended, setLoadingRecommended] = useState(true);

  // Redirect if missing required params
  useEffect(() => {
    if (!service || !city || !timeWindow) {
      router.push('/');
    }
  }, [service, city, timeWindow, router]);

  // Fetch recommended price from discovery API (all slots for service+city, no time filter)
  const fetchRecommendedPrice = useCallback(async () => {
    if (!service || !city) return;

    setLoadingRecommended(true);
    try {
      // Fetch ALL slots for this service+city (no timeWindow filter)
      // to calculate average price across all time slots
      const response = await fetch(`${API_BASE_URL}/api/discovery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceCategory: service,
          city,
          zipCode: zipCode || undefined,
          // No timeWindow - returns all slots for accurate recommended price
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as DiscoveryResponse;
        // Calculate average price across all slots from all providers
        const allPrices: number[] = [];
        for (const provider of data.providers || []) {
          for (const slot of provider.slots) {
            allPrices.push(slot.maxDiscountedPrice);
          }
        }

        if (allPrices.length > 0) {
          const avgCents = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;
          // Convert to dollars and round to nearest $5
          const avgDollars = Math.round(avgCents / 100 / 5) * 5;
          setRecommendedPrice(avgDollars);

          // Set as initial budget if within range
          if (avgDollars >= MIN_BUDGET && avgDollars <= MAX_BUDGET) {
            setBudget(avgDollars);
            setInputValue(avgDollars.toString());
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch recommended price:', err);
    } finally {
      setLoadingRecommended(false);
    }
  }, [service, city, zipCode]);

  useEffect(() => {
    fetchRecommendedPrice();
  }, [fetchRecommendedPrice]);

  // Calculate match likelihood based on budget
  const matchLikelihood = getMatchLikelihood(budget);
  const matchColors = MATCH_COLORS[matchLikelihood];

  // Handle slider change
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setBudget(value);
    setInputValue(value.toString());
    setInputError('');
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setInputValue(raw);

    const value = parseInt(raw, 10);
    if (!isNaN(value)) {
      if (value >= MIN_BUDGET && value <= MAX_BUDGET) {
        setBudget(value);
        setInputError('');
      } else if (value < MIN_BUDGET) {
        setInputError(`Minimum is $${MIN_BUDGET}`);
      } else if (value > MAX_BUDGET) {
        setInputError(`Maximum is $${MAX_BUDGET}`);
      }
    }
  };

  // Handle input blur - clamp value
  const handleInputBlur = () => {
    const value = parseInt(inputValue, 10);
    if (isNaN(value) || value < MIN_BUDGET) {
      setBudget(MIN_BUDGET);
      setInputValue(MIN_BUDGET.toString());
      setInputError('');
    } else if (value > MAX_BUDGET) {
      setBudget(MAX_BUDGET);
      setInputValue(MAX_BUDGET.toString());
      setInputError('');
    } else {
      setBudget(value);
      setInputValue(value.toString());
      setInputError('');
    }
  };

  // Handle continue
  const handleContinue = () => {
    const params = new URLSearchParams({
      service: service!,
      city: city!,
      timeWindow: timeWindow!,
      budget: budget.toString(),
    });

    if (zipCode) {
      params.set('zipCode', zipCode);
    }

    router.push(`/offers?${params.toString()}`);
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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Set Your Offer
          </h1>
          <p className="text-slate-600 text-sm">
            Adjust your price to improve your match
          </p>
        </div>

        {/* Context summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
              {SERVICE_LABELS[service]}
            </span>
            <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
              {city}
              {zipCode && `, ${zipCode}`}
            </span>
            <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
              {timeWindow} ({TIME_WINDOW_LABELS[timeWindow]})
            </span>
          </div>
        </div>

        {/* Price Display Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          {loadingRecommended ? (
            // Loading state while fetching recommended price
            <div className="animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-32 mb-3"></div>
              <div className="h-12 bg-slate-200 rounded w-24 mb-3"></div>
              <div className="h-4 bg-slate-200 rounded w-40"></div>
            </div>
          ) : budget === recommendedPrice && recommendedPrice !== null ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <svg
                  className="w-5 h-5 text-slate-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span className="text-sm font-medium text-slate-700">Recommended Price</span>
              </div>
              <div className="text-5xl font-bold text-slate-900 mb-2">
                ${recommendedPrice}
              </div>
              <div className="flex items-center gap-1 text-sm text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
                <span>High match likelihood</span>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-500 mb-2">Your Offer</p>
              <div className="text-5xl font-bold text-slate-900 mb-4">
                ${budget}
              </div>
              {/* Match Likelihood Badge */}
              <div
                className={`
                  inline-flex items-center px-4 py-2 rounded-full text-sm font-medium
                  ${matchColors.bg} ${matchColors.text}
                `}
                role="status"
                aria-live="polite"
              >
                {matchLikelihood} Match
              </div>
            </>
          )}
        </div>

        {/* Budget Slider */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-slate-500 mb-2">
            <span>${MIN_BUDGET}</span>
            <span>${MAX_BUDGET}</span>
          </div>

          <input
            type="range"
            min={MIN_BUDGET}
            max={MAX_BUDGET}
            step={1}
            value={budget}
            onChange={handleSliderChange}
            className="
              w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-6
              [&::-webkit-slider-thumb]:h-6
              [&::-webkit-slider-thumb]:bg-slate-900
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:shadow-lg
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-moz-range-thumb]:w-6
              [&::-moz-range-thumb]:h-6
              [&::-moz-range-thumb]:bg-slate-900
              [&::-moz-range-thumb]:border-0
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:shadow-lg
              [&::-moz-range-thumb]:cursor-pointer
            "
            aria-label="Budget slider"
            aria-valuemin={MIN_BUDGET}
            aria-valuemax={MAX_BUDGET}
            aria-valuenow={budget}
          />
        </div>

        {/* Numeric Input */}
        <div className="mb-6">
          <label htmlFor="budget-input" className="block text-sm font-medium text-slate-700 mb-2">
            Or enter amount directly
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
              $
            </span>
            <input
              id="budget-input"
              type="text"
              inputMode="numeric"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              className={`
                w-full pl-8 pr-4 py-3 rounded-xl border-2 text-lg font-medium
                focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent
                ${inputError ? 'border-orange-400' : 'border-slate-200'}
              `}
              aria-describedby={inputError ? 'budget-error' : undefined}
            />
          </div>
          {inputError && (
            <p id="budget-error" className="mt-1 text-xs text-orange-600">
              {inputError}
            </p>
          )}
        </div>

        {/* Helper text */}
        <p className="text-xs text-slate-500 text-center mb-8">
          Higher offers increase your chances of matching with providers.
        </p>

        {/* Continue Button */}
        <button
          type="button"
          onClick={handleContinue}
          className="
            w-full py-4 rounded-xl font-semibold text-base
            bg-slate-900 text-white hover:bg-slate-800
            shadow-lg transition-all
          "
        >
          See Live Offers
        </button>
      </div>
    </main>
  );
}

// Loading fallback
function BudgetSelectorLoading() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-48 mb-4"></div>
          <div className="h-4 bg-slate-200 rounded w-64 mb-8"></div>
          <div className="h-40 bg-slate-200 rounded-xl mb-6"></div>
          <div className="h-2 bg-slate-200 rounded mb-6"></div>
          <div className="h-14 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    </main>
  );
}

export default function BudgetSelectorPage() {
  return (
    <Suspense fallback={<BudgetSelectorLoading />}>
      <BudgetSelectorContent />
    </Suspense>
  );
}
