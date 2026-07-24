'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  type Notification,
  notificationService,
} from '@/lib/notifications/notification-service';

const MAX_VISIBLE_TOASTS = 5;

const NotificationToast: React.FC<{
  notification: Notification;
  onClose: () => void;
}> = ({ notification, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    window.setTimeout(onClose, 300);
  }, [onClose]);

  useEffect(() => {
    const enterTimer = window.setTimeout(() => setIsVisible(true), 10);

    if (!notification.duration) {
      return () => window.clearTimeout(enterTimer);
    }

    const autoCloseTimer = window.setTimeout(() => {
      setIsVisible(false);
      window.setTimeout(onClose, 300);
    }, notification.duration);

    return () => {
      window.clearTimeout(enterTimer);
      window.clearTimeout(autoCloseTimer);
    };
  }, [notification.duration, onClose]);

  const typeStyles = {
    success:
      'border-green-400 bg-green-600 text-white dark:border-green-500 dark:bg-green-700',
    error:
      'border-red-400 bg-red-600 text-white dark:border-red-500 dark:bg-red-700',
    warning:
      'border-amber-400 bg-amber-500 text-white dark:border-amber-500 dark:bg-amber-600',
    info: 'border-blue-400 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-700',
  };

  return (
    <div
      className={`
        pointer-events-auto mb-2 flex items-start gap-3 rounded-lg border-2 p-4
        shadow-2xl transition-all duration-300
        ${typeStyles[notification.type]}
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex-shrink-0 text-white">
        {notification.type === 'success' && (
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        )}
        {notification.type === 'error' && (
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        )}
        {notification.type === 'warning' && (
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        )}
        {notification.type === 'info' && (
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="text-base font-bold leading-tight">
          {notification.title}
        </h4>
        {notification.message ? (
          <p className="mt-1 text-sm leading-snug text-white/95">
            {notification.message}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={handleClose}
        className="flex-shrink-0 rounded p-1 transition-colors hover:bg-black/20"
        aria-label="Cerrar notificación"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
};

export function NotificationContainer() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const unsubscribe = notificationService.subscribe((notification) => {
      setNotifications((prev) => {
        const next = [notification, ...prev];
        return next.slice(0, MAX_VISIBLE_TOASTS);
      });
    });

    return unsubscribe;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  if (!mounted || notifications.length === 0) {
    return null;
  }

  return createPortal(
    <div
      className="pointer-events-none fixed right-4 top-4 w-[min(100vw-2rem,24rem)] space-y-2 p-0"
      style={{ zIndex: 100000 }}
      aria-label="Notificaciones"
    >
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>,
    document.body,
  );
}
