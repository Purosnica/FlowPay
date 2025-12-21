import "@/css/satoshi.css";
import "@/css/style.css";

import { Sidebar } from "@/components/Layouts/sidebar";

import "flatpickr/dist/flatpickr.min.css";
import "jsvectormap/dist/jsvectormap.css";

import { Header } from "@/components/Layouts/header";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { NotificationContainer } from "@/components/ui/notification-toast";
import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import type { PropsWithChildren } from "react";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    template: "%s | FlowPay - Dashboard",
    default: "FlowPay - Dashboard",
  },
  description:
    "FlowPay - Dashboard",
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <ErrorBoundary>
            <NextTopLoader color="#5750F1" showSpinner={false} />
            {children}
            <NotificationContainer />
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}
