import { create } from 'zustand';

import { State, type User } from 'types';

interface AppState {
  isReady: boolean;
  isHidden: boolean;
  close(): void;

  apiUrl: string;
  appId: string;
  breakpoints: number[];
  setup(state: Pick<AppState, 'apiUrl' | 'appId' | 'breakpoints'>): void;

  user: User;
  start(state: Pick<AppState, 'user'>): void;

  active: State;
  setActive(active: State): void;
}

export const useAppStore = create<AppState>()((set) => ({
  isReady: false,
  isHidden: true,
  close() {
    set({ isHidden: true });
  },

  apiUrl: '',
  appId: '',
  userId: 0,
  breakpoints: [],
  setup(state) {
    set({ isReady: true, ...state });
  },

  user: null as unknown as User,
  start(state) {
    set({ isHidden: false, ...state });
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
