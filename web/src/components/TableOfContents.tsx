"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUIStore } from "@/lib/store";
import { getAllSlides, getAppData } from "@/lib/slides";
import clsx from "clsx";

export function TableOfContents() {
  const { tocOpen, setTocOpen } = useUIStore();
  const router = useRouter();
  const pathname = usePathname();
  const data = getAppData();
  const allSlides = getAllSlides();

  useEffect(() => {
    if (tocOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [tocOpen]);

  if (!tocOpen) return null;

  const currentId = pathname?.split("/").pop();

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-stretch md:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="目次"
      onClick={() => setTocOpen(false)}
    >
      <div
        className="relative w-full md:max-w-2xl md:max-h-[85vh] bg-[var(--card)] md:rounded-2xl border-t md:border border-[var(--card-border)] shadow-2xl overflow-hidden flex flex-col mt-auto md:mt-0"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-[var(--card-border)]">
          <h2 className="text-lg font-semibold">目次</h2>
          <button
            type="button"
            onClick={() => setTocOpen(false)}
            className="rounded-md w-9 h-9 inline-flex items-center justify-center hover:bg-[var(--card-border)]/60"
            aria-label="閉じる"
          >
            ✕
          </button>
        </header>
        <div className="overflow-y-auto p-2 md:p-4">
          {data.meta.sections.map((sec) => {
            const slidesInSec = allSlides.filter((s) => s.section === sec.title);
            const isPlaceholder = slidesInSec.length === 0;
            return (
              <div key={sec.id} className="mb-3 last:mb-0">
                <h3
                  className={clsx(
                    "px-3 py-1.5 text-sm font-bold tracking-tight",
                    isPlaceholder ? "text-[var(--muted)]" : "text-[var(--primary)]"
                  )}
                >
                  {sec.title}
                </h3>
                {isPlaceholder ? (
                  <p className="px-3 py-2 text-xs text-[var(--muted)] italic">
                    （Step 2 以降で追加予定）
                  </p>
                ) : (
                  <ol className="space-y-0.5">
                    {slidesInSec.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setTocOpen(false);
                            router.push(`/slide/${s.id}`);
                          }}
                          className={clsx(
                            "w-full text-left px-3 py-2 rounded-md text-sm flex gap-3 items-start transition-colors",
                            currentId === s.id
                              ? "bg-[var(--primary)]/15 text-[var(--primary)] font-semibold"
                              : "hover:bg-[var(--card-border)]/40"
                          )}
                        >
                          <span className="tabular-nums text-[var(--muted)] w-10 shrink-0 text-right">
                            {s.id}
                          </span>
                          <span className="flex-1">{s.title}</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            );
          })}
        </div>
        <footer className="px-4 md:px-6 py-3 border-t border-[var(--card-border)] text-xs text-[var(--muted)] flex justify-between">
          <span>
            v{data.meta.version} · {allSlides.length} スライド
          </span>
          <span className="hidden md:inline">Esc で閉じる</span>
        </footer>
      </div>
    </div>
  );
}
