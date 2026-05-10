"use client";

import clsx from "clsx";
import type { Citation, Slide } from "@/lib/types";
import { getCitation } from "@/lib/slides";
import { MarkdownText } from "./MarkdownText";
import { GSenseiGuide } from "./GSenseiGuide";

interface Props {
  slide: Slide;
}

export function NarrationPanel({ slide }: Props) {
  const cites: Citation[] = (slide.citationIds ?? [])
    .map((id) => getCitation(id))
    .filter((c): c is Citation => Boolean(c));
  return (
    <div className="fade-in flex flex-col gap-3 md:gap-5 rounded-xl md:rounded-2xl bg-[var(--card)] border border-[var(--card-border)] px-4 py-4 md:px-7 md:py-7 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] md:text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
          解説（G先生より）
        </h3>
        <span className="text-[10px] md:text-xs text-[var(--muted-soft)] font-medium">
          {slide.id}
        </span>
      </div>

      {slide.warnings && slide.warnings.length > 0 && (
        <div className="rounded-lg border border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-fg)] px-3.5 py-2.5 md:px-4 md:py-3 text-[15px] md:text-base flex gap-3">
          <span aria-hidden="true" className="text-lg shrink-0">⚠️</span>
          <ul className="list-none flex-1 space-y-1.5 leading-relaxed">
            {slide.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <GSenseiGuide slide={slide} variant="narration" />

      <div className="narration-body text-[16.5px] md:text-lg text-[var(--foreground)]">
        <MarkdownText text={slide.narration} />
      </div>

      {cites.length > 0 && (
        <section className="mt-3 pt-4 border-t border-[var(--card-border)]">
          <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
            参考文献
          </h3>
          <ol className="list-decimal pl-6 space-y-2 text-sm md:text-base text-[var(--muted)] leading-relaxed">
            {cites.map((c) => (
              <li key={c.id} id={`ref-${c.id}`}>
                {c.url ? (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={clsx(
                      "text-[var(--primary)] hover:underline break-words"
                    )}
                  >
                    {c.source}
                  </a>
                ) : (
                  <span className="break-words">{c.source}</span>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {slide.speakerNotes && (
        <details className="mt-2 text-sm md:text-base text-[var(--muted)] border-t border-dashed border-[var(--card-border)] pt-4">
          <summary className="cursor-pointer hover:text-[var(--foreground)] font-medium">
            講演者ノートを表示
          </summary>
          <p className="mt-3 whitespace-pre-line leading-relaxed">{slide.speakerNotes}</p>
        </details>
      )}
    </div>
  );
}
