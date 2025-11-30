'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ServiceCategory, TimeWindow, DiscoveryResponse } from '../../types/discovery';

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

function BudgetSelectorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract params from URL
  const service = searchParams.get('service') as ServiceCategory | null;
  const city = searchParams.get('city');
  const zipCode = searchParams.get('zipCode');
  const timeWindow = searchParams.get('timeWindow') as TimeWindow | null;
  const serviceType = searchParams.get('serviceType');

  const [budget, setBudget] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');
  const [recommendedPrice, setRecommendedPrice] = useState<number | null>(null);
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [loadingRecommended, setLoadingRecommended] = useState(true);

  // Redirect if missing required params
  useEffect(() => {
    if (!service || !city || !timeWindow || !serviceType) {
      router.push('/');
    }
  }, [service, city, timeWindow, serviceType, router]);

  // Fetch recommended price from discovery API (all slots for serviceType+city, no time filter)
  const fetchRecommendedPrice = useCallback(async () => {
    if (!service || !city || !serviceType) return;

    setLoadingRecommended(true);
    try {
      // Fetch ALL slots for this serviceType+city (no timeWindow filter)
      // to calculate average price across all time slots
      const response = await fetch(`${API_BASE_URL}/api/discovery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceCategory: service,
          city,
          zipCode: zipCode || undefined,
          serviceType, // Filter by specific service type
          // No timeWindow - returns all slots for accurate recommended price
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as DiscoveryResponse;
        // Calculate min, max, and average price across all slots from all providers
        const allPrices: number[] = [];
        for (const provider of data.providers || []) {
          for (const slot of provider.slots) {
            allPrices.push(slot.maxDiscountedPrice);
          }
        }

        if (allPrices.length > 0) {
          // Convert cents to dollars
          const pricesInDollars = allPrices.map(p => p / 100);

          // Calculate min (floor to nearest $5), max (ceil to nearest $5), avg (round to nearest $5)
          const minDollars = Math.floor(Math.min(...pricesInDollars) / 5) * 5;
          const maxDollars = Math.ceil(Math.max(...pricesInDollars) / 5) * 5;
          const avgDollars = Math.round((pricesInDollars.reduce((a, b) => a + b, 0) / pricesInDollars.length) / 5) * 5;

          // Ensure min is at least $5 and max is at least min + $5
          const finalMin = Math.max(5, minDollars);
          const finalMax = Math.max(finalMin + 5, maxDollars);

          setMinPrice(finalMin);
          setMaxPrice(finalMax);
          setRecommendedPrice(avgDollars);

          // Set initial budget to recommended price
          setBudget(avgDollars);
          setInputValue(avgDollars.toString());
        }
      }
    } catch (err) {
      console.error('Failed to fetch recommended price:', err);
    } finally {
      setLoadingRecommended(false);
    }
  }, [service, city, zipCode, serviceType]);

  useEffect(() => {
    fetchRecommendedPrice();
  }, [fetchRecommendedPrice]);

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

    if (minPrice === null || maxPrice === null) return;

    const value = parseInt(raw, 10);
    if (!isNaN(value)) {
      if (value >= minPrice && value <= maxPrice) {
        setBudget(value);
        setInputError('');
      } else if (value < minPrice) {
        setInputError(`Minimum is $${minPrice}`);
      } else if (value > maxPrice) {
        setInputError(`Maximum is $${maxPrice}`);
      }
    }
  };

  // Handle input blur - clamp value
  const handleInputBlur = () => {
    if (minPrice === null || maxPrice === null) return;

    const value = parseInt(inputValue, 10);
    if (isNaN(value) || value < minPrice) {
      setBudget(minPrice);
      setInputValue(minPrice.toString());
      setInputError('');
    } else if (value > maxPrice) {
      setBudget(maxPrice);
      setInputValue(maxPrice.toString());
      setInputError('');
    } else {
      setBudget(value);
      setInputValue(value.toString());
      setInputError('');
    }
  };

  // Handle continue
  const handleContinue = () => {
    if (budget === null) return;

    const params = new URLSearchParams({
      service: service!,
      city: city!,
      timeWindow: timeWindow!,
      budget: budget.toString(),
      serviceType: serviceType!,
    });

    if (zipCode) {
      params.set('zipCode', zipCode);
    }

    router.push(`/offers?${params.toString()}`);
  };

  // Show nothing while redirecting if params are missing
  if (!service || !city || !timeWindow || !serviceType) {
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
              {serviceType}
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
        {loadingRecommended || budget === null ? (
          // Loading state while fetching recommended price
          <div className="bg-emerald-50 rounded-2xl border-2 border-emerald-200 p-6 mb-4 min-h-[156px]">
            <div className="animate-pulse">
              <div className="h-4 bg-emerald-200 rounded w-32 mb-3"></div>
              <div className="h-12 bg-emerald-200 rounded w-24 mb-3"></div>
              <div className="h-4 bg-emerald-200 rounded w-40"></div>
            </div>
          </div>
        ) : budget === recommendedPrice && recommendedPrice !== null ? (
          // Recommended Price - green outlined card
          <div className="bg-emerald-50 rounded-2xl border-2 border-emerald-500 p-6 mb-4 min-h-[156px]">
            <div className="flex items-center gap-2 mb-2">
              <svg
                className="w-5 h-5 text-emerald-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <span className="text-sm font-medium text-emerald-700">Recommended Price</span>
            </div>
            <div className="text-5xl font-bold text-slate-900 mb-2">
              ${recommendedPrice}
            </div>
            <div className="flex items-center gap-1 text-sm text-emerald-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span>High match likelihood</span>
            </div>
          </div>
        ) : budget > (recommendedPrice ?? 0) ? (
          // Your Bid above recommended - green filled card
          <div className="bg-emerald-600 rounded-2xl p-6 mb-4 min-h-[156px]">
            <div className="flex items-center gap-2 mb-2">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <span className="text-sm font-medium text-white">Your Bid</span>
            </div>
            <div className="text-5xl font-bold text-white mb-2">
              ${budget}
            </div>
            <div className="flex items-center gap-1 text-sm text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span>Very high match likelihood</span>
            </div>
          </div>
        ) : (
          // Your Bid below recommended - orange outlined card
          <div className="bg-orange-50 rounded-2xl border-2 border-orange-400 p-6 mb-4 min-h-[156px]">
            <div className="flex items-center gap-2 mb-2">
              <svg
                className="w-5 h-5 text-orange-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <span className="text-sm font-medium text-orange-500">Your Bid</span>
            </div>
            <div className="text-5xl font-bold text-orange-500 mb-2">
              ${budget}
            </div>
            <div className="flex items-center gap-1 text-sm text-orange-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span>Very low match likelihood</span>
            </div>
          </div>
        )}

        {/* Budget Slider */}
        {minPrice !== null && maxPrice !== null && budget !== null && (
          <div className="mb-6">
            <div className="flex justify-between text-xs text-slate-500 mb-2">
              <span>${minPrice}</span>
              <span>${maxPrice}</span>
            </div>

            <input
              type="range"
              min={minPrice}
              max={maxPrice}
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
              aria-valuemin={minPrice}
              aria-valuemax={maxPrice}
              aria-valuenow={budget}
            />
          </div>
        )}

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
