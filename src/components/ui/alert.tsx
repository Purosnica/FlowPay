import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface AlertProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}

export function Alert({ children, variant = "default", className }: AlertProps) {
  const variantClasses = {
    default: "bg-gray-1 border-stroke text-dark dark:bg-dark-2 dark:border-dark-3 dark:text-white",
    success: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200",
    danger: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200",
    info: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200",
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        variantClasses[variant],
        className
      )}
      role="alert"
    >
      {children}
    </div>
  );
}

interface AlertTitleProps {
  children: ReactNode;
  className?: string;
}

export function AlertTitle({ children, className }: AlertTitleProps) {
  return (
    <h5 className={cn("mb-1 font-semibold", className)}>
      {children}
    </h5>
  );
}

interface AlertDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function AlertDescription({ children, className }: AlertDescriptionProps) {
  return (
    <div className={cn("text-sm", className)}>
      {children}
    </div>
  );
}

