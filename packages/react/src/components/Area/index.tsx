import { useEffect } from 'react';
import { finder } from '@medv/finder';

import AddCommentCard from './AddCommentCard';

import { State } from 'types';
import { useEscape, useWindowSize } from 'lib/hooks';
import { useAppStore, usePinStore } from 'lib/stores';

export default function Area() {
  const size = useWindowSize();

  const close = useAppStore((state) => () => state.setActive(State.Nothing));
  const { tempPin, setTempPin, handleEscape } = usePinStore((state) => ({
    tempPin: state.tempPin,
    setTempPin: state.setTempPin,
    handleEscape() {
      const hadTempPin = !!state.tempPin;
      state.setTempPin(null);
      if (!hadTempPin) close();
    },
  }));

  useEscape(handleEscape);

  useEffect(() => {
    if (!size) return;

    const handleClick = (e: MouseEvent) => {
      if (!e.target) return;
      const path = finder(e.target as Element, { seedMinLength: 4 });
      if (path.includes('__aloy')) return;

      const pin = {
        path, // CSS selector for the pin's parent
        w: size.w, // Current window width
        _x: e.pageX / size.w, // Normalized horizontal click position
        x: 0, // Horizontal position relative to the parent
        _y: e.pageY / size.h, // Normalized vertical click position
        y: 0, // Vertical position relative to the parent
      };
      if (path) {
        const el = document.querySelector(path);
        if (el) {
          const rect = el.getBoundingClientRect();
          pin.x = (e.pageX - window.scrollX - rect.left) / rect.width;
          pin.y = (e.pageY - window.scrollY - rect.top) / rect.height;
        }
      }
      setTempPin(pin);
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [size]);

  if (!tempPin) return null;

  return <AddCommentCard p={tempPin} />;
}
