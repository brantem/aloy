import { create } from 'zustand';

import { Config, State, type User } from 'types';

interface AppState {
  isReady: boolean;
  isHidden: boolean;
  close(): void;

  apiUrl: string;
  appId: string;
  config: Config;
  setup(state: Pick<AppState, 'apiUrl' | 'appId' | 'config'>): void;

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
  config: {
    breakpoints: [],
    attachment: {
      maxCount: 0,
      maxSize: 0,
      supportedTypes: [],
    },
  },
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
