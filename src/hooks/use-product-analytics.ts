'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ensureAnalyticsSession,
  getHeatmapBuckets,
  getLastTimeToFirstGestion,
  trackGestionCreated,
  trackUiClick,
  type TimeToFirstGestionMetric,
} from '@/lib/analytics/product-analytics';

/**
 * Inicializa sesión de analytics y expone helpers de producto (I175 / I189).
 */
export function useProductAnalytics() {
  const [ttfg, setTtfg] = useState<TimeToFirstGestionMetric | null>(null);

  useEffect(() => {
    ensureAnalyticsSession();
    setTtfg(getLastTimeToFirstGestion());
  }, []);

  const onGestionCreated = useCallback(() => {
    const metric = trackGestionCreated();
    if (metric) {
      setTtfg(metric);
    }
  }, []);

  const onUiClick = useCallback((targetId: string) => {
    trackUiClick(targetId);
  }, []);

  return {
    timeToFirstGestion: ttfg,
    onGestionCreated,
    onUiClick,
    getHeatmapBuckets,
  };
}
