import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from '@/components/molecules';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Without this, one thrown render error blanks the whole app. React has no hook
 * equivalent, so a class component is correct here rather than legacy.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Replace with your reporter. Keep it here so there is exactly one place to change.
    console.error('Unhandled render error', error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="p-gutter">
          <ErrorState
            error={this.state.error}
            onRetry={() => {
              this.setState({ error: null });
            }}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
