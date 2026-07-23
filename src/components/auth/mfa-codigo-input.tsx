/**
 * Entrada MFA Material con progreso visual FlowPay.
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
  const filled = value.length;

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
      <div className="mb-3 flex items-end justify-between gap-3">
        <p className="text-sm font-medium text-[#49454F]">Código MFA</p>
        <p className="text-xs tabular-nums text-[#79747E]">
          {filled}/{LENGTH}
        </p>
      </div>

      <div
        className="mb-4 h-1 overflow-hidden rounded-full bg-primary/10"
        aria-hidden
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${(filled / LENGTH) * 100}%` }}
        />
      </div>

      <div className="flex justify-between gap-1.5 sm:gap-2">
        {digits.map((digit, index) => {
          const isFilled = digit.length > 0;
          return (
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
                'h-12 w-11 rounded-xl border text-center font-display text-xl font-semibold text-dark outline-none transition-all duration-200 sm:h-14 sm:w-12 sm:text-2xl',
                isFilled && !error && 'border-primary/50 bg-primary/[0.06]',
                error
                  ? 'border-red bg-red/5 focus:border-red focus:shadow-[0_0_0_1px_theme(colors.red.DEFAULT)]'
                  : 'border-[#79747E]/80 focus:border-primary focus:bg-primary/[0.06] focus:shadow-[0_0_0_1px_theme(colors.primary.DEFAULT)]',
              )}
            />
          );
        })}
      </div>
      {error ? (
        <p className="mt-2 text-xs text-red">{error}</p>
      ) : (
        <p className="mt-2 text-xs text-[#79747E]">
          También puedes pegar el código completo.
        </p>
      )}
    </div>
  );
}
