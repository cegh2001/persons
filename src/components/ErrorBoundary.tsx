"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50/50 dark:bg-slate-950 p-4">
          <div className="max-w-md text-center space-y-4">
            <div className="inline-flex items-center justify-center p-4 bg-red-100 dark:bg-red-950/30 rounded-full">
              <AlertTriangle className="size-8 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Algo salió mal
              </h1>
              <p className="text-sm text-muted-foreground">
                Ocurrió un error inesperado. Intentá recargar la página.
              </p>
              {this.state.error && (
                <pre className="mt-2 text-xs text-left text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
              )}
            </div>
            <Button onClick={this.handleReset} variant="outline" className="gap-2">
              <RefreshCw className="size-4" />
              Reintentar
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
