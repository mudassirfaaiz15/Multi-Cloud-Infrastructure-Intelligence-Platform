/**
 * Global Error Boundary Component
 * Catches React errors and displays user-friendly error UI
 */

import React, { ReactNode, ReactElement } from 'react';
import { logger } from '@/lib/logger';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactElement;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error with context
    logger.error('React Error Boundary caught an error', error, {
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorId: '',
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
            <div className="max-w-md w-full bg-slate-800 rounded-lg shadow-xl p-6 border border-red-500/20">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-red-500" />
                <h1 className="text-xl font-bold text-white">Something went wrong</h1>
              </div>

              <p className="text-slate-300 mb-4">
                We encountered an unexpected error. Our team has been notified and we're working on a fix.
              </p>

              <div className="bg-slate-900 rounded p-3 mb-4 border border-slate-700">
                <p className="text-xs text-slate-400 font-mono break-words">
                  Error ID: {this.state.errorId}
                </p>
                {this.state.error && (
                  <p className="text-xs text-red-400 font-mono mt-2 break-words">
                    {this.state.error.message}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={this.handleReset}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  onClick={() => (window.location.href = '/')}
                  variant="outline"
                  className="flex-1"
                >
                  Go Home
                </Button>
              </div>

              {import.meta.env.DEV && this.state.error && (
                <details className="mt-4 text-xs text-slate-400">
                  <summary className="cursor-pointer hover:text-slate-300">Debug Info</summary>
                  <pre className="mt-2 bg-slate-900 p-2 rounded overflow-auto max-h-40">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
