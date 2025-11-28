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

function BookingConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract params from URL
  const providerName = searchParams.get('providerName') || 'Unknown Provider';
  const providerRating = parseFloat(searchParams.get('providerRating') || '0');
  const serviceName = searchParams.get('serviceName') || 'Service';
  const durationMin = parseInt(searchParams.get('durationMin') || '60', 10);
  const startTime = searchParams.get('startTime') || '';
  const price = parseInt(searchParams.get('price') || '0', 10);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-emerald-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        {/* Success Message */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            You're booked!
          </h1>
          <p className="text-slate-600">
            Get ready to relax
          </p>
        </div>

        {/* Booking Summary Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          {/* Provider */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-slate-900">{providerName}</h2>
              <div className="flex items-center text-sm text-slate-500 mt-0.5">
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
          </div>

          {/* Service & Time */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-slate-700">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>{serviceName} • {durationMin} min</span>
            </div>

            <div className="flex items-center gap-2 text-slate-700">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>
                {startTime ? `${formatDate(startTime)} / ${formatTime(startTime)}` : 'Time TBD'}
              </span>
            </div>
          </div>

          {/* Price */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Total</span>
              <span className="text-lg font-bold text-slate-900">{formatPrice(price)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="
              w-full py-4 rounded-xl font-semibold text-base
              bg-slate-900 text-white hover:bg-slate-800
              shadow-lg transition-all
            "
          >
            Back to Home
          </button>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                // Placeholder for add to calendar functionality
                alert('Add to Calendar feature coming soon!');
              }}
              className="
                flex-1 py-3 rounded-xl font-medium text-sm
                border-2 border-slate-200 text-slate-700
                hover:border-slate-400 transition-all
                flex items-center justify-center gap-2
              "
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Add to Calendar
            </button>

            <button
              type="button"
              onClick={() => {
                // Placeholder for directions functionality
                alert('Directions feature coming soon!');
              }}
              className="
                flex-1 py-3 rounded-xl font-medium text-sm
                border-2 border-slate-200 text-slate-700
                hover:border-slate-400 transition-all
                flex items-center justify-center gap-2
              "
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Directions
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

// Loading fallback
function BookingConfirmationLoading() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-slate-200 rounded-full"></div>
          </div>
          <div className="h-8 bg-slate-200 rounded w-48 mx-auto mb-4"></div>
          <div className="h-4 bg-slate-200 rounded w-32 mx-auto mb-8"></div>
          <div className="h-40 bg-slate-200 rounded-xl mb-6"></div>
          <div className="h-14 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    </main>
  );
}

export default function BookingConfirmationPage() {
  return (
    <Suspense fallback={<BookingConfirmationLoading />}>
      <BookingConfirmationContent />
    </Suspense>
  );
}
