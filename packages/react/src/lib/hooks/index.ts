import { useState, useLayoutEffect, useEffect } from 'react';

import type { PinPosition } from 'types';
import { isElementHidden } from 'lib/helpers';
import { useAppStore } from 'lib/stores';

export const useDebounce = <T>(a: T, delay: number) => {
  const [b, setB] = useState<T>(a);

  useEffect(() => {
    const t = setTimeout(() => setB(a), delay);
    return () => clearTimeout(t);
  }, [a, delay]);

  return b;
};

export const useWindowSize = () => {
  const [size, setSize] = useState<{ h: number; w: number }>();

  useLayoutEffect(() => {
    const handleResize = () => setSize({ h: window.outerHeight, w: window.outerWidth });
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
};

export const useCurrentBreakpoint = () => {
  const breakpoints = useAppStore((state) => state.breakpoints);
  const w = useDebounce(useWindowSize()?.w || 0, 100);
  if (!breakpoints.length || !w) return null;
  for (let i = breakpoints.length - 1; i >= 0; i--) {
    if (w > breakpoints[i]) return { start: breakpoints[i], end: breakpoints[i + 1] || 0 };
  }
  return { start: 0, end: w };
};

export const usePinPosition = (p: PinPosition) => {
  const size = useWindowSize();
  const [position, setPosition] = useState<{ top: number; left: number }>();

  useEffect(() => {
    if (!p || !size) return;
    const position = { top: p._y * size.h, left: p._x * size.w };
    if (p.path) {
      const el = document.querySelector(p.path);
      if (el && !isElementHidden(el)) {
        const rect = el.getBoundingClientRect();
        position.top = window.scrollY + rect.top + rect.height * p.y;
        position.left = window.scrollX + rect.left + rect.width * p.x;
      }
    }
    setPosition(position);
  }, [p, size]);

  return position;
};
