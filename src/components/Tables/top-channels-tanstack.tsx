"use client";

import { useGraphQLQuery } from "@/hooks/use-graphql-query";
import { GET_CHANNELS } from "@/lib/graphql/queries/channel.queries";
import { TanStackTable } from "./tanstack-table";
import { compactFormat, standardFormat } from "@/lib/format-number";
import { cn } from "@/lib/utils";
import Image from "next/image";
import * as logos from "@/assets/logos";
import type { ColumnDef } from "@tanstack/react-table";
import { Skeleton } from "@/components/ui/skeleton";

// Mapeo de logos (temporal hasta que tengamos logos en la DB)
const logoMap: Record<string, string> = {
  Google: logos.google,
  "X.com": logos.x,
  Github: logos.github,
  Vimeo: logos.vimeo,
  Facebook: logos.facebook,
};

interface Channel {
  id: string;
  name: string;
  visits: number;
  revenue: number;
  conversion: number;
}

const columns: ColumnDef<Channel>[] = [
  {
    accessorKey: "name",
    header: "Source",
    cell: ({ row }) => {
      const name = row.getValue("name") as string;
      const logo = logoMap[name] || logos.main;
      return (
        <div className="flex min-w-fit items-center gap-3">
          <Image
            src={logo}
            className="size-8 rounded-full object-cover"
            width={40}
            height={40}
            alt={`${name} Logo`}
            role="presentation"
          />
          <div>{name}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "visits",
    header: "Visitors",
    cell: ({ row }) => compactFormat(row.getValue("visits")),
  },
  {
    accessorKey: "revenue",
    header: "Revenues",
    cell: ({ row }) => (
      <div className="text-right text-green-light-1">
        ${standardFormat(row.getValue("revenue"))}
      </div>
    ),
  },
  {
    accessorKey: "conversion",
    header: "Conversion",
    cell: ({ row }) => `${row.getValue("conversion")}%`,
  },
];

export function TopChannelsTanStack({ className }: { className?: string }) {
  const { data, isLoading, error } = useGraphQLQuery<{ channels: Channel[] }>(GET_CHANNELS);

  if (isLoading) {
    return (
      <div
        className={cn(
          "grid rounded-[10px] bg-white px-7.5 pb-4 pt-7.5 shadow-1 dark:bg-gray-dark dark:shadow-card",
          className,
        )}
      >
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "grid rounded-[10px] bg-white px-7.5 pb-4 pt-7.5 shadow-1 dark:bg-gray-dark dark:shadow-card",
          className,
        )}
      >
        <h2 className="mb-4 text-body-2xlg font-bold text-dark dark:text-white">
          Top Channels
        </h2>
        <div className="text-center text-red">Error al cargar los datos</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid rounded-[10px] bg-white px-7.5 pb-4 pt-7.5 shadow-1 dark:bg-gray-dark dark:shadow-card",
        className,
      )}
    >
      <h2 className="mb-4 text-body-2xlg font-bold text-dark dark:text-white">
        Top Channels
      </h2>

      <TanStackTable
        data={data?.channels || []}
        columns={columns}
        enableSorting
      />
    </div>
  );
}
