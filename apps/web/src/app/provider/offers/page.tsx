'use client';

import { useUserMode } from '../../../contexts/UserModeContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProviderOffersPage() {
  const { isProvider } = useUserMode();
  const router = useRouter();

  // Redirect to customer home if not in provider mode
  useEffect(() => {
    if (!isProvider) {
      router.push('/');
    }
  }, [isProvider, router]);

  if (!isProvider) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Incoming Offers
          </h1>
          <p className="text-slate-600 text-sm">
            Review and respond to customer bids on your slots
          </p>
        </div>

        {/* Provider mode indicator */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-800">Provider Mode Active</p>
              <p className="text-xs text-emerald-600">You're viewing as a service provider</p>
            </div>
          </div>
        </div>

        {/* Empty state */}
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            No offers yet
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            When customers bid on your available slots, their offers will appear here.
          </p>
          <p className="text-xs text-slate-400">
            Bidding functionality coming soon!
          </p>
        </div>

        {/* Placeholder for future offers list */}
        <div className="mt-6 space-y-4">
          {/* Example offer card (commented out for now) */}
          {/*
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-medium text-slate-900">Swedish Massage</p>
                <p className="text-sm text-slate-500">John D. • Today 2:00 PM</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-slate-900">$65</p>
                <p className="text-xs text-slate-500">Your min: $50</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium">
                Accept
              </button>
              <button className="flex-1 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium">
                Counter
              </button>
            </div>
            <div className="mt-2 text-center">
              <p className="text-xs text-orange-600 font-medium">Expires in 45s</p>
            </div>
          </div>
          */}
        </div>
      </div>
    </main>
  );
}
