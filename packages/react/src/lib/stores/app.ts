import { create } from 'zustand';

import { State } from 'types';

type Fetcher<T = unknown> = (input: RequestInfo | URL, init?: RequestInit) => Promise<T>;

interface AppState {
  isHidden: boolean;
  fetcher: Fetcher;
  breakpoints: number[];
  load(state: { apiUrl: string; appId: string; userId: string } & Pick<AppState, 'breakpoints'>): void;
  close(): void;

  active: State;
  setActive(active: State): void;
}

export const useAppStore = create<AppState>()((set) => ({
  isHidden: true,
  fetcher: () => Promise.resolve(),
  breakpoints: [],
  load({ apiUrl, appId, userId, ...state }) {
    set({
      isHidden: false,
      fetcher: async (input: RequestInfo | URL, init?: RequestInit) => {
        const headers = { ...(init?.headers || {}), 'Aloy-App-ID': appId, 'Aloy-User-ID': userId };
        const res = await fetch(apiUrl + input, { ...(init || {}), headers });
        return await res.json();
      },
      ...state,
    });
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
