import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Manages overlay (Dialog/Drawer/Sheet) open state via URL search params
 * so the hardware back button can intercept and close overlays cleanly
 * instead of navigating away from the page.
 *
 * Opening pushes a new history entry (back button closes the overlay);
 * closing replaces the current entry (no extra back step).
 *
 * @param {string} paramKey - URL search param key (default 'dialog')
 * @returns {{ current: string|null, isOpen: (name: string) => boolean, open: (name: string) => void, close: () => void }}
 */
export function useUrlOverlay(paramKey = 'dialog') {
  const [searchParams, setSearchParams] = useSearchParams();
  const current = searchParams.get(paramKey);

  const open = useCallback((name) => {
    const next = new URLSearchParams(searchParams);
    next.set(paramKey, name);
    setSearchParams(next, { replace: false });
  }, [searchParams, setSearchParams, paramKey]);

  const close = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete(paramKey);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, paramKey]);

  const isOpen = useCallback((name) => current === name, [current]);

  return { current, isOpen, open, close };
}