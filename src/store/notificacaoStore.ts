import { create } from "zustand";

interface NotificacaoStore {
  novosCount: number;
  setNovosCount: (count: number) => void;
  incrementNovos: () => void;
  decrementNovos: () => void;
  reset: () => void;
}

export const useNotificacaoStore = create<NotificacaoStore>((set) => ({
  novosCount: 0,
  setNovosCount: (count) => set({ novosCount: count }),
  incrementNovos: () => set((s) => ({ novosCount: s.novosCount + 1 })),
  decrementNovos: () =>
    set((s) => ({ novosCount: Math.max(0, s.novosCount - 1) })),
  reset: () => set({ novosCount: 0 }),
}));
