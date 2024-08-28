import { create } from 'zustand';

import { State } from 'types';

interface AppState {
  isHidden: boolean;
  breakpoints: number[];
  load(state: Pick<AppState, 'breakpoints'>): void;
  close(): void;

  active: State;
  setActive(active: State): void;
}

export const useAppStore = create<AppState>()((set) => ({
  isHidden: true,
  breakpoints: [],
  load(state) {
    set({ isHidden: false, ...state });
  },
  close() {
    set({ isHidden: true });
  },

  active: State.Nothing,
  setActive(active) {
    set({ active });
    if (active === State.AddComment) {
      document.body.style.cursor = 'copy';
    } else {
      document.body.style.cursor = 'default';
    }
  },
}));
