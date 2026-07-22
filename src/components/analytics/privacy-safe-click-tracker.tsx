'use client';

import { useEffect, useRef } from 'react';
import {
  ensureAnalyticsSession,
  trackUiClick,
} from '@/lib/analytics/product-analytics';

/**
 * Captura clics en elementos con data-ux-id (heatmap privacy-safe, I189).
 * No registra texto, coordenadas ni PII.
 */
export function PrivacySafeClickTracker() {
  const bound = useRef(false);

  useEffect(() => {
    ensureAnalyticsSession();
  }, []);

  useEffect(() => {
    if (bound.current) {
      return;
    }
    bound.current = true;

    const handler = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const el = target.closest('[data-ux-id]');
      if (!(el instanceof HTMLElement)) {
        return;
      }
      const id = el.dataset.uxId;
      if (id) {
        trackUiClick(id);
      }
    };

    document.addEventListener('click', handler, { capture: true });
    return () => {
      document.removeEventListener('click', handler, { capture: true });
      bound.current = false;
    };
  }, []);

  return null;
}
