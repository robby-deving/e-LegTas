import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import StatusCodes from './StatusCodes';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorCode: 500 | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorCode: null
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true, errorCode: 500 };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError && this.state.errorCode) {
      return <StatusCodes code={this.state.errorCode} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
