"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Slide } from "@/lib/types";
import { MarkdownText } from "./MarkdownText";

interface Props {
  slide: Slide;
  index: number;
  total: number;
}

const CHANNEL_NAME = "gradeslide-presenter";

export function NotesView({ slide, index, total }: Props) {
  const router = useRouter();

  // Listen for slide-change broadcasts from the presenter window.
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel(CHANNEL_NAME);
    ch.onmessage = (ev) => {
      const target = ev.data?.slideId;
      if (typeof target === "string" && target !== slide.id) {
        router.replace(`/notes/${target}`);
      }
    };
    return () => ch.close();
  }, [router, slide.id]);

  return (
    <div className="min-h-svh bg-[var(--background)] text-[var(--foreground)] flex flex-col">
      <header className="sticky top-0 z-10 bg-[var(--background)]/85 backdrop-blur-md border-b border-[var(--card-border)]">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[var(--muted)] truncate">{slide.section}</p>
            <h1 className="text-base md:text-lg font-bold truncate">
              {slide.id} · {slide.title}
            </h1>
          </div>
          <span className="text-xs text-[var(--muted)] tabular-nums whitespace-nowrap">
            {index + 1} / {total}
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-6 py-6 md:py-8 space-y-6">
        {slide.warnings && slide.warnings.length > 0 && (
          <aside className="rounded-lg border border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-fg)] px-3 py-2 text-sm">
            <strong className="block mb-1">⚠ 注意</strong>
            <ul className="list-disc pl-5 space-y-1">
              {slide.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </aside>
        )}

        <section>
          <h2 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
            解説
          </h2>
          <div className="text-base md:text-lg leading-relaxed">
            <MarkdownText text={slide.narration} />
          </div>
        </section>

        {slide.speakerNotes && (
          <section className="pt-4 border-t border-dashed border-[var(--card-border)]">
            <h2 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
              講演者ノート
            </h2>
            <p className="whitespace-pre-line text-sm md:text-base text-[var(--foreground)]">
              {slide.speakerNotes}
            </p>
          </section>
        )}
      </main>

      <footer className="text-xs text-[var(--muted)] text-center py-3 border-t border-[var(--card-border)]">
        講演中はこのウィンドウのスライドが自動で同期します (同一ブラウザ内)
      </footer>
    </div>
  );
}
