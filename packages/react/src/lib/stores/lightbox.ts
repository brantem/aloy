import { create } from 'zustand';

import type { Attachment } from 'types';

interface LightboxState {
  attachments: Attachment[];

  isOpen: boolean;
  show(attachments: Attachment[], defaultIndex?: number): void;
  hide(): void;

  index: number;
  setIndex(index: number): void;
}

export const useLightboxStore = create<LightboxState>()((set) => ({
  attachments: [],

  isOpen: false,
  show(attachments, defaultIndex = 0) {
    set({ attachments, isOpen: true, index: defaultIndex });
  },
  hide() {
    set({ attachments: [], isOpen: false, index: 0 });
  },

  index: 0,
  setIndex(index) {
    set({ index });
  },
}));
