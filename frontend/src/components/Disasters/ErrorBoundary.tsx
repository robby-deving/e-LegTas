import React from "react";

interface State {
  hasError: boolean;
  error: any;
}

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-red-500 p-6">
          <h1 className="text-2xl font-bold">Something went wrong.</h1>
          <p>{this.state.error?.toString() || 'An error occurred while rendering the component.'}</p>
        </div>
      );
    }
    return this.props.children;
  }
}