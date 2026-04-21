"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type ThemeState = {
  isDark: boolean;
  toggle: () => void;
  hydrate: () => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      isDark: false,
      toggle: () => {
        const next = !get().isDark;
        set({ isDark: next });
        if (typeof document !== "undefined") {
          document.documentElement.classList.toggle("dark", next);
        }
      },
      hydrate: () => {
        if (typeof document !== "undefined") {
          document.documentElement.classList.toggle("dark", get().isDark);
        }
      },
    }),
    { name: "reviewpulse-theme" },
  ),
);
