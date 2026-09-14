import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-8 h-8 shrink-0" />
              <div>
                <h2 className="text-lg font-bold">
                  {this.props.fallbackTitle || 'An unexpected error occurred (Application Error)'}
                </h2>
                <p className="text-xs text-slate-400">An error occurred in a dialog or component.</p>
              </div>
            </div>

            {this.state.error && (
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-700/80 font-mono text-xs text-rose-300 overflow-x-auto max-h-48 custom-scrollbar">
                {this.state.error.toString()}
              </div>
            )}

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#004b9b] hover:bg-[#005bb8] text-white font-extrabold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
