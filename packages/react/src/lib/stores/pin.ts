import { create } from 'zustand';

import { type PinPosition } from 'types';

interface PinState {
  hoveredId: number;
  setHoveredId(hoveredId: number): void;

  activeId: number;
  isActiveIdLocked: boolean;
  setActiveId(activeId: number, isLocked?: boolean): void;

  tempPin: PinPosition | null;
  setTempPin(position: PinPosition | null): void;

  reset(): void;
}

export const usePinStore = create<PinState>()((set) => ({
  hoveredId: 0,
  setHoveredId(hoveredId) {
    set({ hoveredId });
  },

  activeId: 0,
  // when isActiveIdLocked === true, both the root and comments are visible;
  // otherwise, only the root is visible.
  isActiveIdLocked: false,
  setActiveId(activeId, isLocked) {
    if (isLocked !== undefined) {
      set({ hoveredId: 0, activeId, isActiveIdLocked: isLocked });
    } else {
      set({ hoveredId: 0, activeId });
    }
  },

  tempPin: null,
  setTempPin(tempPin) {
    set({ tempPin });
  },

  reset() {
    set({ isActiveIdLocked: false, tempPin: null });
  },
}));
