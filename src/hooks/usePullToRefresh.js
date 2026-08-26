import { useRef, useEffect, useState, useCallback } from 'react';

const THRESHOLD = 72; // px to pull before triggering
const RESISTANCE = 2.5;

export function usePullToRefresh(onRefresh, options = {}) {
  const [pulling, setPulling] = useState(false);
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const containerRef = useRef(null);
  const startY = useRef(null);
  const pullingRef = useRef(false);
  const pullYRef = useRef(0);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  const optionsRef = useRef(options);

  // Keep the latest callback without re-attaching listeners
  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);
  useEffect(() => { optionsRef.current = options; }, [options]);

  // Sync display state from refs (batched, minimal re-renders)
  const flush = useCallback(() => {
    if (pullingRef.current !== pulling) setPulling(pullingRef.current);
    if (pullYRef.current !== pullY) setPullY(pullYRef.current);
  }, [pulling, pullY]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Tag the container so global touch-action rules can exempt it
    el.setAttribute('data-pull-to-refresh', '');

    // The actual scroll container is the <main> element in AppLayout.
    // The page container itself should NOT be a scroll container —
    // we check scrollTop on main to know if we're at the top.
    const scrollContainer = el.closest('main') || el;

    function onTouchStart(e) {
      // Only intercept when the scroll container is at the top
      if (scrollContainer.scrollTop !== 0) {
        startY.current = null;
        return;
      }
      // If a page-level pull-to-refresh container exists inside the scroll
      // container, let it handle the gesture exclusively (avoids a double
      // trigger when AppLayout also wires a global pull-to-refresh).
      if (optionsRef.current.skipIfChildPTR && scrollContainer.querySelector && scrollContainer.querySelector('[data-pull-to-refresh]')) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0].clientY;
    }

    function onTouchMove(e) {
      if (startY.current === null) return;
      // Re-check scrollTop in case the user scrolled between touchstart and touchmove
      if (scrollContainer.scrollTop > 0) {
        startY.current = null;
        if (pullYRef.current !== 0) { pullYRef.current = 0; pullingRef.current = false; flush(); }
        return;
      }
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        if (pullYRef.current !== 0) { pullYRef.current = 0; pullingRef.current = false; flush(); }
        return;
      }
      // NOTE: we intentionally do NOT call preventDefault here.
      // On Android WebView, a single preventDefault on a non-passive touchmove
      // locks the whole gesture and suppresses native scrolling in BOTH
      // directions until the finger is lifted — making the top of the page
      // feel unresponsive ("can't scroll up/down from the top"). Instead we
      // track the pull distance for our indicator and let native scrolling
      // run freely; overscroll-behavior-y: contain (set on <main> and the
      // data-pull-to-refresh container) suppresses the browser's own
      // pull-to-refresh / overscroll glow.
      pullingRef.current = true;
      pullYRef.current = Math.min(dy / RESISTANCE, THRESHOLD * 1.5);
      flush();
    }

    function onTouchEnd() {
      if (startY.current === null) return;
      const triggered = pullYRef.current >= THRESHOLD && !refreshingRef.current;
      startY.current = null;

      if (triggered) {
        refreshingRef.current = true;
        pullYRef.current = THRESHOLD;
        setRefreshing(true);
        setPullY(THRESHOLD);

        Promise.resolve(onRefreshRef.current ? onRefreshRef.current() : undefined)
          .finally(() => {
            refreshingRef.current = false;
            pullYRef.current = 0;
            setRefreshing(false);
            setPullY(0);
          });
      } else {
        pullingRef.current = false;
        pullYRef.current = 0;
        setPulling(false);
        setPullY(0);
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [flush]);

  return { containerRef, pullY, pulling, refreshing };
}