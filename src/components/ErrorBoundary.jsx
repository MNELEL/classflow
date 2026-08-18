import { Component } from 'react';
import { base44 } from '@/api/base44Client';

// Global error boundary — catches render/lifecycle errors anywhere in the
// React tree below it and shows a recoverable Hebrew UI instead of a blank
// white screen. Does NOT catch errors inside event handlers, async code, or
// during SSR — those are handled separately (see try/catch call sites).
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, isAdmin: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Always log to console for local/dev visibility.
    console.error('[ErrorBoundary] Caught render error:', error, errorInfo);

    // Best-effort: surface admin-only technical details without blocking
    // the fallback UI on a network round trip.
    base44.auth.me()
      .then((user) => {
        if (user?.role === 'admin') this.setState({ isAdmin: true });
      })
      .catch(() => {});
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full">
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-7xl font-light text-muted-foreground/40">שגיאה</h1>
              <div className="h-0.5 w-16 bg-border mx-auto" />
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-medium text-foreground">
                משהו השתבש
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                אירעה שגיאה בלתי צפויה בטעינת המסך. ניתן לנסות לרענן את הדף, או לחזור למסך הבית.
              </p>
            </div>

            {this.state.isAdmin && this.state.error && (
              <div className="mt-4 p-4 bg-muted rounded-lg border border-border text-left" dir="ltr">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-orange-400" />
                  </div>
                  <div className="space-y-1 overflow-hidden">
                    <p className="text-sm font-medium text-foreground">Admin note — error detail</p>
                    <p className="text-xs text-muted-foreground leading-relaxed break-words whitespace-pre-wrap font-mono">
                      {this.state.error.message}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-6 flex items-center justify-center gap-3">
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted hover:border-primary/30 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
              >
                חזרה לדף הבית
              </button>
              <button
                onClick={this.handleReload}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:opacity-90 transition-opacity duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
              >
                רענון הדף
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
