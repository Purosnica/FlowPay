import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const baseClasses = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50";
    
    const variantClasses = {
      primary: "bg-primary text-white hover:bg-primary/90",
      secondary: "bg-gray-2 text-dark hover:bg-gray-3 dark:bg-dark-3 dark:text-white dark:hover:bg-dark-4",
      outline: "border border-stroke bg-transparent hover:bg-gray-2 dark:border-dark-3 dark:hover:bg-dark-3",
      ghost: "hover:bg-gray-2 dark:hover:bg-dark-3",
      danger: "bg-red-500 text-white hover:bg-red-600",
    };

    const sizeClasses = {
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-4 text-base",
      lg: "h-12 px-6 text-lg",
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
        {...props}
      />
    );
  }
);

Button.displayName = "Button";





