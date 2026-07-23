/**
 * Marca FlowPay (ícono + wordmark).
 */

import Image from 'next/image';
import { cn } from '@/lib/utils';

type FlowPayLogoProps = {
  variant?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  markOnly?: boolean;
};

const SIZE = {
  sm: { icon: 28, text: 'text-lg' },
  md: { icon: 36, text: 'text-2xl' },
  lg: { icon: 44, text: 'text-3xl' },
} as const;

export function FlowPayLogo({
  variant = 'dark',
  size = 'md',
  className,
  markOnly = false,
}: FlowPayLogoProps) {
  const dims = SIZE[size];
  const textColor =
    variant === 'light' ? 'text-white' : 'text-dark dark:text-white';

  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      <Image
        src="/images/logo/logo-icon.svg"
        alt={markOnly ? 'FlowPay' : ''}
        width={dims.icon}
        height={dims.icon}
        priority
        className="shrink-0"
      />
      {markOnly ? null : (
        <span
          className={cn(
            'font-display font-bold tracking-tight',
            dims.text,
            textColor,
          )}
        >
          FlowPay
        </span>
      )}
    </div>
  );
}
