'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  UX_PREF_KEYS,
  escribirBoolPref,
  leerBoolPref,
} from '@/lib/ux/ux-prefs';

interface FocusModeContextValue {
  focusMode: boolean;
  setFocusMode: (on: boolean) => void;
  toggleFocusMode: () => void;
}

const FocusModeContext = createContext<FocusModeContextValue | null>(null);

export function FocusModeProvider({ children }: { children: ReactNode }) {
  const [focusMode, setFocusModeState] = useState(false);

  useEffect(() => {
    setFocusModeState(leerBoolPref(UX_PREF_KEYS.focoMiDia, false));
  }, []);

  const setFocusMode = useCallback((on: boolean) => {
    setFocusModeState(on);
    escribirBoolPref(UX_PREF_KEYS.focoMiDia, on);
  }, []);

  const toggleFocusMode = useCallback(() => {
    setFocusModeState((prev) => {
      const next = !prev;
      escribirBoolPref(UX_PREF_KEYS.focoMiDia, next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ focusMode, setFocusMode, toggleFocusMode }),
    [focusMode, setFocusMode, toggleFocusMode],
  );

  return (
    <FocusModeContext.Provider value={value}>
      {children}
    </FocusModeContext.Provider>
  );
}

export function useFocusMode(): FocusModeContextValue {
  const ctx = useContext(FocusModeContext);
  if (!ctx) {
    return {
      focusMode: false,
      setFocusMode: () => undefined,
      toggleFocusMode: () => undefined,
    };
  }
  return ctx;
}
