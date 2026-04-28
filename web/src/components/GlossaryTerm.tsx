"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { GlossaryEntry } from "@/lib/glossary";

interface Props {
  entry: GlossaryEntry;
  children: React.ReactNode;
}

export function GlossaryTerm({ entry, children }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-describedby={open ? popoverId : undefined}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="border-b border-dotted border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-sm px-0.5 transition-colors cursor-help"
      >
        {children}
      </button>
      {open && (
        <span
          id={popoverId}
          role="tooltip"
          className="absolute z-40 left-0 top-full mt-1 w-64 md:w-80 max-w-[90vw] rounded-lg border border-[var(--card-border)] bg-[var(--card)] shadow-lg p-3 text-sm leading-relaxed"
        >
          <strong className="block text-[var(--primary)] font-bold mb-1">
            {entry.term}
          </strong>
          <span className="block text-[var(--foreground)]">
            {entry.definition}
          </span>
        </span>
      )}
    </span>
  );
}
