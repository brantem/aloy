import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { User } from 'types/external';

interface UserState {
  user: User | null;
  setUser(user: User): void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      setUser(user) {
        set({ user });
      },
    }),
    {
      name: '__aloy-user',
    },
  ),
);
