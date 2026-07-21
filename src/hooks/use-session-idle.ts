'use client';

import { useEffect, useRef } from 'react';
import { SESSION_IDLE_SECONDS } from '@/lib/auth/session-ttl';
import { notificationToast } from '@/lib/notifications/notification-toast';

const WARN_BEFORE_MS = 2 * 60 * 1000;
const ACTIVITY_EVENTS = [
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
] as const;

/**
 * Avisa y cierra sesión al acercarse / superar el idle del servidor.
 * La autoridad real es el JWT (`lastActivityAt`); esto mejora UX.
 */
export function useSessionIdle(params: {
  enabled: boolean;
  onIdle: () => void;
  idleSeconds?: number;
}): void {
  const idleSeconds = params.idleSeconds ?? SESSION_IDLE_SECONDS;
  const onIdleRef = useRef(params.onIdle);
  onIdleRef.current = params.onIdle;
  const warnedRef = useRef(false);
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    if (!params.enabled) {
      return;
    }

    const markActivity = () => {
      lastActivityRef.current = Date.now();
      warnedRef.current = false;
    };

    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, markActivity, { passive: true });
    }

    const timer = window.setInterval(() => {
      const idleMs = Date.now() - lastActivityRef.current;
      const limitMs = idleSeconds * 1000;
      if (idleMs >= limitMs) {
        onIdleRef.current();
        return;
      }
      if (!warnedRef.current && idleMs >= limitMs - WARN_BEFORE_MS) {
        warnedRef.current = true;
        notificationToast.warning(
          'Tu sesión se cerrará por inactividad en unos minutos.',
          'Sesión inactiva',
        );
      }
    }, 15_000);

    return () => {
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, markActivity);
      }
      window.clearInterval(timer);
    };
  }, [params.enabled, idleSeconds]);
}
