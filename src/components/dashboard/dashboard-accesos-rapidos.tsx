'use client';

import Link from 'next/link';

export interface AccesoRapidoItem {
  href: string;
  label: string;
}

interface DashboardAccesosRapidosProps {
  items: AccesoRapidoItem[];
}

export function DashboardAccesosRapidos({
  items,
}: DashboardAccesosRapidosProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-gray-dark">
      <h2 className="mb-3 text-sm font-semibold text-dark dark:text-white">
        Accesos rápidos
      </h2>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg border-2 border-primary/30 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary transition-all hover:border-primary hover:bg-primary hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
