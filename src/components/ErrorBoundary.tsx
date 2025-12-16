"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log error to error reporting service (Sentry, etc.)
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    // Aquí puedes agregar integración con servicios de logging
    // Ejemplo: Sentry.captureException(error, { extra: errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-2 dark:bg-[#020d1a]">
          <div className="mx-auto max-w-md rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
            <div className="text-center">
              <h2 className="mb-2 text-2xl font-bold text-dark dark:text-white">
                Algo salió mal
              </h2>
              <p className="mb-6 text-gray-6">
                {this.state.error?.message || "Ocurrió un error inesperado"}
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={this.handleReset}
                  className="rounded-lg bg-primary px-4 py-2 text-white transition-colors hover:bg-primary/90"
                >
                  Reintentar
                </button>
                <button
                  onClick={() => window.location.href = "/"}
                  className="rounded-lg border border-stroke px-4 py-2 text-dark transition-colors hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
                >
                  Volver al inicio
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

