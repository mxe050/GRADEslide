"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSwipeable } from "react-swipeable";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import type { Slide } from "@/lib/types";
import { useUIStore } from "@/lib/store";
import { ProgressBar } from "./ProgressBar";
import { NavBar } from "./NavBar";
import { NavFooter } from "./NavFooter";
import { VisualPanel } from "./VisualPanel";
import { NarrationPanel } from "./NarrationPanel";
import { TableOfContents } from "./TableOfContents";

const slideTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.18, ease: "easeOut" as const },
};

interface Props {
  slide: Slide;
  prevId: string | null;
  nextId: string | null;
  index: number;
  total: number;
}

export function SlideView({ slide, prevId, nextId, index, total }: Props) {
  const router = useRouter();
  const fontSize = useUIStore((s) => s.fontSize);
  const presentMode = useUIStore((s) => s.presentMode);
  const tocOpen = useUIStore((s) => s.tocOpen);
  const setTocOpen = useUIStore((s) => s.setTocOpen);
  const setLastSlideId = useUIStore((s) => s.setLastSlideId);
  const togglePresentMode = useUIStore((s) => s.togglePresentMode);

  useEffect(() => {
    setLastSlideId(slide.id);
  }, [slide.id, setLastSlideId]);

  // Broadcast current slide to /notes window (same-origin BroadcastChannel).
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel("gradeslide-presenter");
    ch.postMessage({ slideId: slide.id });
    return () => ch.close();
  }, [slide.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if (e.key === "Escape") {
        if (tocOpen) {
          setTocOpen(false);
          return;
        }
        if (presentMode) {
          togglePresentMode();
          return;
        }
      }
      if (tocOpen) return;
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        if (nextId) router.push(`/slide/${nextId}`);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (prevId) router.push(`/slide/${prevId}`);
      } else if (e.key === "t" || e.key === "T") {
        setTocOpen(true);
      } else if (e.key === "p" || e.key === "P" || e.key === "f" || e.key === "F") {
        togglePresentMode();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, prevId, nextId, tocOpen, setTocOpen, togglePresentMode, presentMode]);

  const swipe = useSwipeable({
    onSwipedLeft: () => nextId && router.push(`/slide/${nextId}`),
    onSwipedRight: () => prevId && router.push(`/slide/${prevId}`),
    trackMouse: false,
    preventScrollOnSwipe: false,
    delta: 50,
  });

  const fontClass =
    fontSize === "sm" ? "text-scale-sm" : fontSize === "lg" ? "text-scale-lg" : "text-scale-md";

  if (presentMode) {
    return (
      <div
        className={clsx("fixed inset-0 bg-black flex flex-col items-center justify-center overflow-hidden", fontClass)}
        {...swipe}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={slide.id}
            {...slideTransition}
            className="present-stage flex flex-col p-4 sm:p-6 md:p-10 overflow-hidden"
          >
            <div className="flex-1 flex items-center justify-center w-full min-h-0 overflow-hidden">
              <VisualPanel slide={slide} present />
            </div>
            <div className="flex justify-between items-center text-white/60 text-xs md:text-sm pt-2 md:pt-3 border-t border-white/10 mt-2 md:mt-3">
              <span className="truncate">{slide.section}</span>
              <span className="tabular-nums">
                {index + 1} / {total}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
        <div
          className="fixed bottom-0 left-0 h-0.5 bg-[var(--primary)]/70 transition-[width]"
          style={{ width: `${((index + 1) / total) * 100}%` }}
          aria-hidden="true"
        />
        <div className="fixed top-3 right-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              window.open(
                `/notes/${slide.id}`,
                "gradeslide-notes",
                "width=720,height=900,menubar=no,toolbar=no"
              )
            }
            className="text-white/60 hover:text-white text-xs md:text-sm rounded-md px-2 py-1 bg-black/40 backdrop-blur"
            title="講演者ノートを別ウィンドウで開く"
          >
            ノート ↗
          </button>
          <button
            type="button"
            onClick={togglePresentMode}
            className="text-white/60 hover:text-white text-xs md:text-sm rounded-md px-2 py-1 bg-black/40 backdrop-blur"
          >
            講演モード終了 (Esc)
          </button>
        </div>
        {prevId && (
          <button
            type="button"
            onClick={() => router.push(`/slide/${prevId}`)}
            aria-label="前のスライド"
            className="fixed left-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white text-3xl md:text-4xl px-2"
          >
            ‹
          </button>
        )}
        {nextId && (
          <button
            type="button"
            onClick={() => router.push(`/slide/${nextId}`)}
            aria-label="次のスライド"
            className="fixed right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white text-3xl md:text-4xl px-2"
          >
            ›
          </button>
        )}
        <TableOfContents />
      </div>
    );
  }

  return (
    <div className={clsx("flex-1 flex flex-col", fontClass)} {...swipe}>
      <ProgressBar current={index + 1} total={total} />
      <NavBar slide={slide} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={slide.id}
          {...slideTransition}
          className="flex-1 flex flex-col gap-4 md:gap-6 px-3 md:px-6 py-3 md:py-5 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] max-w-[1400px] mx-auto w-full"
        >
          {/* 16:9 stage on top — visible on every device. Container queries
              inside VisualPanel make the typography scale to fit the box, so
              even the small mobile-portrait stage stays readable. */}
          <section className="w-full flex justify-center">
            <div className="reading-stage">
              <VisualPanel slide={slide} />
            </div>
          </section>
          {/* Narration below — comfortable reading width and font size. */}
          <section className="w-full max-w-3xl mx-auto">
            <NarrationPanel slide={slide} />
          </section>
        </motion.main>
      </AnimatePresence>
      <NavFooter prevId={prevId} nextId={nextId} index={index} total={total} />
      <TableOfContents />
    </div>
  );
}
