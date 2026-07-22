import "@/css/satoshi.css";
import "@/css/style.css";

import "flatpickr/dist/flatpickr.min.css";
import "jsvectormap/dist/jsvectormap.css";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { NotificationContainer } from "@/components/ui/notification-toast";
import type { Metadata, Viewport } from "next";
import NextTopLoader from "nextjs-toploader";
import type { PropsWithChildren } from "react";
import { Providers } from "./providers";
import { PwaRegister } from "@/components/pwa/pwa-register";

export const metadata: Metadata = {
  title: {
    template: "%s | FlowPay",
    default: "FlowPay",
  },
  description:
    "FlowPay — plataforma de cobranza operativa para equipos de campo y call center",
  applicationName: "FlowPay",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FlowPay",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#5750F1" },
    { media: "(prefers-color-scheme: dark)", color: "#020D1A" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          <ErrorBoundary>
            <NextTopLoader color="#5750F1" showSpinner={false} />
            <PwaRegister />
            {children}
            <NotificationContainer />
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}
