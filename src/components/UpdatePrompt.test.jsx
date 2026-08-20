import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UpdatePrompt from '@/components/UpdatePrompt';

// virtual:pwa-register/react is a Vite build-time virtual module supplied by
// vite-plugin-pwa (see vite.config.js) — it doesn't exist as a real file, so
// Vitest can't resolve it without this mock. useRegisterSW is mutable per
// test via mockReturnValue so we can drive needRefresh in either direction.
const mockUpdateServiceWorker = vi.fn();
const mockUseRegisterSW = vi.fn();

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: (...args) => mockUseRegisterSW(...args),
}));

function setNeedRefresh(value) {
  const setNeedRefreshSpy = vi.fn();
  mockUseRegisterSW.mockReturnValue({
    needRefresh: [value, setNeedRefreshSpy],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: mockUpdateServiceWorker,
  });
  return setNeedRefreshSpy;
}

afterEach(() => {
  // mockUpdateServiceWorker is shared across tests in this file (it's the
  // one we assert calls on) — reset its call history so an earlier test's
  // click doesn't leak into a later test's "not called" assertion.
  mockUpdateServiceWorker.mockClear();
});

describe('UpdatePrompt', () => {
  it('renders nothing when no update is available', () => {
    setNeedRefresh(false);
    const { container } = render(<UpdatePrompt />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the update banner when needRefresh is true', () => {
    setNeedRefresh(true);
    render(<UpdatePrompt />);
    expect(screen.getByText('גרסה חדשה זמינה')).toBeInTheDocument();
    expect(screen.getByText('עדכון עכשיו')).toBeInTheDocument();
    expect(screen.getByText('מאוחר יותר')).toBeInTheDocument();
  });

  it('calls updateServiceWorker(true) when "עדכון עכשיו" is clicked', async () => {
    setNeedRefresh(true);
    render(<UpdatePrompt />);
    await userEvent.click(screen.getByText('עדכון עכשיו'));
    expect(mockUpdateServiceWorker).toHaveBeenCalledWith(true);
  });

  it('dismisses the banner via setNeedRefresh(false) when "מאוחר יותר" is clicked, without forcing an update', async () => {
    const setNeedRefreshSpy = setNeedRefresh(true);
    render(<UpdatePrompt />);
    await userEvent.click(screen.getByText('מאוחר יותר'));
    expect(setNeedRefreshSpy).toHaveBeenCalledWith(false);
    expect(mockUpdateServiceWorker).not.toHaveBeenCalled();
  });

  it('dismisses the banner via the close (X) button, without forcing an update', async () => {
    const setNeedRefreshSpy = setNeedRefresh(true);
    render(<UpdatePrompt />);
    await userEvent.click(screen.getByLabelText('סגור'));
    expect(setNeedRefreshSpy).toHaveBeenCalledWith(false);
    expect(mockUpdateServiceWorker).not.toHaveBeenCalled();
  });
});
