"use client";

import clsx from "clsx";
import type { Citation, Slide } from "@/lib/types";
import { getCitation } from "@/lib/slides";
import { MarkdownText } from "./MarkdownText";

interface Props {
  slide: Slide;
}

/**
 * Parse narration text into a dialogue between 初心者 (Beginner) and EBM先生
 * (Teacher), if the text contains those speaker markers. Returns null
 * otherwise (caller should fall back to plain markdown).
 *
 * Format: each speaker turn starts with "初心者:" or "EBM先生:" at the start
 * of a line. Continuation lines belong to the most recent turn.
 */
type DialogueTurn = { speaker: "初心者" | "EBM先生"; text: string };

function parseDialogue(text: string): DialogueTurn[] | null {
  if (!/^(初心者|EBM先生)[:：]/m.test(text)) return null;
  const turns: DialogueTurn[] = [];
  let current: DialogueTurn | null = null;
  for (const rawLine of text.split(/\n/)) {
    const m = rawLine.match(/^(初心者|EBM先生)[:：]\s*(.*)$/);
    if (m) {
      if (current) turns.push(current);
      current = { speaker: m[1] as DialogueTurn["speaker"], text: m[2] };
    } else if (current) {
      if (rawLine.trim()) {
        current.text += (current.text ? "\n" : "") + rawLine;
      } else if (current.text) {
        current.text += "\n";
      }
    }
  }
  if (current) turns.push(current);
  return turns.length > 0 ? turns : null;
}

function DialogueBubble({ turn }: { turn: DialogueTurn }) {
  const isTeacher = turn.speaker === "EBM先生";
  return (
    <div
      className={clsx(
        "flex gap-3 md:gap-4",
        isTeacher ? "flex-row" : "flex-row-reverse"
      )}
    >
      <div
        aria-hidden="true"
        className={clsx(
          "shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-xl md:text-2xl font-semibold",
          isTeacher
            ? "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-200"
            : "bg-sky-500/15 text-sky-700 dark:bg-sky-400/20 dark:text-sky-200"
        )}
      >
        {isTeacher ? "🧑‍⚕️" : "🤔"}
      </div>
      <div
        className={clsx(
          "relative flex-1 min-w-0 rounded-2xl px-4 py-3 md:px-5 md:py-4",
          isTeacher
            ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-tl-sm"
            : "bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900 rounded-tr-sm"
        )}
      >
        <div
          className={clsx(
            "text-xs md:text-sm font-bold mb-1.5",
            isTeacher
              ? "text-emerald-800 dark:text-emerald-200"
              : "text-sky-800 dark:text-sky-200"
          )}
        >
          {turn.speaker}
        </div>
        <div className="text-base md:text-lg leading-loose text-[var(--foreground)]">
          <MarkdownText text={turn.text} />
        </div>
      </div>
    </div>
  );
}

export function NarrationPanel({ slide }: Props) {
  const cites: Citation[] = (slide.citationIds ?? [])
    .map((id) => getCitation(id))
    .filter((c): c is Citation => Boolean(c));
  return (
    <div className="fade-in flex flex-col gap-4 md:gap-5 rounded-2xl bg-[var(--card)] border border-[var(--card-border)] p-5 md:p-7 shadow-sm">
      <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
        解説
      </h3>
      {slide.warnings && slide.warnings.length > 0 && (
        <div className="rounded-lg border border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-fg)] px-4 py-3 text-base md:text-lg flex gap-3">
          <span aria-hidden="true" className="text-lg">⚠️</span>
          <ul className="list-none flex-1 space-y-1.5 leading-relaxed">
            {slide.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
      {(() => {
        const turns = parseDialogue(slide.narration);
        if (turns) {
          return (
            <div className="flex flex-col gap-4 md:gap-5">
              {turns.map((t, i) => (
                <DialogueBubble key={i} turn={t} />
              ))}
            </div>
          );
        }
        return (
          <div className="text-base md:text-lg leading-loose md:leading-loose">
            <MarkdownText text={slide.narration} />
          </div>
        );
      })()}
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
