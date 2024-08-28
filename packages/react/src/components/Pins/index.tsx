import { useMemo } from 'react';
import useSWR from 'swr';

import Pin from './Pin';

import type { Pin as P } from 'types';
import { useDebounce, useCurrentBreakpoint } from 'lib/hooks';

const Pins = () => {
  const { data } = useSWR<{ nodes: P[] }>(`/pins?_path=${window.location.pathname}`);

  const r = useDebounce(useCurrentBreakpoint(), 100);
  const pins = useMemo(() => {
    if (!r) return [];
    return (data?.nodes || []).filter((pin) => {
      if (r.start === 0 && r.end === 0) return true;
      if (r.start === 0 && r.end !== 0) return pin.w <= r.end;
      if (r.start !== 0 && r.end === 0) return pin.w >= r.start;
      return pin.w >= r.start && pin.w <= r.end;
    });
  }, [r]);

  return pins.map((pin) => <Pin key={pin.id} pin={pin} />);
};

export default Pins;
