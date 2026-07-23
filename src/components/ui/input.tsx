import { cn } from "@/lib/utils";
import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  endAdornment?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { className, label, error, type = "text", id, endAdornment, ...props },
    ref,
  ) => {
    const autoId = useId();
    const inputId = id ?? autoId;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-dark dark:text-white"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            id={inputId}
            type={type}
            className={cn(
              "w-full rounded-lg border border-stroke bg-transparent px-3 py-1.5 text-sm text-dark outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus-visible:shadow-none dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary",
              endAdornment && "pr-10",
              error &&
                "border-red-500 focus:border-red-500 focus:ring-red-500/20",
              className,
            )}
            ref={ref}
            {...props}
          />
          {endAdornment ? (
            <div className="absolute inset-y-0 right-0 flex items-center pr-2">
              {endAdornment}
            </div>
          ) : null}
        </div>
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
  },
);

Input.displayName = "Input";
