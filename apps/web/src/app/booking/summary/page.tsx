'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

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
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  if (isToday) {
    return 'Today';
  }
  if (isTomorrow) {
    return 'Tomorrow';
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

function BookingSummaryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract params from URL
  const providerName = searchParams.get('providerName') || 'Unknown Provider';
  const providerRating = parseFloat(searchParams.get('providerRating') || '0');
  const providerDistance = parseFloat(searchParams.get('providerDistance') || '0');
  const serviceName = searchParams.get('serviceName') || 'Service';
  const durationMin = parseInt(searchParams.get('durationMin') || '60', 10);
  const startTime = searchParams.get('startTime') || '';
  const endTime = searchParams.get('endTime') || '';
  const price = parseInt(searchParams.get('price') || '0', 10);
  const slotId = searchParams.get('slotId') || '';
  const providerId = searchParams.get('providerId') || '';

  // Handle confirm booking
  const handleConfirm = () => {
    // Navigate to confirmation screen with booking details
    const params = new URLSearchParams({
      providerName,
      providerRating: providerRating.toString(),
      serviceName,
      durationMin: durationMin.toString(),
      startTime,
      price: price.toString(),
      slotId,
      providerId,
    });
    router.push(`/booking/confirmation?${params.toString()}`);
  };

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
            Booking Summary
          </h1>
          <p className="text-slate-600 text-sm">
            Review your booking details before confirming
          </p>
        </div>

        {/* Booking Details Card */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
          {/* Provider Info */}
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                {providerName}
              </h2>
              <div className="flex items-center text-sm text-slate-600">
                <svg
                  className="w-4 h-4 text-amber-500 mr-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span>{providerRating.toFixed(1)}</span>
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {providerDistance} miles away
            </p>
          </div>

          {/* Service Details */}
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">
              Service
            </h3>
            <p className="text-slate-900 font-medium">
              {serviceName}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {durationMin} minutes
            </p>
          </div>

          {/* Time Slot */}
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">
              Time Slot
            </h3>
            <div className="flex items-center gap-3">
              <div className="bg-slate-100 px-3 py-2 rounded-lg">
                <p className="text-lg font-bold text-slate-900">
                  {startTime ? formatTime(startTime) : '--:--'}
                </p>
              </div>
              <span className="text-slate-400">to</span>
              <div className="bg-slate-100 px-3 py-2 rounded-lg">
                <p className="text-lg font-bold text-slate-900">
                  {endTime ? formatTime(endTime) : '--:--'}
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-2">
              {startTime ? formatDate(startTime) : 'Date TBD'}
            </p>
          </div>

          {/* Price */}
          <div className="p-4 bg-emerald-50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-700">
                Total Price
              </h3>
              <p className="text-2xl font-bold text-emerald-700">
                {formatPrice(price)}
              </p>
            </div>
          </div>
        </div>

        {/* Confirm Button */}
        <button
          type="button"
          onClick={handleConfirm}
          className="
            w-full py-4 rounded-xl font-semibold text-base
            bg-slate-900 text-white hover:bg-slate-800
            shadow-lg transition-all
          "
        >
          Confirm Booking
        </button>

        {/* Cancel text */}
        <p className="text-center text-xs text-slate-500 mt-4">
          You can cancel for free up to 24 hours before your appointment
        </p>
      </div>
    </main>
  );
}

// Loading fallback
function BookingSummaryLoading() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-48 mb-4"></div>
          <div className="h-4 bg-slate-200 rounded w-64 mb-8"></div>
          <div className="h-64 bg-slate-200 rounded-xl mb-6"></div>
          <div className="h-14 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    </main>
  );
}

export default function BookingSummaryPage() {
  return (
    <Suspense fallback={<BookingSummaryLoading />}>
      <BookingSummaryContent />
    </Suspense>
  );
}
