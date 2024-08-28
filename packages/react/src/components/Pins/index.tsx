import { useMemo } from 'react';

import Pin from './Pin';

import type { Pin as P } from 'types';
import { useDebounce, useCurrentBreakpoint } from 'lib/hooks';

const createdAt = Date.now();

const Pins = () => {
  const { data } = {
    data: {
      pins: [
        {
          id: 1,
          path: 'body > #root .flex:nth-child(11)',
          w: 3008,
          x: 0.024,
          y: 0.238,
          _x: 0.33643617021276595,
          _y: 0.3713257348530294,
          user: {
            id: 'user-1',
            name: 'User 1',
          },
          total_replies: 0,
          completed_at: null,
          comment: {
            id: 1,
            text: 'Test',
            created_at: createdAt,
            updated_at: createdAt,
          },
        },
      ] as P[],
    },
  }; // TODO

  const r = useDebounce(useCurrentBreakpoint(), 100);
  const pins = useMemo(() => {
    if (!r) return [];
    return (data?.pins || []).filter((pin) => {
      if (r.start === 0 && r.end === 0) return true;
      if (r.start === 0 && r.end !== 0) return pin.w <= r.end;
      if (r.start !== 0 && r.end === 0) return pin.w >= r.start;
      return pin.w >= r.start && pin.w <= r.end;
    });
  }, [r]);

  return pins.map((pin) => <Pin key={pin.id} pin={pin} />);
};

export default Pins;
