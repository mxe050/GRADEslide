"use client";

import { useEffect } from "react";
import { useUIStore } from "@/lib/store";

export function ThemeSync() {
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") {
      delete root.dataset.theme;
    } else {
      root.dataset.theme = theme;
    }
  }, [theme]);

  return null;
}
