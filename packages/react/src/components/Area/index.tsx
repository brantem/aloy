import { useEffect } from 'react';
import { finder } from '@medv/finder';

import AddCommentCard from './AddCommentCard';

import { State } from 'types';
import { useWindowSize } from 'lib/hooks';
import { useAppStore, usePinStore } from 'lib/stores';

export default function Area() {
  const size = useWindowSize();
  const close = useAppStore((state) => () => state.setActive(State.Nothing));
  const { tempPin, setTempPin, handleEscape } = usePinStore((state) => ({
    tempPin: state.tempPin,
    setTempPin: state.setTempPin,
    handleEscape: () => {
      const hadTempPin = !!state.tempPin;
      state.setTempPin(null);
      if (!hadTempPin) close();
    },
  }));

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      handleEscape();
    };

    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  }, [tempPin]);

  useEffect(() => {
    if (!size) return;

    const handleClick = (e: MouseEvent) => {
      if (!e.target) return;
      const path = finder(e.target as Element, { seedMinLength: 4 });
      if (path.includes('__aloy')) return;

      const pin = { path, w: size.w, _x: e.pageX / size.w, x: 0, _y: e.pageY / size.h, y: 0 };
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
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [size]);

  if (!tempPin) return null;
  return <AddCommentCard p={tempPin} />;
}
