import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    // Do not log page data or component props, which can contain HR records.
    console.error('Workspace rendering failed:', error.name, info.componentStack);
  }
  render() {
    if (this.state.failed) return <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <h1 className="text-xl font-semibold">The workspace could not load</h1>
      <p className="max-w-sm text-sm text-muted-foreground">Reload to get the latest application files and try again.</p>
      <Button onClick={() => window.location.reload()}>Reload workspace</Button>
    </main>;
    return this.props.children;
  }
}
