import { create } from 'zustand';

import { type PinPosition } from 'types';

interface PinState {
  hoveredId: number;
  setHoveredId(hoveredId: number): void;

  activeId: number;
  setActiveId(activeId: number, isLocked?: boolean): void;

  isActiveIdLocked: boolean;
  setIsActiveIdLocked(isActiveIdLocked: boolean): void;

  tempPin: PinPosition | null;
  setTempPin(position: PinPosition | null): void;

  reset(): void;
}

const defaultState = {
  hoveredId: 0,
  activeId: 0,
  isActiveIdLocked: false,
  tempPin: null,
};

export const usePinStore = create<PinState>()((set) => ({
  ...defaultState,

  setHoveredId(hoveredId) {
    set({ hoveredId });
  },
  setActiveId(activeId, isLocked) {
    if (isLocked !== undefined) {
      set({ hoveredId: 0, activeId, isActiveIdLocked: isLocked });
    } else {
      set({ hoveredId: 0, activeId });
    }
  },
  setIsActiveIdLocked(isActiveIdLocked) {
    set({ isActiveIdLocked });
  },
  setTempPin(tempPin) {
    set({ tempPin });
  },
  reset() {
    set(defaultState);
  },
}));
