import { cn } from "@/lib/utils";
import { forwardRef, type SelectHTMLAttributes } from "react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string | number; label: string }>;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, value, defaultValue, onChange, ...props }, ref) => {
    const isControlled = onChange !== undefined || value !== undefined;
    const controlledValue = value ?? "";
    const initialValue = defaultValue ?? "";
    const showPlaceholder = isControlled
      ? controlledValue === "" || controlledValue === undefined || controlledValue === null
      : initialValue === "" || initialValue === undefined || initialValue === null;

    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">
            {label}
          </label>
        )}
        <select
          className={cn(
            "w-full rounded-lg border border-stroke bg-transparent px-3 py-1.5 text-sm text-dark outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus-visible:shadow-none dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
            className
          )}
          ref={ref}
          {...(isControlled
            ? { value: controlledValue, onChange }
            : { defaultValue: initialValue })}
          {...props}
        >
          {(placeholder || showPlaceholder) && (
            <option value="" disabled>
              {placeholder || "Seleccione una opción"}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <div className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
            <svg
              className="h-4 w-4"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";




