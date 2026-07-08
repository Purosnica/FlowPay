import { cn } from '@/lib/utils';
import { type ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center rounded-lg font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]';

    const variantClasses = {
      primary:
        'bg-primary text-white shadow-md shadow-primary/25 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30',
      secondary:
        'bg-blue-light-5 text-blue-dark shadow-sm hover:bg-blue-light-4 dark:bg-dark-3 dark:text-white dark:hover:bg-dark-4',
      outline:
        'border-2 border-primary bg-white text-primary shadow-sm hover:bg-primary hover:text-white dark:border-primary dark:bg-dark-2 dark:text-primary dark:hover:bg-primary dark:hover:text-white',
      ghost:
        'bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary/15 dark:text-primary dark:hover:bg-primary/25',
      danger:
        'bg-red text-white shadow-md shadow-red/25 hover:bg-red-dark hover:shadow-lg hover:shadow-red/30',
    };

    const sizeClasses = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-base',
      lg: 'h-12 px-6 text-lg',
    };

    return (
      <button
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        ref={ref}
        type={type}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
