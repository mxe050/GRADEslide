"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import clsx from "clsx";
import { useUIStore } from "@/lib/store";
import { useEditStore, mergeSlide, type SlideOverlay } from "@/lib/editStore";
import type { Slide } from "@/lib/types";
import type { ThemeMode } from "@/lib/store";
import { getFirstSlide, getSlideById, getAllSlides, getAppData } from "@/lib/slides";

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
  const editMode = useEditStore((s) => s.editMode);
  const toggleEditMode = useEditStore((s) => s.toggleEditMode);
  const overlays = useEditStore((s) => s.overlays);
  const clearAll = useEditStore((s) => s.clearAll);
  const overlayCount = Object.keys(overlays).length;
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
          <EditToggle
            editMode={editMode}
            onToggle={toggleEditMode}
            overlayCount={overlayCount}
            onExport={() => exportMergedSlidesJson(overlays)}
            onClearAll={clearAll}
          />
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
      {editMode && (
        <div className="bg-[var(--primary-soft)]/60 border-b border-[var(--primary-soft)] text-[var(--primary-hover)] text-[11px] md:text-xs px-3 md:px-6 py-1.5 flex items-center gap-2 justify-center">
          <span aria-hidden="true">✎</span>
          <span className="font-bold">編集モード</span>
          <span>右下の 「文字を編集」 ボタンで現在のスライドを編集</span>
          {overlayCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[var(--primary)] text-white text-[10px] font-bold tabular-nums">
              {overlayCount} 件編集中
            </span>
          )}
        </div>
      )}
    </header>
  );
}

function EditToggle({
  editMode,
  onToggle,
  overlayCount,
  onExport,
  onClearAll,
}: {
  editMode: boolean;
  onToggle: () => void;
  overlayCount: number;
  onExport: () => void;
  onClearAll: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={editMode}
        title={editMode ? "編集モードを終了" : "編集モードに入る"}
        aria-label={editMode ? "編集モードを終了" : "編集モードに入る"}
        className={clsx(
          "inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
          editMode
            ? "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
            : "hover:bg-[var(--card-border)]/60"
        )}
      >
        <span aria-hidden="true">✎</span>
        <span className="hidden sm:inline">{editMode ? "編集中" : "編集"}</span>
        {overlayCount > 0 && !editMode && (
          <span className="ml-0.5 inline-block min-w-4 h-4 px-1 rounded-full bg-[var(--primary)] text-white text-[10px] leading-4 font-bold tabular-nums">
            {overlayCount}
          </span>
        )}
      </button>
      {editMode && (
        <>
          <button
            type="button"
            onClick={onExport}
            disabled={overlayCount === 0}
            title={
              overlayCount === 0
                ? "編集が無いのでエクスポートできません"
                : "編集を反映した slides.json をダウンロード"
            }
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium border border-[var(--card-border)] hover:bg-[var(--card-border)]/60 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span aria-hidden="true">📥</span>
            <span className="hidden sm:inline">JSON</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (overlayCount === 0) return;
              if (
                window.confirm(
                  `${overlayCount} 件の編集をすべて破棄して元の状態に戻します。よろしいですか？`
                )
              ) {
                onClearAll();
              }
            }}
            disabled={overlayCount === 0}
            title="全ての編集を破棄"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium border border-[var(--card-border)] text-[var(--bad)] hover:bg-[var(--bad-soft)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span aria-hidden="true">🗑</span>
          </button>
        </>
      )}
    </div>
  );
}

/**
 * Build a merged slides.json from the original AppData + per-slide overlays
 * and download it. The original public/data/slides.json is not modified —
 * the user commits the downloaded file manually if they want to persist.
 */
function exportMergedSlidesJson(overlays: Record<string, SlideOverlay>) {
  const app = getAppData();
  const merged = {
    ...app,
    slides: getAllSlides().map((s) => mergeSlide(s, overlays[s.id])),
  };
  const json = JSON.stringify(merged, null, 2) + "\n";
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const stamp = new Date()
    .toISOString()
    .replace(/[:T]/g, "-")
    .slice(0, 16);
  const a = document.createElement("a");
  a.href = url;
  a.download = `slides.edited.${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
  const sizes: { v: "sm" | "md" | "lg"; label: string; scale: string }[] = [
    { v: "sm", label: "小", scale: "text-[11px]" },
    { v: "md", label: "中", scale: "text-[14px]" },
    { v: "lg", label: "大", scale: "text-[18px]" },
  ];
  return (
    <div
      role="group"
      aria-label="文字サイズ"
      className="inline-flex items-center rounded-md border border-[var(--card-border)] overflow-hidden"
    >
      {sizes.map((s) => {
        const isActive = current === s.v;
        return (
          <button
            key={s.v}
            type="button"
            onClick={() => onChange(s.v)}
            aria-pressed={isActive}
            className={clsx(
              "inline-flex items-center justify-center w-8 h-9 leading-none font-bold transition-colors",
              s.scale,
              isActive
                ? "bg-[var(--primary)] text-white"
                : "bg-transparent text-[var(--foreground)] hover:bg-[var(--card-border)]/60"
            )}
            title={`文字サイズ: ${s.label}`}
            aria-label={`文字サイズ${s.label}`}
          >
            A{s.label}
          </button>
        );
      })}
    </div>
  );
}
