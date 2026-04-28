"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type FontSize = "sm" | "md" | "lg";
export type ThemeMode = "system" | "light" | "dark";

interface UIState {
  fontSize: FontSize;
  theme: ThemeMode;
  presentMode: boolean;
  tocOpen: boolean;
  lastSlideId: string | null;
  setFontSize: (s: FontSize) => void;
  setTheme: (t: ThemeMode) => void;
  setPresentMode: (v: boolean) => void;
  togglePresentMode: () => void;
  setTocOpen: (v: boolean) => void;
  setLastSlideId: (id: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      fontSize: "md",
      theme: "system",
      presentMode: false,
      tocOpen: false,
      lastSlideId: null,
      setFontSize: (s) => set({ fontSize: s }),
      setTheme: (t) => set({ theme: t }),
      setPresentMode: (v) => set({ presentMode: v }),
      togglePresentMode: () => set((st) => ({ presentMode: !st.presentMode })),
      setTocOpen: (v) => set({ tocOpen: v }),
      setLastSlideId: (id) => set({ lastSlideId: id }),
    }),
    {
      name: "gradeslide-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        fontSize: s.fontSize,
        theme: s.theme,
        lastSlideId: s.lastSlideId,
      }),
    }
  )
);
