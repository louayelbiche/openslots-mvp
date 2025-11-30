'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUserMode } from '../contexts/UserModeContext';

export function BottomNav() {
  const pathname = usePathname();
  const { isCustomer } = useUserMode();

  // Determine active tab based on current path
  const isMainTabActive = isCustomer
    ? pathname === '/' || pathname.startsWith('/service-type') || pathname.startsWith('/budget') || pathname.startsWith('/offers')
    : pathname === '/provider/offers';
  const isProfileActive = pathname === '/profile';

  const mainTabHref = isCustomer ? '/' : '/provider/offers';
  const mainTabLabel = isCustomer ? 'Discovery' : 'Offers';

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
      <div className="max-w-lg mx-auto flex">
        {/* Main Tab - Discovery (customer) or Offers (provider) */}
        <Link
          href={mainTabHref}
          className={`
            flex-1 flex flex-col items-center justify-center py-3 transition-colors
            ${isMainTabActive ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}
          `}
        >
          {isCustomer ? (
            // Search/Discovery icon
            <svg
              className="w-6 h-6 mb-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          ) : (
            // Offers/inbox icon
            <svg
              className="w-6 h-6 mb-1"
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
          )}
          <span className="text-xs font-medium">{mainTabLabel}</span>
        </Link>

        {/* Profile Tab */}
        <Link
          href="/profile"
          className={`
            flex-1 flex flex-col items-center justify-center py-3 transition-colors
            ${isProfileActive ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}
          `}
        >
          <svg
            className="w-6 h-6 mb-1"
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
          <span className="text-xs font-medium">Profile</span>
        </Link>
      </div>
    </nav>
  );
}
