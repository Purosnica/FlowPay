'use client';

import { useEffect } from 'react';

/**
 * Registra el service worker de la PWA cobrador (I036).
 * Solo en producción / cuando el navegador lo soporta.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }
    const enable =
      process.env.NODE_ENV === 'production' ||
      process.env.NEXT_PUBLIC_ENABLE_PWA === '1';
    if (!enable) {
      return;
    }

    void navigator.serviceWorker.register('/sw.js').catch(() => {
      // Silencioso: PWA es mejora progresiva.
    });
  }, []);

  return null;
}
