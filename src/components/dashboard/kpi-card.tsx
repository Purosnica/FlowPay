"use client";

interface KPICardProps {
  title: string;
  value: string;
  icon: string;
  trend?: {
    value: number;
    isPositive: boolean;
  } | null;
  loading?: boolean;
}

export function KPICard({ title, value, icon, trend, loading }: KPICardProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700"></div>
          <div className="h-8 w-32 rounded bg-gray-200 dark:bg-gray-700"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{title}</p>
          <h3 className="mt-2 text-2xl font-bold text-dark dark:text-white">{value}</h3>
          {trend && (
            <div className="mt-2 flex items-center text-sm">
              <span
                className={`font-medium ${
                  trend.isPositive ? "text-green-600" : "text-red-600"
                }`}
              >
                {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
              <span className="ml-2 text-gray-500">vs mes anterior</span>
            </div>
          )}
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );
}



