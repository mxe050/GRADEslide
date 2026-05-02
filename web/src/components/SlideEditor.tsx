"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Slide, Visual } from "@/lib/types";
import {
  useEditStore,
  mergeSlide,
  hasMeaningfulOverlay,
  type SlideOverlay,
} from "@/lib/editStore";
import { MarkdownToolbar } from "./MarkdownToolbar";

/**
 * SlideEditor — text-only edit drawer.
 *
 * Constraints:
 *   - Edits ONLY existing string fields. Does not add/remove bullets, items,
 *     rows, or change visual.type — so the rendered layout stays identical.
 *   - Saves go to localStorage as a per-slide overlay.
 *   - Cancel discards local edits without touching the overlay.
 *   - "このスライドの編集を破棄" wipes overlay for this slide → reverts to
 *     the original slides.json content.
 */

interface Props {
  slide: Slide; // ORIGINAL (not merged)
  onClose: () => void;
}

export function SlideEditor({ slide, onClose }: Props) {
  const overlay = useEditStore((s) => s.overlays[slide.id]);
  const setOverlay = useEditStore((s) => s.setOverlay);
  const clearOne = useEditStore((s) => s.clearOne);

  // Working copy seeded from the currently merged view of the slide.
  const seeded: SlideOverlay = useMemo(() => {
    const m = mergeSlide(slide, overlay);
    return {
      title: m.title,
      section: m.section,
      narration: m.narration,
      // Deep-clone visual so edits don't mutate the original or overlay.
      visual: JSON.parse(JSON.stringify(m.visual)) as Visual,
    };
    // Re-seed if the user opens the editor again after toggling slide.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide.id]);

  const [draft, setDraft] = useState<SlideOverlay>(seeded);

  // Track the last-focused textarea so the toolbar buttons act on it.
  const activeRef = useRef<HTMLTextAreaElement | null>(null);
  const setActive = (el: HTMLTextAreaElement | null) => {
    activeRef.current = el;
  };

  // ----- JSON 直接編集 -------------------------------------------------
  // フォームフィールド ⟷ JSON の双方向同期。JSON が壊れているときは
  // setDraft しない (ので他のフォームの値が壊れない)。保存ボタンも無効化。
  const [jsonText, setJsonText] = useState<string>(() =>
    JSON.stringify(seeded, null, 2)
  );
  const [jsonError, setJsonError] = useState<string | null>(null);
  const jsonFocusedRef = useRef(false);

  // draft が変わった (フォームフィールド編集や toolbar) ら、JSON を再生成。
  // ただしユーザーが JSON テキストエリアを編集中はその文字列を尊重する。
  useEffect(() => {
    if (!jsonFocusedRef.current) {
      setJsonText(JSON.stringify(draft, null, 2));
    }
  }, [draft]);

  function applyJsonText(text: string) {
    setJsonText(text);
    try {
      const parsed: unknown = JSON.parse(text);
      if (!parsed || typeof parsed !== "object") {
        throw new Error("JSON は object でなければなりません");
      }
      const o = parsed as Record<string, unknown>;
      if (typeof o.title !== "string")
        throw new Error("title は string でなければなりません");
      if (typeof o.section !== "string")
        throw new Error("section は string でなければなりません");
      if (typeof o.narration !== "string")
        throw new Error("narration は string でなければなりません");
      if (!o.visual || typeof o.visual !== "object")
        throw new Error("visual は object でなければなりません");
      const v = o.visual as Record<string, unknown>;
      if (typeof v.type !== "string")
        throw new Error("visual.type は string でなければなりません");
      if (!v.data || typeof v.data !== "object")
        throw new Error("visual.data は object でなければなりません");
      setDraft(parsed as SlideOverlay);
      setJsonError(null);
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : String(e));
    }
  }

  // Keep activeRef.current's value in sync when the toolbar mutates it.
  // We ask the toolbar to call back here so we re-derive draft state.
  const onToolbarChange = (el: HTMLTextAreaElement) => {
    const path = el.dataset.path;
    if (!path) return;
    setDraftAtPath(path, el.value);
  };

  function setDraftAtPath(path: string, value: string) {
    setDraft((d) => writeDraftPath(d, path, value));
  }

  // ESC closes
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleSave() {
    setOverlay(slide.id, draft);
    onClose();
  }
  function handleResetThis() {
    if (
      window.confirm(
        "このスライドの編集を破棄して元のテキストに戻します。よろしいですか？"
      )
    ) {
      clearOne(slide.id);
      onClose();
    }
  }

  const merged = mergeSlide(slide, overlay);
  const dirty = hasMeaningfulOverlay(slide, overlay);

  return (
    <div
      className="fixed inset-0 z-50 flex"
      role="dialog"
      aria-modal="true"
      aria-label={`スライド ${slide.id} を編集`}
    >
      {/* backdrop */}
      <button
        type="button"
        aria-label="閉じる"
        onClick={onClose}
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
      />

      <aside
        className="relative ml-auto w-full sm:max-w-[560px] md:max-w-[640px] h-full bg-[var(--background)] shadow-2xl border-l border-[var(--card-border)] flex flex-col"
      >
        {/* header */}
        <div className="flex items-center gap-3 px-4 md:px-5 py-3 border-b border-[var(--card-border)] bg-[var(--card)]/80 backdrop-blur sticky top-0 z-10">
          <span className="text-base font-bold text-[var(--foreground)]">
            ✎ 文字を編集
          </span>
          <span className="text-xs text-[var(--muted)] tabular-nums">
            {slide.id}
          </span>
          {dirty && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--primary-soft)] text-[var(--primary-hover)] font-bold">
              編集済み
            </span>
          )}
          <span className="ml-auto" />
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none w-9 h-9 inline-flex items-center justify-center rounded-md hover:bg-[var(--card-border)]/60"
            aria-label="閉じる (Esc)"
          >
            ✕
          </button>
        </div>

        {/* sticky toolbar */}
        <div className="px-4 md:px-5 py-2 border-b border-[var(--card-border)] bg-[var(--background)] sticky top-[57px] z-10">
          <MarkdownToolbar
            getActiveTextarea={() => activeRef.current}
            onAfterChange={onToolbarChange}
          />
          <p className="mt-1.5 text-[11px] text-[var(--muted)] leading-snug">
            選択範囲を <strong className="text-[var(--primary)]">**太字 (青)**</strong> /
            <em className="text-[var(--accent)] not-italic font-semibold"> *斜体 (赤)*</em> で囲めます。レイアウトと配色は元のまま、文字だけが変わります。
          </p>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-4 md:px-5 py-4 space-y-4">
          <Field
            label="セクション"
            value={draft.section ?? ""}
            path="section"
            onSetActive={setActive}
            onChange={(v) => setDraft((d) => ({ ...d, section: v }))}
          />
          <Field
            label="タイトル"
            value={draft.title ?? ""}
            path="title"
            onSetActive={setActive}
            onChange={(v) => setDraft((d) => ({ ...d, title: v }))}
          />

          <Section title="解説 (narration)">
            <Field
              hideLabel
              label="解説"
              value={draft.narration ?? ""}
              path="narration"
              onSetActive={setActive}
              onChange={(v) => setDraft((d) => ({ ...d, narration: v }))}
              minRows={10}
            />
          </Section>

          <Section title={`ビジュアル (${draft.visual?.type ?? "—"})`}>
            <VisualEditor
              visual={draft.visual!}
              onChange={(v) => setDraft((d) => ({ ...d, visual: v }))}
              onSetActive={setActive}
            />
          </Section>

          <Section title="プレビュー">
            <div className="text-xs text-[var(--muted)] mb-1">
              現在の merged 値（保存後にこの内容になります）
            </div>
            <PreviewBlock label="title" value={draft.title ?? ""} />
            <PreviewBlock label="section" value={draft.section ?? ""} />
            <details className="text-xs" open={jsonError !== null}>
              <summary className="cursor-pointer text-[var(--muted)] hover:text-[var(--foreground)] inline-flex items-center gap-1.5">
                <span>JSON を直接編集</span>
                {jsonError ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bad-soft)] text-[var(--bad)] font-bold">
                    ⚠ エラー中
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--good-soft)] text-[var(--good)] font-bold">
                    ✓ OK
                  </span>
                )}
              </summary>
              <textarea
                value={jsonText}
                onChange={(e) => applyJsonText(e.target.value)}
                onFocus={() => {
                  jsonFocusedRef.current = true;
                }}
                onBlur={() => {
                  jsonFocusedRef.current = false;
                }}
                spellCheck={false}
                rows={20}
                className={
                  "mt-2 w-full text-[11px] bg-[var(--card)] border rounded-md p-2 font-mono leading-snug whitespace-pre overflow-x-auto resize-y focus:outline-none focus:ring-2 " +
                  (jsonError
                    ? "border-[var(--bad)] focus:ring-[var(--bad)]/30"
                    : "border-[var(--card-border)] focus:ring-[var(--primary)]/30")
                }
              />
              {jsonError ? (
                <div className="mt-1.5 text-[11px] text-[var(--bad)] bg-[var(--bad-soft)]/40 border border-[var(--bad)]/30 px-2 py-1.5 rounded-md">
                  ⚠ {jsonError}
                  <span className="ml-1 text-[var(--muted)]">
                    — 修正するか、保存ボタンを使わずキャンセルしてください
                  </span>
                </div>
              ) : (
                <div className="mt-1.5 text-[11px] text-[var(--muted)] leading-snug">
                  上のフィールドを編集すると JSON が自動更新されます。逆もできます (JSON を直接編集 → 上のフォームに反映)。
                  <strong className="text-[var(--bad)]"> 構造を壊すと保存できなくなる</strong>ので注意。
                </div>
              )}
            </details>
          </Section>

          <p className="text-[11px] text-[var(--muted)] leading-snug pt-2">
            元の <code className="text-[var(--primary)]">slides.json</code> は変更されません。
            編集はこのブラウザの localStorage に保存され、
            画面上部の「📥 JSON エクスポート」 からまとめてダウンロードできます。
          </p>
        </div>

        {/* footer */}
        <div className="border-t border-[var(--card-border)] bg-[var(--card)]/95 backdrop-blur px-4 md:px-5 py-3 flex items-center gap-2 sticky bottom-0">
          <button
            type="button"
            onClick={handleResetThis}
            disabled={!overlay}
            className="text-xs px-2.5 py-1.5 rounded-md border border-[var(--card-border)] text-[var(--bad)] hover:bg-[var(--bad-soft)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            このスライドの編集を破棄
          </button>
          <span className="ml-auto" />
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-3 py-1.5 rounded-md border border-[var(--card-border)] hover:bg-[var(--card-border)]/60"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={jsonError !== null}
            title={
              jsonError
                ? `JSON エラー中のため保存できません: ${jsonError}`
                : "保存"
            }
            className="text-sm font-bold px-4 py-1.5 rounded-md bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            保存
          </button>
        </div>

        {/* live merged preview hint (read-only) */}
        <span className="sr-only">{merged.title}</span>
      </aside>
    </div>
  );
}

/* ---------- field primitives ------------------------------------ */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-3 md:p-4">
      <h4 className="text-[11px] font-bold tracking-wider uppercase text-[var(--muted)] mb-2">
        {title}
      </h4>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  hideLabel,
  value,
  path,
  onChange,
  onSetActive,
  minRows = 1,
}: {
  label: string;
  hideLabel?: boolean;
  value: string;
  path: string;
  onChange: (v: string) => void;
  onSetActive: (el: HTMLTextAreaElement | null) => void;
  minRows?: number;
}) {
  return (
    <label className="block">
      {!hideLabel && (
        <span className="block text-[11px] font-semibold text-[var(--muted)] mb-1">
          {label}
        </span>
      )}
      <AutoTextarea
        value={value}
        path={path}
        minRows={minRows}
        onChange={onChange}
        onSetActive={onSetActive}
      />
    </label>
  );
}

function AutoTextarea({
  value,
  path,
  minRows = 1,
  onChange,
  onSetActive,
}: {
  value: string;
  path: string;
  minRows?: number;
  onChange: (v: string) => void;
  onSetActive: (el: HTMLTextAreaElement | null) => void;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  // Auto-resize on value change.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [value]);
  return (
    <textarea
      ref={ref}
      data-path={path}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={(e) => onSetActive(e.currentTarget)}
      rows={minRows}
      spellCheck={false}
      className="w-full resize-none rounded-md border border-[var(--card-border)] bg-[var(--card)] px-2.5 py-1.5 text-[14px] leading-relaxed font-mono text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/25"
    />
  );
}

function PreviewBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-xs mb-1">
      <span className="text-[var(--muted)]">{label}: </span>
      <span className="text-[var(--foreground)]">{value}</span>
    </div>
  );
}

/* ---------- per-visual-type editors --------------------------- */

function VisualEditor({
  visual,
  onChange,
  onSetActive,
}: {
  visual: Visual;
  onChange: (v: Visual) => void;
  onSetActive: (el: HTMLTextAreaElement | null) => void;
}) {
  // Helper: shallow update of visual.data
  function setData<T>(updater: (data: T) => T) {
    const next = JSON.parse(JSON.stringify(visual));
    next.data = updater(next.data);
    onChange(next);
  }

  switch (visual.type) {
    case "card": {
      const d = visual.data;
      return (
        <>
          <Field
            label="heading"
            value={d.heading ?? ""}
            path="visual.data.heading"
            onSetActive={onSetActive}
            onChange={(v) =>
              setData<typeof d>((data) => ({ ...data, heading: v }))
            }
          />
          <Field
            label="body"
            value={d.body ?? ""}
            path="visual.data.body"
            minRows={2}
            onSetActive={onSetActive}
            onChange={(v) => setData<typeof d>((data) => ({ ...data, body: v }))}
          />
          {(d.bullets ?? []).map((b, i) => (
            <Field
              key={i}
              label={`bullet ${i + 1}`}
              value={b}
              path={`visual.data.bullets[${i}]`}
              onSetActive={onSetActive}
              onChange={(v) =>
                setData<typeof d>((data) => {
                  const arr = [...(data.bullets ?? [])];
                  arr[i] = v;
                  return { ...data, bullets: arr };
                })
              }
            />
          ))}
        </>
      );
    }
    case "list": {
      const d = visual.data;
      return (
        <>
          {d.items.map((it, i) => (
            <div key={i} className="rounded-md border border-[var(--card-border)] p-2 space-y-1.5">
              <div className="text-[10px] text-[var(--muted)]">
                item {i + 1}
              </div>
              <Field
                label="text"
                value={it.text}
                path={`visual.data.items[${i}].text`}
                onSetActive={onSetActive}
                onChange={(v) =>
                  setData<typeof d>((data) => {
                    const arr = data.items.map((x, j) =>
                      j === i ? { ...x, text: v } : x
                    );
                    return { ...data, items: arr };
                  })
                }
              />
              {(it.subItems ?? []).map((s, j) => (
                <Field
                  key={j}
                  label={`subItem ${j + 1}`}
                  value={s}
                  path={`visual.data.items[${i}].subItems[${j}]`}
                  onSetActive={onSetActive}
                  onChange={(v) =>
                    setData<typeof d>((data) => {
                      const arr = data.items.map((x, k) =>
                        k === i
                          ? {
                              ...x,
                              subItems: (x.subItems ?? []).map((y, m) =>
                                m === j ? v : y
                              ),
                            }
                          : x
                      );
                      return { ...data, items: arr };
                    })
                  }
                />
              ))}
            </div>
          ))}
        </>
      );
    }
    case "comparison": {
      const d = visual.data;
      return (
        <>
          <Field
            label="leftHeader"
            value={d.leftHeader}
            path="visual.data.leftHeader"
            onSetActive={onSetActive}
            onChange={(v) =>
              setData<typeof d>((data) => ({ ...data, leftHeader: v }))
            }
          />
          <Field
            label="rightHeader"
            value={d.rightHeader}
            path="visual.data.rightHeader"
            onSetActive={onSetActive}
            onChange={(v) =>
              setData<typeof d>((data) => ({ ...data, rightHeader: v }))
            }
          />
          {d.rows.map((r, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-2 rounded-md border border-[var(--card-border)] p-2">
              <Field
                label={`row ${i + 1} 左`}
                value={r.left}
                path={`visual.data.rows[${i}].left`}
                onSetActive={onSetActive}
                onChange={(v) =>
                  setData<typeof d>((data) => {
                    const rows = data.rows.map((x, j) =>
                      j === i ? { ...x, left: v } : x
                    );
                    return { ...data, rows };
                  })
                }
              />
              <Field
                label={`row ${i + 1} 右`}
                value={r.right}
                path={`visual.data.rows[${i}].right`}
                onSetActive={onSetActive}
                onChange={(v) =>
                  setData<typeof d>((data) => {
                    const rows = data.rows.map((x, j) =>
                      j === i ? { ...x, right: v } : x
                    );
                    return { ...data, rows };
                  })
                }
              />
            </div>
          ))}
          {d.caption !== undefined && (
            <Field
              label="caption"
              value={d.caption}
              path="visual.data.caption"
              onSetActive={onSetActive}
              onChange={(v) =>
                setData<typeof d>((data) => ({ ...data, caption: v }))
              }
            />
          )}
        </>
      );
    }
    case "table": {
      const d = visual.data;
      return (
        <>
          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-[var(--muted)]">
              headers
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {d.headers.map((h, i) => (
                <Field
                  key={i}
                  hideLabel
                  label={`header ${i + 1}`}
                  value={h}
                  path={`visual.data.headers[${i}]`}
                  onSetActive={onSetActive}
                  onChange={(v) =>
                    setData<typeof d>((data) => {
                      const arr = [...data.headers];
                      arr[i] = v;
                      return { ...data, headers: arr };
                    })
                  }
                />
              ))}
            </div>
          </div>
          {d.rows.map((row, ri) => (
            <div key={ri} className="rounded-md border border-[var(--card-border)] p-2 space-y-1.5">
              <div className="text-[10px] text-[var(--muted)]">row {ri + 1}</div>
              {row.map((cell, ci) => (
                <Field
                  key={ci}
                  label={`cell [${ri + 1}, ${ci + 1}]`}
                  value={cell}
                  path={`visual.data.rows[${ri}][${ci}]`}
                  onSetActive={onSetActive}
                  onChange={(v) =>
                    setData<typeof d>((data) => {
                      const rows = data.rows.map((r, j) =>
                        j === ri ? r.map((c, k) => (k === ci ? v : c)) : r
                      );
                      return { ...data, rows };
                    })
                  }
                />
              ))}
            </div>
          ))}
          {d.caption !== undefined && (
            <Field
              label="caption"
              value={d.caption}
              path="visual.data.caption"
              onSetActive={onSetActive}
              onChange={(v) =>
                setData<typeof d>((data) => ({ ...data, caption: v }))
              }
            />
          )}
        </>
      );
    }
    case "quote": {
      const d = visual.data;
      return (
        <Field
          label="text"
          value={d.text}
          path="visual.data.text"
          minRows={3}
          onSetActive={onSetActive}
          onChange={(v) =>
            setData<typeof d>((data) => ({ ...data, text: v }))
          }
        />
      );
    }
    case "imageCard": {
      const d = visual.data;
      return (
        <>
          <Field
            label="heading"
            value={d.heading ?? ""}
            path="visual.data.heading"
            onSetActive={onSetActive}
            onChange={(v) =>
              setData<typeof d>((data) => ({ ...data, heading: v }))
            }
          />
          <Field
            label="image alt (説明)"
            value={d.image.alt}
            path="visual.data.image.alt"
            onSetActive={onSetActive}
            onChange={(v) =>
              setData<typeof d>((data) => ({
                ...data,
                image: { ...data.image, alt: v },
              }))
            }
          />
          {d.bullets.map((b, i) => (
            <Field
              key={i}
              label={`bullet ${i + 1}`}
              value={b}
              path={`visual.data.bullets[${i}]`}
              onSetActive={onSetActive}
              onChange={(v) =>
                setData<typeof d>((data) => {
                  const arr = [...data.bullets];
                  arr[i] = v;
                  return { ...data, bullets: arr };
                })
              }
            />
          ))}
        </>
      );
    }
    case "image": {
      const d = visual.data;
      return (
        <>
          <Field
            label="alt (画像の説明)"
            value={d.alt}
            path="visual.data.alt"
            onSetActive={onSetActive}
            onChange={(v) =>
              setData<typeof d>((data) => ({ ...data, alt: v }))
            }
          />
          {d.caption !== undefined && (
            <Field
              label="caption"
              value={d.caption}
              path="visual.data.caption"
              onSetActive={onSetActive}
              onChange={(v) =>
                setData<typeof d>((data) => ({ ...data, caption: v }))
              }
            />
          )}
        </>
      );
    }
    case "slideImage": {
      const d = visual.data;
      return (
        <Field
          label="alt (画像の説明)"
          value={d.alt}
          path="visual.data.alt"
          onSetActive={onSetActive}
          onChange={(v) =>
            setData<typeof d>((data) => ({ ...data, alt: v }))
          }
        />
      );
    }
    case "imagePair": {
      const d = visual.data;
      return (
        <>
          <Field
            label="leftCaption"
            value={d.leftCaption ?? ""}
            path="visual.data.leftCaption"
            onSetActive={onSetActive}
            onChange={(v) =>
              setData<typeof d>((data) => ({ ...data, leftCaption: v }))
            }
          />
          <Field
            label="rightCaption"
            value={d.rightCaption ?? ""}
            path="visual.data.rightCaption"
            onSetActive={onSetActive}
            onChange={(v) =>
              setData<typeof d>((data) => ({ ...data, rightCaption: v }))
            }
          />
          <Field
            label="left image alt"
            value={d.leftImage.alt}
            path="visual.data.leftImage.alt"
            onSetActive={onSetActive}
            onChange={(v) =>
              setData<typeof d>((data) => ({
                ...data,
                leftImage: { ...data.leftImage, alt: v },
              }))
            }
          />
          <Field
            label="right image alt"
            value={d.rightImage.alt}
            path="visual.data.rightImage.alt"
            onSetActive={onSetActive}
            onChange={(v) =>
              setData<typeof d>((data) => ({
                ...data,
                rightImage: { ...data.rightImage, alt: v },
              }))
            }
          />
        </>
      );
    }
    case "imageComparison": {
      const d = visual.data;
      return (
        <>
          <Field
            label="leftHeader"
            value={d.leftHeader}
            path="visual.data.leftHeader"
            onSetActive={onSetActive}
            onChange={(v) =>
              setData<typeof d>((data) => ({ ...data, leftHeader: v }))
            }
          />
          <Field
            label="rightHeader"
            value={d.rightHeader}
            path="visual.data.rightHeader"
            onSetActive={onSetActive}
            onChange={(v) =>
              setData<typeof d>((data) => ({ ...data, rightHeader: v }))
            }
          />
          {d.rows.map((r, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-2 rounded-md border border-[var(--card-border)] p-2">
              <Field
                label={`row ${i + 1} 左`}
                value={r.left}
                path={`visual.data.rows[${i}].left`}
                onSetActive={onSetActive}
                onChange={(v) =>
                  setData<typeof d>((data) => {
                    const rows = data.rows.map((x, j) =>
                      j === i ? { ...x, left: v } : x
                    );
                    return { ...data, rows };
                  })
                }
              />
              <Field
                label={`row ${i + 1} 右`}
                value={r.right}
                path={`visual.data.rows[${i}].right`}
                onSetActive={onSetActive}
                onChange={(v) =>
                  setData<typeof d>((data) => {
                    const rows = data.rows.map((x, j) =>
                      j === i ? { ...x, right: v } : x
                    );
                    return { ...data, rows };
                  })
                }
              />
            </div>
          ))}
          {d.caption !== undefined && (
            <Field
              label="caption"
              value={d.caption}
              path="visual.data.caption"
              onSetActive={onSetActive}
              onChange={(v) =>
                setData<typeof d>((data) => ({ ...data, caption: v }))
              }
            />
          )}
        </>
      );
    }
    default:
      return (
        <div className="text-xs text-[var(--muted)]">
          このビジュアル形式 ({(visual as Visual).type}) には個別エディタがまだありません。
        </div>
      );
  }
}

/* ---------- internals ----------------------------------------- */

/**
 * Path-based writer for the toolbar callback. Supports:
 *   "title" | "section" | "narration"
 *   "visual.data.heading" | "visual.data.body"
 *   "visual.data.bullets[i]"
 *   "visual.data.headers[i]"
 *   "visual.data.rows[ri][ci]"
 *   "visual.data.rows[i].left" | ".right"
 *   "visual.data.items[i].text"
 *   "visual.data.items[i].subItems[j]"
 *   "visual.data.image.alt"
 *   "visual.data.leftImage.alt" | ".rightImage.alt"
 *   "visual.data.text" | ".alt" | ".caption" | ".leftHeader" | ".rightHeader"
 *   "visual.data.leftCaption" | ".rightCaption"
 */
function writeDraftPath(d: SlideOverlay, path: string, value: string): SlideOverlay {
  const next: SlideOverlay = JSON.parse(JSON.stringify(d));

  if (path === "title") return { ...next, title: value };
  if (path === "section") return { ...next, section: value };
  if (path === "narration") return { ...next, narration: value };

  if (path.startsWith("visual.")) {
    const visual = next.visual as unknown as Record<string, unknown> & {
      data: Record<string, unknown>;
    };
    if (!visual) return next;
    const sub = path.slice("visual.data.".length);

    // Top-level scalar field on data
    if (/^[a-zA-Z]+$/.test(sub)) {
      visual.data[sub] = value;
      return next;
    }

    // image.alt / leftImage.alt / rightImage.alt
    const imgMatch = sub.match(/^([a-zA-Z]+)\.alt$/);
    if (imgMatch) {
      const img = visual.data[imgMatch[1]] as { alt: string } | undefined;
      if (img) img.alt = value;
      return next;
    }

    // bullets[i] | headers[i]
    const arrIdx = sub.match(/^([a-zA-Z]+)\[(\d+)\]$/);
    if (arrIdx) {
      const arr = visual.data[arrIdx[1]] as string[] | undefined;
      if (arr) arr[Number(arrIdx[2])] = value;
      return next;
    }

    // rows[ri][ci] (table)
    const tableCell = sub.match(/^rows\[(\d+)\]\[(\d+)\]$/);
    if (tableCell) {
      const rows = visual.data.rows as string[][] | undefined;
      if (rows) rows[Number(tableCell[1])][Number(tableCell[2])] = value;
      return next;
    }

    // rows[i].left | .right (comparison / imageComparison)
    const cmpCell = sub.match(/^rows\[(\d+)\]\.(left|right)$/);
    if (cmpCell) {
      const rows = visual.data.rows as { left: string; right: string }[];
      if (rows) rows[Number(cmpCell[1])][cmpCell[2] as "left" | "right"] = value;
      return next;
    }

    // items[i].text | items[i].subItems[j] (list)
    const listText = sub.match(/^items\[(\d+)\]\.text$/);
    if (listText) {
      const items = visual.data.items as { text: string }[];
      if (items) items[Number(listText[1])].text = value;
      return next;
    }
    const listSub = sub.match(/^items\[(\d+)\]\.subItems\[(\d+)\]$/);
    if (listSub) {
      const items = visual.data.items as { subItems?: string[] }[];
      const item = items?.[Number(listSub[1])];
      if (item?.subItems) item.subItems[Number(listSub[2])] = value;
      return next;
    }
  }

  return next;
}
