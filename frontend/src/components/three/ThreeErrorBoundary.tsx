/**
 * Error boundary for Three.js / React Three Fiber canvas components.
 * Catches WebGL errors, geometry failures, and shader compilation errors.
 * Shows a graceful fallback so the rest of the page remains functional.
 */
import { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ThreeErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.warn(
      `[ThreeErrorBoundary] ${this.props.componentName ?? '3D Scene'} failed:`,
      error.message,
      info.componentStack
    );
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
          }}
          aria-label="3D visualization unavailable"
        />
      );
    }
    return this.props.children;
  }
}
