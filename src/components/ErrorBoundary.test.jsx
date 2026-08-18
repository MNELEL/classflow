import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '@/components/ErrorBoundary';

// The component under test always throws on render, letting us trigger the
// boundary deterministically.
function Bomb() {
  throw new Error('boom');
}

function Fine() {
  return <div>all good</div>;
}

vi.mock('@/api/base44Client', () => ({
  base44: {
    auth: {
      // Default: not an admin, so the admin-only detail panel stays hidden
      // unless a specific test overrides this mock.
      me: vi.fn().mockResolvedValue({ role: 'teacher' }),
    },
  },
}));

describe('ErrorBoundary', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    // React logs the caught error to console.error too; silence it here so
    // test output isn't noisy, while still asserting on our own log call
    // where relevant.
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders children normally when nothing throws', () => {
    render(
      <ErrorBoundary>
        <Fine />
      </ErrorBoundary>
    );
    expect(screen.getByText('all good')).toBeInTheDocument();
  });

  it('shows the Hebrew fallback UI instead of crashing when a child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByText('משהו השתבש')).toBeInTheDocument();
    expect(screen.getByText('חזרה לדף הבית')).toBeInTheDocument();
    expect(screen.getByText('רענון הדף')).toBeInTheDocument();
    // The thing that broke should never be in the tree post-crash.
    expect(screen.queryByText('all good')).not.toBeInTheDocument();
  });

  it('logs the caught error to the console', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[ErrorBoundary] Caught render error:',
      expect.any(Error),
      expect.anything()
    );
  });
});
