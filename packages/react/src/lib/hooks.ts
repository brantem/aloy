import { useState, useLayoutEffect, useEffect } from 'react';
import useSWR from 'swr';
import Cookies from 'js-cookie';

import type { User, PinPosition, Pin } from 'types';
import type { User as ExternalUser } from 'types/external';
import { isElementHidden } from 'lib/helpers';
import { useAppStore, usePinStore } from 'lib/stores';

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

export const usePins = () => {
  const r = useCurrentBreakpoint();

  const { data, isLoading } = useSWR<{ nodes: Pin[] }>(`/v1/pins?_path=${window.location.pathname}`);
  const nodes = r
    ? (data?.nodes || []).filter((pin) => {
        if (r.start === 0 && r.end === 0) return true;
        if (r.start === 0 && r.end !== 0) return pin.w <= r.end;
        if (r.start !== 0 && r.end === 0) return pin.w >= r.start;
        return pin.w >= r.start && pin.w <= r.end;
      }) // Filter out pins that shouldn't be visible at the current breakpoints
    : [];

  const { activeId, setActiveId, isActiveIdLocked, selectedCommentId, setSelectedCommentId } = usePinStore((state) => ({
    activeId: state.activeId,
    setActiveId: state.setActiveId,
    isActiveIdLocked: state.isActiveIdLocked,
    selectedCommentId: state.selectedCommentId,
    setSelectedCommentId: state.setSelectedCommentId,
  }));

  return {
    nodes,
    isLoading,

    activeId,
    setActiveId(v: 'first' | number, isLocked = isActiveIdLocked) {
      if (v === 'first') v = nodes[0].id;
      // if v is a negative number, find other id than v * -1 else 0
      if (v < 0) v = nodes.find((node) => node.id !== (v as number) * -1)?.id || 0;

      setActiveId(v, isLocked);

      if (v === 0) return;
      setTimeout(() => {
        const pin = document.getElementById(`__aloy-pin-${v}`);
        if (pin) pin.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }, 0);
    },

    selectedCommentId,
    setSelectedCommentId(v: number) {
      setSelectedCommentId(v);
    },
  } as const;
};

export const useKeyDown = (cb: (e: KeyboardEvent) => void) => {
  useEffect(() => {
    document.addEventListener('keydown', cb);
    return () => document.removeEventListener('keydown', cb);
  }, [cb]);
};

export const useEscape = (cb: () => void) => {
  useKeyDown((e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    cb();
  });
};

export const useActions = () => {
  const { apiUrl, appId, userId } = useAppStore((state) => ({
    apiUrl: state.apiUrl,
    appId: state.appId,
    userId: state.user ? state.user.id.toString() : '',
  }));

  return {
    async saveUser(user: ExternalUser) {
      const key = '__aloy-user';

      let v: User | null = JSON.parse(Cookies.get(key) || 'null');
      if (v && v.name === user.name) return v;

      const res = await fetch(`${apiUrl}/v1/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Aloy-App-ID': appId,
        },
        body: JSON.stringify(user),
      });
      const userId = (await res.json()).user.id;
      if (!userId) return null;

      v = { id: userId, name: user.name };
      Cookies.set(key, JSON.stringify(v), { expires: 1, path: '/' });

      return v;
    },

    async createPin(tempPin: PinPosition, text: string, onSuccess?: () => Promise<void> | void) {
      if (!text) return;
      const res = await fetch(`${apiUrl}/v1/pins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Aloy-App-ID': appId,
          'Aloy-User-ID': userId,
        },
        body: JSON.stringify({ _path: window.location.pathname, ...tempPin, text }),
      });
      if (!res.ok) return;
      await onSuccess?.();
    },
    async completePin(pinId: number, v: boolean, onSuccess?: () => Promise<void> | void) {
      const res = await fetch(`${apiUrl}/v1/pins/${pinId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'Aloy-App-ID': appId,
          'Aloy-User-ID': userId,
        },
        body: v ? '0' : '1',
      });
      if (!res.ok) return;
      await onSuccess?.();
    },
    async deletePin(pinId: number, onSuccess?: () => Promise<void> | void) {
      const res = await fetch(`${apiUrl}/v1/pins/${pinId}`, {
        method: 'DELETE',
        headers: {
          'Aloy-App-ID': appId,
          'Aloy-User-ID': userId,
        },
      });
      if (!res.ok) return;
      await onSuccess?.();
    },

    async createComment(pinId: number, text: string, onSuccess?: () => Promise<void> | void) {
      if (!text) return;
      const res = await fetch(`${apiUrl}/v1/pins/${pinId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Aloy-App-ID': appId,
          'Aloy-User-ID': userId,
        },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return;
      await onSuccess?.();
    },
    async updateComment(commentId: number, text: string, onSuccess?: () => Promise<void> | void) {
      if (!text) return;
      const res = await fetch(`${apiUrl}/v1/comments/${commentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Aloy-App-ID': appId,
          'Aloy-User-ID': userId,
        },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return;
      await onSuccess?.();
    },
    async deleteComment(commentId: number, onSuccess?: () => Promise<void> | void) {
      const res = await fetch(`${apiUrl}/v1/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Aloy-App-ID': appId,
          'Aloy-User-ID': userId,
        },
      });
      if (!res.ok) return;
      await onSuccess?.();
    },
  };
};
