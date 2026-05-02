"use client";

import { useCallback } from "react";

/**
 * MarkdownToolbar — wraps the selection inside the currently focused
 * <textarea> with markdown emphasis. Only modifies plain-text source —
 * the existing markdown renderer interprets the result, so colors map to
 * the same CSS variables already used everywhere:
 *   - **bold**  → strong (color: var(--primary), 青色太字)
 *   - *italic*  → em     (color: var(--accent),  赤色太字)
 *
 * The toolbar tracks the last-focused textarea via the `getActiveTextarea`
 * callback so a single shared toolbar can drive any number of textareas.
 */
interface Props {
  getActiveTextarea: () => HTMLTextAreaElement | null;
  /** Called after a wrap so the parent state can sync. */
  onAfterChange: (el: HTMLTextAreaElement) => void;
}

export function MarkdownToolbar({ getActiveTextarea, onAfterChange }: Props) {
  const wrap = useCallback(
    (left: string, right: string = left, fallback = "") => {
      const el = getActiveTextarea();
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const before = el.value.slice(0, start);
      const sel = el.value.slice(start, end);
      const after = el.value.slice(end);
      const inner = sel.length > 0 ? sel : fallback;
      const next = before + left + inner + right + after;
      el.value = next;
      // Restore caret around the inserted content.
      const newStart = before.length + left.length;
      const newEnd = newStart + inner.length;
      el.focus();
      el.setSelectionRange(newStart, newEnd);
      onAfterChange(el);
    },
    [getActiveTextarea, onAfterChange]
  );

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[11px] text-[var(--muted)] mr-1">装飾:</span>
      <ToolButton
        label="**B**"
        title="太字 (青) — **テキスト**"
        onClick={() => wrap("**", "**", "太字")}
        bold
      />
      <ToolButton
        label="*I*"
        title="斜体 (赤強調) — *テキスト*"
        onClick={() => wrap("*", "*", "強調")}
        italic
      />
      <span className="mx-1 h-4 w-px bg-[var(--card-border)]" aria-hidden />
      <ToolButton
        label="• 行頭"
        title="リスト記号 (- ) を行頭に挿入"
        onClick={() => insertLinePrefix(getActiveTextarea(), "- ", onAfterChange)}
      />
      <ToolButton
        label="改行"
        title="markdown の改行 (行末に半角スペース 2 個) を挿入"
        onClick={() => insertAtCaret(getActiveTextarea(), "  \n", onAfterChange)}
      />
    </div>
  );
}

function ToolButton({
  label,
  title,
  onClick,
  bold,
  italic,
}: {
  label: string;
  title: string;
  onClick: () => void;
  bold?: boolean;
  italic?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={[
        "inline-flex items-center justify-center h-7 min-w-7 px-2 rounded-md text-xs",
        "border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)]",
        "hover:bg-[var(--primary-soft)] active:scale-[0.97] transition",
        bold ? "font-bold text-[var(--primary)]" : "",
        italic ? "italic text-[var(--accent)]" : "",
      ].join(" ")}
      // Prevent the textarea from losing focus on mousedown so the
      // selection is preserved at the moment we read it.
      onMouseDown={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}

function insertAtCaret(
  el: HTMLTextAreaElement | null,
  text: string,
  onAfterChange: (el: HTMLTextAreaElement) => void
) {
  if (!el) return;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const before = el.value.slice(0, start);
  const after = el.value.slice(end);
  el.value = before + text + after;
  const caret = before.length + text.length;
  el.focus();
  el.setSelectionRange(caret, caret);
  onAfterChange(el);
}

function insertLinePrefix(
  el: HTMLTextAreaElement | null,
  prefix: string,
  onAfterChange: (el: HTMLTextAreaElement) => void
) {
  if (!el) return;
  const start = el.selectionStart;
  // Find start of current line.
  const lineStart = el.value.lastIndexOf("\n", start - 1) + 1;
  const before = el.value.slice(0, lineStart);
  const after = el.value.slice(lineStart);
  el.value = before + prefix + after;
  const caret = start + prefix.length;
  el.focus();
  el.setSelectionRange(caret, caret);
  onAfterChange(el);
}
