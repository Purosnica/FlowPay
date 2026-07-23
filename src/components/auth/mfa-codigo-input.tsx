/**
 * Entrada visual de código MFA (6 dígitos).
 */

'use client';

import {
  useRef,
  type ClipboardEvent,
  type KeyboardEvent,
  type ChangeEvent,
} from 'react';
import { cn } from '@/lib/utils';

type MfaCodigoInputProps = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
};

const LENGTH = 6;

function toDigits(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, LENGTH);
}

export function MfaCodigoInput({
  value,
  onChange,
  error,
  disabled = false,
}: MfaCodigoInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? '');

  const focusAt = (index: number) => {
    const el = refs.current[index];
    if (el) {
      el.focus();
      el.select();
    }
  };

  const writeValue = (next: string) => {
    const cleaned = toDigits(next);
    onChange(cleaned);
    if (cleaned.length < LENGTH) {
      focusAt(cleaned.length);
    } else {
      focusAt(LENGTH - 1);
    }
  };

  const handleChange = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const incoming = toDigits(event.target.value);
    if (incoming.length > 1) {
      writeValue(value.slice(0, index) + incoming);
      return;
    }
    const next = digits.map((d, i) => (i === index ? incoming : d)).join('');
    writeValue(next);
    if (incoming && index < LENGTH - 1) {
      focusAt(index + 1);
    }
  };

  const handleKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      event.preventDefault();
      const next = digits.map((d, i) => (i === index - 1 ? '' : d)).join('');
      onChange(toDigits(next));
      focusAt(index - 1);
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      focusAt(index - 1);
    }
    if (event.key === 'ArrowRight' && index < LENGTH - 1) {
      event.preventDefault();
      focusAt(index + 1);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    writeValue(event.clipboardData.getData('text'));
  };

  return (
    <div className="w-full">
      <p className="mb-1.5 text-sm font-medium text-dark">Código MFA</p>
      <div className="flex justify-between gap-2">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            disabled={disabled}
            value={digit}
            aria-label={`Dígito ${index + 1} de ${LENGTH}`}
            onChange={(event) => handleChange(index, event)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            className={cn(
              'h-12 w-11 rounded-xl border bg-white text-center font-display text-xl font-semibold text-dark outline-none transition-all sm:h-14 sm:w-12 sm:text-2xl',
              'focus:border-primary focus:ring-2 focus:ring-primary/20',
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : 'border-stroke',
            )}
          />
        ))}
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
