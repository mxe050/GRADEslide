"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useUIStore } from "@/lib/store";
import type { Slide } from "@/lib/types";
import type { ThemeMode } from "@/lib/store";
import { getFirstSlide, getSlideById } from "@/lib/slides";

interface Props {
  slide: Slide;
}

// Subscribe to Zustand persist hydration so we render the resume button only
// after localStorage has been read (avoids SSR/CSR mismatch).
function useStoreHydrated(): boolean {
  return useSyncExternalStore(
    (cb) => useUIStore.persist.onFinishHydration(cb),
    () => useUIStore.persist.hasHydrated(),
    () => false
  );
}

export function NavBar({ slide }: Props) {
  const { setTocOpen, fontSize, setFontSize, togglePresentMode, theme, setTheme } =
    useUIStore();
  const lastSlideId = useUIStore((s) => s.lastSlideId);
  const hydrated = useStoreHydrated();
  const firstId = getFirstSlide().id;

  const resumeTarget =
    hydrated &&
    lastSlideId &&
    lastSlideId !== slide.id &&
    getSlideById(lastSlideId)
      ? lastSlideId
      : null;

  return (
    <header className="sticky top-0 z-30 bg-[var(--background)]/85 backdrop-blur-md border-b border-[var(--card-border)]">
      <div className="max-w-[1400px] mx-auto px-3 md:px-6 h-12 md:h-14 flex items-center gap-2 md:gap-4">
        <button
          type="button"
          onClick={() => setTocOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium hover:bg-[var(--card-border)]/60 transition-colors"
          aria-label="目次を開く"
        >
          <span aria-hidden="true">☰</span>
          <span className="hidden sm:inline">目次</span>
        </button>

        <Link
          href={`/slide/${firstId}`}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium hover:bg-[var(--card-border)]/60 transition-colors"
          aria-label="最初のスライドに戻る"
        >
          <span aria-hidden="true">⏮</span>
          <span className="hidden sm:inline">最初</span>
        </Link>

        {resumeTarget && (
          <Link
            href={`/slide/${resumeTarget}`}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
            aria-label={`前回の続き (${resumeTarget}) へ移動`}
            title={`前回見ていた ${resumeTarget} へ`}
          >
            <span aria-hidden="true">⤴</span>
            <span className="hidden sm:inline">続き ({resumeTarget})</span>
          </Link>
        )}

        <div className="flex-1 min-w-0 text-center text-xs md:text-sm text-[var(--muted)] truncate px-2">
          <span className="font-medium text-[var(--foreground)]">{slide.section}</span>
        </div>

        <div className="flex items-center gap-1">
          <FontSizeToggle current={fontSize} onChange={setFontSize} />
          <ThemeToggle current={theme} onChange={setTheme} />
          <button
            type="button"
            onClick={togglePresentMode}
            className="hidden md:inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium hover:bg-[var(--card-border)]/60 transition-colors"
            aria-label="講演モードを切り替え"
            title="講演モード (P)"
          >
            <span aria-hidden="true">▶</span>
            <span>講演</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function ThemeToggle({
  current,
  onChange,
}: {
  current: ThemeMode;
  onChange: (t: ThemeMode) => void;
}) {
  const next: ThemeMode =
    current === "system" ? "light" : current === "light" ? "dark" : "system";
  const icon = current === "light" ? "☀" : current === "dark" ? "☾" : "◐";
  const label =
    current === "light" ? "ライト" : current === "dark" ? "ダーク" : "システム";
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      className="inline-flex items-center justify-center rounded-md w-9 h-9 text-base hover:bg-[var(--card-border)]/60 transition-colors"
      aria-label={`配色テーマ: 現在 ${label}。切り替え`}
      title={`配色: ${label}`}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}

function FontSizeToggle({
  current,
  onChange,
}: {
  current: "sm" | "md" | "lg";
  onChange: (s: "sm" | "md" | "lg") => void;
}) {
  const next = current === "sm" ? "md" : current === "md" ? "lg" : "sm";
  const label = current === "sm" ? "小" : current === "md" ? "中" : "大";
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      className="inline-flex items-center justify-center rounded-md w-9 h-9 text-sm font-medium hover:bg-[var(--card-border)]/60 transition-colors"
      aria-label={`文字サイズ: 現在 ${label}。切り替え`}
      title="文字サイズ"
    >
      A{label}
    </button>
  );
}
