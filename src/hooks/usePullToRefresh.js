import { useRef, useEffect, useState } from 'react';

const THRESHOLD = 72; // px to pull before triggering
const RESISTANCE = 2.5;

export function usePullToRefresh(onRefresh) {
  const [pulling, setPulling] = useState(false);
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Tag the container so global touch-action rules can exempt it
    el.setAttribute('data-pull-to-refresh', '');

    function onTouchStart(e) {
      // Only intercept when the container is scrolled to exactly 0
      if (el.scrollTop !== 0) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0].clientY;
    }

    function onTouchMove(e) {
      if (startY.current === null) return;
      // Re-check scrollTop in case the user scrolled between touchstart and touchmove
      if (el.scrollTop > 0) {
        startY.current = null;
        setPullY(0);
        setPulling(false);
        return;
      }
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) { setPullY(0); setPulling(false); return; }
      e.preventDefault();
      setPulling(true);
      setPullY(Math.min(dy / RESISTANCE, THRESHOLD * 1.5));
    }

    async function onTouchEnd() {
      if (startY.current === null) return;
      if (pullY >= THRESHOLD && !refreshing) {
        setRefreshing(true);
        setPullY(THRESHOLD);
        try { await onRefresh(); } finally { setRefreshing(false); }
      }
      setPulling(false);
      setPullY(0);
      startY.current = null;
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [pullY, pulling, refreshing, onRefresh]);

  return { containerRef, pullY, pulling, refreshing };
}