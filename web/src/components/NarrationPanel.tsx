"use client";

import type { Citation, Slide } from "@/lib/types";
import { getCitation } from "@/lib/slides";
import { MarkdownText } from "./MarkdownText";

interface Props {
  slide: Slide;
}

export function NarrationPanel({ slide }: Props) {
  const cites: Citation[] = (slide.citationIds ?? [])
    .map((id) => getCitation(id))
    .filter((c): c is Citation => Boolean(c));
  return (
    <div className="fade-in flex flex-col gap-4 rounded-2xl bg-[var(--card)] border border-[var(--card-border)] p-4 md:p-6 md:overflow-y-auto md:max-h-[calc(100svh-180px)]">
      {slide.warnings && slide.warnings.length > 0 && (
        <div className="rounded-lg border border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-fg)] px-3 py-2 text-sm flex gap-2">
          <span aria-hidden="true">⚠️</span>
          <ul className="list-none flex-1 space-y-1">
            {slide.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="leading-relaxed">
        <MarkdownText text={slide.narration} />
      </div>
      {cites.length > 0 && (
        <section className="mt-2 pt-3 border-t border-[var(--card-border)]">
          <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
            参考文献
          </h3>
          <ol className="list-decimal pl-5 space-y-1.5 text-xs md:text-sm text-[var(--muted)]">
            {cites.map((c) => (
              <li key={c.id} id={`ref-${c.id}`}>
                {c.url ? (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--primary)] hover:underline"
                  >
                    {c.source}
                  </a>
                ) : (
                  c.source
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
      {slide.speakerNotes && (
        <details className="mt-2 text-xs text-[var(--muted)] border-t border-dashed border-[var(--card-border)] pt-3">
          <summary className="cursor-pointer hover:text-[var(--foreground)]">
            講演者ノート
          </summary>
          <p className="mt-2 whitespace-pre-line">{slide.speakerNotes}</p>
        </details>
      )}
    </div>
  );
}
