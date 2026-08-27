import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Updated Again crashed:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="app-shell crash-panel">
          <p className="eyebrow">页面错误</p>
          <h1>页面没能正常打开</h1>
          <p className="crash-panel__detail">本地版本档案没有丢失。请重新载入。</p>
          <button type="button" className="primary-button" onClick={() => window.location.reload()}>
            重新载入
          </button>
          <p className="muted">{this.state.error.message}</p>
        </main>
      );
    }
    return this.props.children;
  }
}
