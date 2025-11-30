'use client';

import { ReactNode } from 'react';
import { UserModeProvider } from '../contexts/UserModeContext';
import { BottomNav } from './BottomNav';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <UserModeProvider>
      <div className="pb-16">
        {children}
      </div>
      <BottomNav />
    </UserModeProvider>
  );
}
