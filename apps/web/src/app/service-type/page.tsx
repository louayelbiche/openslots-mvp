'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ServiceCategory, TimeWindow } from '../../types/discovery';
import { useServiceTypes } from '../../lib/hooks';

// Helper to format duration
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function ServiceTypeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const service = searchParams.get('service') as ServiceCategory;
  const city = searchParams.get('city');
  const timeWindow = searchParams.get('timeWindow') as TimeWindow | null;
  const zipCode = searchParams.get('zipCode');

  const [selectedType, setSelectedType] = useState<string | null>(null);

  // Use React Query hook for data fetching with automatic deduplication
  const { data, isLoading, error } = useServiceTypes(
    service && city
      ? {
          serviceCategory: service,
          city,
          timeWindow: timeWindow || undefined,
        }
      : null
  );

  const serviceTypes = data?.serviceTypes || [];

  const handleContinue = () => {
    if (!selectedType) return;

    const params = new URLSearchParams({
      service: service,
      city: city!,
      timeWindow: timeWindow!,
      serviceType: selectedType,
    });

    if (zipCode) {
      params.set('zipCode', zipCode);
    }

    router.push(`/budget?${params.toString()}`);
  };

  const handleBack = () => {
    router.back();
  };

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">
            {error instanceof Error ? error.message : 'Failed to load service types'}
          </p>
          <button
            onClick={handleBack}
            className="text-slate-600 underline"
          >
            Go back
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Back button */}
        <button
          onClick={handleBack}
          className="flex items-center text-slate-600 hover:text-slate-900 mb-6"
        >
          <svg
            className="w-5 h-5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            What type of service?
          </h1>
          <p className="text-slate-600 text-sm">
            Choose the specific service you're looking for
          </p>
        </div>

        {/* Service Types List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="animate-pulse bg-white rounded-xl border-2 border-slate-200 p-4"
              >
                <div className="h-5 bg-slate-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-slate-100 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        ) : serviceTypes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500">No services available in this area</p>
            <button
              onClick={handleBack}
              className="mt-4 text-slate-900 underline"
            >
              Choose a different location
            </button>
          </div>
        ) : (
          <div className="space-y-3 mb-8">
            {serviceTypes.map((type) => (
              <button
                key={type.name}
                type="button"
                onClick={() => setSelectedType(type.name)}
                className={`
                  w-full flex items-center justify-between
                  p-4 rounded-xl border-2 transition-all text-left
                  ${
                    selectedType === type.name
                      ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                      : 'border-slate-200 bg-white text-slate-900 hover:border-slate-400'
                  }
                `}
                aria-pressed={selectedType === type.name}
              >
                <div>
                  <span className="font-medium block">{type.name}</span>
                  <span
                    className={`text-sm ${
                      selectedType === type.name ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {formatDuration(type.durationMin)}
                  </span>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    selectedType === type.name
                      ? 'bg-slate-700 text-slate-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {type.slotCount} {type.slotCount === 1 ? 'slot' : 'slots'}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Continue Button */}
        {!isLoading && serviceTypes.length > 0 && (
          <>
            <button
              type="button"
              onClick={handleContinue}
              disabled={!selectedType}
              className={`
                w-full py-4 rounded-xl font-semibold text-base transition-all
                ${
                  selectedType
                    ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }
              `}
              aria-disabled={!selectedType}
            >
              Continue
            </button>

            {!selectedType && (
              <p className="text-center text-xs text-slate-500 mt-3">
                Select a service type to continue
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default function ServiceTypePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="animate-pulse">Loading...</div>
        </main>
      }
    >
      <ServiceTypeContent />
    </Suspense>
  );
}
