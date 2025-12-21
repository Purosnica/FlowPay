import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-4",
    lg: "w-12 h-12 border-4",
  };

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div
        className={cn(
          sizeClasses[size],
          "border-gray-200 border-t-primary rounded-full animate-spin",
          "dark:border-dark-3 dark:border-t-primary"
        )}
        role="status"
        aria-label="Cargando"
      >
        <span className="sr-only">Cargando...</span>
      </div>
    </div>
  );
}

interface LoadingSkeletonProps {
  lines?: number;
  className?: string;
}

export function LoadingSkeleton({ lines = 3, className }: LoadingSkeletonProps) {
  return (
    <div className={cn("animate-pulse space-y-4", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-4 bg-gray-200 rounded dark:bg-dark-3",
            i === 0 && "w-3/4",
            i === 1 && "w-full",
            i === 2 && "w-5/6"
          )}
        />
      ))}
    </div>
  );
}

export function LoadingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}











