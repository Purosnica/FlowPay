"use client";

import { useEffect, useRef, forwardRef } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/themes/material_blue.css";
// @ts-ignore - No hay tipos para l10n
import { Spanish } from "flatpickr/dist/l10n/es.js";
import { Input, InputProps } from "./input";

export interface DateInputProps extends Omit<InputProps, "type" | "value" | "onChange"> {
  value?: Date | string | null;
  onChange?: (date: Date | null) => void;
  mode?: "single" | "range" | "multiple";
  minDate?: Date | string;
  maxDate?: Date | string;
  dateFormat?: string;
  enableTime?: boolean;
  time24hr?: boolean;
  disable?: Date[] | string[];
  enable?: Date[] | string[];
  inline?: boolean;
}

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  (
    {
      value,
      onChange,
      mode = "single",
      minDate,
      maxDate,
      dateFormat = "Y-m-d",
      enableTime = false,
      time24hr = true,
      disable,
      enable,
      inline = false,
      className,
      ...props
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const fpRef = useRef<flatpickr.Instance | null>(null);

    useEffect(() => {
      if (!inputRef.current) return;

      const options: any = {
        locale: Spanish,
        dateFormat: enableTime ? `${dateFormat} H:i` : dateFormat,
        enableTime,
        time_24hr: time24hr,
        mode,
        inline,
        defaultDate: value || undefined,
        onChange: (selectedDates: Date[]) => {
          if (mode === "single") {
            onChange?.(selectedDates[0] || null);
          } else {
            onChange?.(selectedDates[0] || null);
          }
        },
      };

      if (minDate) options.minDate = minDate;
      if (maxDate) options.maxDate = maxDate;
      if (disable) options.disable = disable;
      if (enable) options.enable = enable;

      fpRef.current = flatpickr(inputRef.current, options);

      return () => {
        if (fpRef.current) {
          fpRef.current.destroy();
        }
      };
    }, [mode, enableTime, dateFormat, time24hr, inline, minDate, maxDate, disable, enable, onChange]);

    // Sincronizar valor externo
    useEffect(() => {
      if (fpRef.current && value !== undefined) {
        if (value === null || value === "") {
          fpRef.current.clear();
        } else {
          fpRef.current.setDate(value, false);
        }
      }
    }, [value]);

    return (
      <div className="relative">
        <Input
          {...props}
          ref={(node) => {
            inputRef.current = node;
            if (typeof ref === "function") {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
          type="text"
          readOnly
          className={className}
          data-input
        />
        {!inline && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>
    );
  }
);

DateInput.displayName = "DateInput";

