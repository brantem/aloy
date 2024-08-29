import { create } from 'zustand';

import { State, type User } from 'types';

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type DeepNonNullable<T> = {
  [K in keyof T]: DeepNonNullable<T[K] & {}>;
};

interface AppState {
  isHidden: boolean;
  close(): void;

  fetcher: Fetcher;
  user: User;
  setUser(user: User): void;
  breakpoints: number[];
  load(state: { apiUrl: string; appId: string } & DeepNonNullable<Pick<AppState, 'user' | 'breakpoints'>>): void;

  active: State;
  setActive(active: State): void;
}

export const useAppStore = create<AppState>()((set) => ({
  isHidden: true,
  close() {
    set({ isHidden: true });
  },

  fetcher() {
    return Promise.resolve(new Response());
  },
  user: null as unknown as User,
  setUser(user) {
    set({ user });
  },
  breakpoints: [],
  load({ apiUrl, appId, ...state }) {
    set({
      isHidden: false,
      async fetcher(input, init) {
        const headers = { ...(init?.headers || {}), 'Aloy-App-ID': appId, 'Aloy-User-ID': state.user.id.toString() };
        return fetch(apiUrl + input, { ...(init || {}), headers });
      },
      ...state,
    });
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
