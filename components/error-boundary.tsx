"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/* Error Boundary                                                      */
/* ------------------------------------------------------------------ */

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional fallback to render instead of default UI */
  fallback?: ReactNode;
  /** Scope label for logging (e.g. "Editor", "Sidebar") */
  scope?: string;
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const scope = this.props.scope ?? "Unknown";
    console.error(`[ErrorBoundary:${scope}]`, error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-red-200 bg-red-50/50 p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-semibold text-neutral-900">
              Something went wrong
            </h3>
            <p className="mt-1 max-w-sm text-xs text-neutral-500">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleRetry}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

/* ------------------------------------------------------------------ */
/* Async Error Helper                                                  */
/* ------------------------------------------------------------------ */

/**
 * Wrap an async function so errors are caught and returned as null
 * with console logging. Use for non-critical operations.
 */
export async function graceful<T>(
  fn: () => Promise<T>,
  scope?: string,
): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[graceful${scope ? `:${scope}` : ""}]`, err);
    return null;
  }
}

/**
 * Hook-friendly error toast state.
 * Components can use this to show transient error messages.
 */
export function useErrorToast() {
  const [error, setError] = React.useState<string | null>(null);

  const showError = React.useCallback((message: string, duration = 5000) => {
    setError(message);
    setTimeout(() => setError(null), duration);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return { error, showError, clearError };
}
