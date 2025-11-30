'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type UserMode = 'customer' | 'provider';

interface UserModeContextType {
  mode: UserMode;
  isCustomer: boolean;
  isProvider: boolean;
  toggleMode: () => void;
  setMode: (mode: UserMode) => void;
}

const UserModeContext = createContext<UserModeContextType | undefined>(undefined);

export function UserModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<UserMode>('customer');

  const toggleMode = useCallback(() => {
    setModeState((prev) => (prev === 'customer' ? 'provider' : 'customer'));
  }, []);

  const setMode = useCallback((newMode: UserMode) => {
    setModeState(newMode);
  }, []);

  const value: UserModeContextType = {
    mode,
    isCustomer: mode === 'customer',
    isProvider: mode === 'provider',
    toggleMode,
    setMode,
  };

  return (
    <UserModeContext.Provider value={value}>
      {children}
    </UserModeContext.Provider>
  );
}

export function useUserMode(): UserModeContextType {
  const context = useContext(UserModeContext);
  if (context === undefined) {
    throw new Error('useUserMode must be used within a UserModeProvider');
  }
  return context;
}
