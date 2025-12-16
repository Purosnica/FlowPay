"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to error reporting service
    console.error("Error page:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-2 dark:bg-[#020d1a]">
      <div className="mx-auto max-w-md rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold text-dark dark:text-white">
            Algo salió mal
          </h2>
          <p className="mb-6 text-gray-6">
            {error.message || "Ocurrió un error inesperado"}
          </p>
          {error.digest && (
            <p className="mb-4 text-xs text-gray-5 dark:text-dark-6">
              Error ID: {error.digest}
            </p>
          )}
          <div className="flex gap-4 justify-center">
            <Button onClick={reset} variant="primary">
              Reintentar
            </Button>
            <Button
              onClick={() => (window.location.href = "/")}
              variant="outline"
            >
              Volver al inicio
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}





