import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Badges con contraste WCAG AA (I181):
 * texto oscuro sobre fondos pastel claros; en dark, texto claro sobre fondos saturados.
 */
export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className,
}: BadgeProps) {
  const variantClasses = {
    default:
      'bg-gray-200 text-gray-900 dark:bg-dark-3 dark:text-white',
    success:
      'bg-green-200 text-green-950 dark:bg-green-800 dark:text-green-50',
    warning:
      'bg-amber-200 text-amber-950 dark:bg-amber-800 dark:text-amber-50',
    danger:
      'bg-red-200 text-red-950 dark:bg-red-800 dark:text-red-50',
    info:
      'bg-blue-200 text-blue-950 dark:bg-blue-800 dark:text-blue-50',
    secondary:
      'bg-gray-300 text-gray-900 dark:bg-dark-4 dark:text-gray-100',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
    >
      {children}
    </span>
  );
}
