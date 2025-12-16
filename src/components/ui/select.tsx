import { cn } from "@/lib/utils";
import { forwardRef, type SelectHTMLAttributes } from "react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string | number; label: string }>;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, value, ...props }, ref) => {
    // Determinar si debe mostrar el placeholder
    const showPlaceholder = !value || value === "" || value === "0" || value === 0;
    const displayValue = showPlaceholder ? "" : value;

    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">
            {label}
          </label>
        )}
        <select
          className={cn(
            "w-full rounded-lg border border-stroke bg-transparent px-3 py-1.5 text-sm text-dark outline-none transition focus:border-primary focus-visible:shadow-none dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary",
            error && "border-red-500 focus:border-red-500",
            className
          )}
          ref={ref}
          value={displayValue}
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
          <p className="mt-0.5 text-xs text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";




