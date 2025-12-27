import React from 'react';

type ErrorBoundaryState = { hasError: boolean; error?: Error };

export default class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    // Log error for debugging
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-lg bg-white rounded-2xl shadow-md border border-gray-100 p-6 text-center">
            <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-600 mb-4">An unexpected error occurred while rendering this page.</p>
            <details className="text-left text-xs text-gray-500 whitespace-pre-wrap">
              {this.state.error?.message}
            </details>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
