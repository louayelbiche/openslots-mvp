'use client';

import { useUserMode } from '../../contexts/UserModeContext';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { mode, isCustomer, toggleMode } = useUserMode();
  const router = useRouter();

  const handleSwitchExperience = () => {
    toggleMode();
    // Navigate to the appropriate home page after switching
    if (isCustomer) {
      router.push('/provider/offers');
    } else {
      router.push('/');
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Profile</h1>
          <p className="text-slate-600 text-sm">
            Currently viewing as: <span className="font-semibold capitalize">{mode}</span>
          </p>
        </div>

        {/* Profile placeholder */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center">
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
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Demo User</h2>
              <p className="text-sm text-slate-500">demo@openslots.app</p>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            Profile settings and account management coming soon.
          </p>
        </div>

        {/* Current mode indicator */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">Current Mode</p>
              <p className="text-lg font-semibold text-slate-900 capitalize">{mode}</p>
            </div>
            <div className={`
              px-3 py-1 rounded-full text-sm font-medium
              ${isCustomer ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}
            `}>
              {isCustomer ? 'Seeking Services' : 'Providing Services'}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Switch Experience Button */}
      <div className="fixed bottom-24 left-0 right-0 px-4">
        <div className="max-w-lg mx-auto">
          <button
            type="button"
            onClick={handleSwitchExperience}
            className="
              w-full py-4 rounded-xl font-semibold text-base
              bg-slate-900 text-white hover:bg-slate-800
              shadow-lg transition-all
              flex items-center justify-center gap-2
            "
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
            Switch to {isCustomer ? 'Provider' : 'Customer'} Experience
          </button>
        </div>
      </div>
    </main>
  );
}
