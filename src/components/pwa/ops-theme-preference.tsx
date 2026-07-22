'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useEsCobrador } from '@/hooks/use-rol';

const OPS_PREF_KEY = 'flowpay_theme_ops_default';

/**
 * Preferencia dark operativa para cobradores (I050).
 * Solo aplica una vez si el usuario no eligió tema aún.
 */
export function OpsThemePreference() {
  const esCobrador = useEsCobrador();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (!esCobrador || typeof window === 'undefined') {
      return;
    }
    const yaAplicado = localStorage.getItem(OPS_PREF_KEY);
    if (yaAplicado) {
      return;
    }
    // next-themes guarda "theme" en localStorage; si no hay, sugerimos dark.
    const stored = localStorage.getItem('theme');
    if (!stored && theme !== 'dark') {
      setTheme('dark');
    }
    localStorage.setItem(OPS_PREF_KEY, '1');
  }, [esCobrador, setTheme, theme]);

  return null;
}
