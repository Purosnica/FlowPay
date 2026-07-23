/**
 * Campo outlined Material Design 3 con detalle FlowPay.
 */

'use client';

import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

export type MaterialOutlinedFieldProps =
  InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    error?: string;
    supportingText?: string;
    endAdornment?: ReactNode;
  };

export const MaterialOutlinedField = forwardRef<
  HTMLInputElement,
  MaterialOutlinedFieldProps
>(
  (
    {
      className,
      label,
      error,
      supportingText,
      endAdornment,
      id,
      placeholder = ' ',
      ...props
    },
    ref,
  ) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const hintId = `${inputId}-hint`;

    return (
      <div className="md-field group/field w-full">
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            placeholder={placeholder}
            aria-invalid={Boolean(error)}
            aria-describedby={error || supportingText ? hintId : undefined}
            className={cn(
              'peer h-14 w-full rounded-xl border bg-[#FFFBFE] px-4 text-base text-dark outline-none',
              'transition-[border,box-shadow,background-color] duration-200',
              'placeholder:text-transparent',
              'hover:bg-primary/[0.02]',
              'focus:bg-primary/[0.04]',
              endAdornment && 'pr-12',
              error
                ? 'border-red focus:border-red focus:shadow-[0_0_0_1px_theme(colors.red.DEFAULT)]'
                : 'border-[#79747E]/80 focus:border-primary focus:shadow-[0_0_0_1px_theme(colors.primary.DEFAULT)]',
              className,
            )}
            {...props}
          />
          <label
            htmlFor={inputId}
            className={cn(
              'pointer-events-none absolute left-3 origin-left rounded-sm bg-[#FFFBFE] px-1 text-base text-[#49454F]',
              'transition-all duration-200 ease-out',
              'top-1/2 -translate-y-1/2',
              'peer-focus:-top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:font-medium peer-focus:text-primary',
              'peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-medium',
              error &&
                'peer-focus:text-red peer-[:not(:placeholder-shown)]:text-red',
            )}
          >
            {label}
          </label>
          {endAdornment ? (
            <div className="absolute inset-y-0 right-0 flex items-center pr-1.5">
              {endAdornment}
            </div>
          ) : null}
        </div>
        {error ? (
          <p id={hintId} className="mt-1.5 px-3 text-xs leading-4 text-red">
            {error}
          </p>
        ) : supportingText ? (
          <p
            id={hintId}
            className="mt-1.5 px-3 text-xs leading-4 text-[#79747E]"
          >
            {supportingText}
          </p>
        ) : null}
      </div>
    );
  },
);

MaterialOutlinedField.displayName = 'MaterialOutlinedField';
