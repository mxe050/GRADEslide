"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useEditStore, mergeSlide, hasMeaningfulOverlay } from "@/lib/editStore";
import { getAllSlides, getAppData } from "@/lib/slides";
import type { Slide } from "@/lib/types";

/**
 * PushToGitHub — モーダル付き「GitHub に送信」 ボタン。
 *
 * 動作:
 *   1. 現在の overlays から merged AppData を作る
 *   2. /api/save-and-push に POST
 *   3. サーバー側で 検証 → backup → write → git add → commit → push
 *   4. 成功時のみ overlays を全クリア (= 編集が取り込まれた)
 *
 * dev サーバーが応答しない / 本番ビルド (route が 403) の場合はそのまま
 * エラー表示。元の slides.json は変更されない (overlay と元データは別物)。
 */

interface Props {
  className?: string;
}

type StepLog = { step: string; ok: boolean; detail?: string };
type ApiResult = {
  ok: boolean;
  noop?: boolean;
  committed?: boolean;
  pushed?: boolean;
  commitHash?: string;
  backup?: string;
  error?: string;
  logs?: StepLog[];
};

export function PushToGitHub({ className }: Props) {
  const overlays = useEditStore((s) => s.overlays);
  const clearAll = useEditStore((s) => s.clearAll);
  const overlayCount = Object.keys(overlays).length;

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [result, setResult] = useState<ApiResult | null>(null);

  const editedSlides = useMemo<Slide[]>(() => {
    const all = getAllSlides();
    return all.filter((s) => hasMeaningfulOverlay(s, overlays[s.id]));
  }, [overlays]);

  // Default commit message based on edit count
  useEffect(() => {
    if (!open) return;
    setCommitMessage(
      editedSlides.length === 1
        ? `edit: ${editedSlides[0].id} (${truncate(editedSlides[0].title, 40)})`
        : `edit: ${editedSlides.length} スライド更新`
    );
    setResult(null);
  }, [open, editedSlides]);

  // ESC closes when not busy
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy]);

  async function handleSend() {
    setBusy(true);
    setResult(null);
    try {
      const app = getAppData();
      const merged = {
        ...app,
        slides: getAllSlides().map((s) => mergeSlide(s, overlays[s.id])),
      };
      const res = await fetch("/api/save-and-push", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          appData: merged,
          commitMessage: commitMessage.trim() || undefined,
          editedIds: editedSlides.map((s) => s.id),
        }),
      });
      const data = (await res.json()) as ApiResult;
      setResult(data);
      if (data.ok) {
        clearAll();
      }
    } catch (e) {
      setResult({
        ok: false,
        error:
          "API へのリクエストに失敗しました。dev サーバーが起動しているか確認してください: " +
          (e instanceof Error ? e.message : String(e)),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={overlayCount === 0}
        title={
          overlayCount === 0
            ? "編集がないため送信できません"
            : `${overlayCount} 件の編集を GitHub に送信 (dev のみ)`
        }
        className={
          (className ?? "") +
          " inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-bold border " +
          (overlayCount > 0
            ? "border-[var(--good)] bg-[var(--good-soft)] text-[var(--good)] hover:brightness-95"
            : "border-[var(--card-border)] text-[var(--muted)] cursor-not-allowed opacity-50")
        }
      >
        <span aria-hidden="true">🚀</span>
        <span className="hidden sm:inline">GitHub 送信</span>
        {overlayCount > 0 && (
          <span className="ml-0.5 inline-block min-w-4 h-4 px-1 rounded-full bg-[var(--good)] text-white text-[10px] leading-4 font-bold tabular-nums">
            {overlayCount}
          </span>
        )}
      </button>

      {open && (
        <PushModal
          editedSlides={editedSlides}
          commitMessage={commitMessage}
          setCommitMessage={setCommitMessage}
          busy={busy}
          result={result}
          onClose={() => !busy && setOpen(false)}
          onSend={handleSend}
        />
      )}
    </>
  );
}

function PushModal({
  editedSlides,
  commitMessage,
  setCommitMessage,
  busy,
  result,
  onClose,
  onSend,
}: {
  editedSlides: Slide[];
  commitMessage: string;
  setCommitMessage: (v: string) => void;
  busy: boolean;
  result: ApiResult | null;
  onClose: () => void;
  onSend: () => void;
}) {
  const msgRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    msgRef.current?.focus();
    msgRef.current?.select();
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="GitHub に送信"
    >
      <button
        type="button"
        aria-label="閉じる"
        onClick={onClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-xl rounded-2xl bg-[var(--background)] border border-[var(--card-border)] shadow-2xl flex flex-col max-h-[90vh]">
        <header className="px-4 sm:px-5 py-3 border-b border-[var(--card-border)] flex items-center gap-2">
          <span className="text-base font-bold">🚀 GitHub に送信</span>
          <span className="text-xs text-[var(--muted)]">
            ({editedSlides.length} 件の編集)
          </span>
          <span className="ml-auto" />
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-[var(--card-border)]/60 disabled:opacity-40"
            aria-label="閉じる"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
          {/* Edited slides list */}
          <section>
            <h4 className="text-[11px] font-bold tracking-wider uppercase text-[var(--muted)] mb-1.5">
              編集対象スライド
            </h4>
            <ul className="rounded-md border border-[var(--card-border)] bg-[var(--card)] divide-y divide-[var(--card-border)] max-h-48 overflow-y-auto">
              {editedSlides.length === 0 && (
                <li className="text-sm text-[var(--muted)] px-3 py-2">
                  編集なし
                </li>
              )}
              {editedSlides.map((s) => (
                <li
                  key={s.id}
                  className="px-3 py-1.5 text-sm flex items-center gap-2"
                >
                  <span className="text-xs text-[var(--muted)] tabular-nums w-12">
                    {s.id}
                  </span>
                  <span className="truncate">{s.title}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Commit message */}
          <section>
            <label className="block">
              <span className="block text-[11px] font-bold tracking-wider uppercase text-[var(--muted)] mb-1.5">
                コミットメッセージ
              </span>
              <input
                ref={msgRef}
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                disabled={busy}
                className="w-full rounded-md border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm font-mono focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/25"
              />
            </label>
          </section>

          {/* Safety info */}
          <section className="rounded-md border border-[var(--info-border)] bg-[var(--info-soft)] text-[var(--info)] px-3 py-2 text-[12px] leading-relaxed">
            <strong>安全のため</strong>: 開発サーバー (npm run dev) でのみ動作します。送信前に
            <code className="mx-0.5 px-1 rounded bg-[var(--card)]">slides.json.bak.&lt;timestamp&gt;</code>
            にバックアップを作成し、git は <code className="mx-0.5 px-1 rounded bg-[var(--card)]">slides.json</code> 1
            ファイルだけステージします。他の変更は混ざりません。
          </section>

          {/* Result */}
          {result && (
            <section
              className={
                "rounded-md border px-3 py-3 text-sm space-y-2 " +
                (result.ok
                  ? "border-[var(--good)] bg-[var(--good-soft)]/40 text-[var(--good)]"
                  : "border-[var(--bad)] bg-[var(--bad-soft)]/40 text-[var(--bad)]")
              }
            >
              <div className="font-bold">
                {result.ok
                  ? result.noop
                    ? "差分なし — 何も送信されませんでした"
                    : result.pushed
                      ? `✓ 送信成功 (${result.commitHash})`
                      : result.committed
                        ? `✓ コミット済み (${result.commitHash}) — push はスキップ`
                        : "✓ 完了"
                  : "× エラー"}
              </div>
              {result.error && (
                <div className="text-[12px] whitespace-pre-wrap">
                  {result.error}
                </div>
              )}
              {result.backup && (
                <div className="text-[11px] opacity-80">
                  backup: {result.backup}
                </div>
              )}
              {result.logs && result.logs.length > 0 && (
                <details className="text-[11px]">
                  <summary className="cursor-pointer">ログ詳細</summary>
                  <ul className="mt-1 space-y-0.5 font-mono">
                    {result.logs.map((l, i) => (
                      <li key={i}>
                        {l.ok ? "✓" : "✕"} {l.step}
                        {l.detail ? ` — ${l.detail}` : ""}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </section>
          )}
        </div>

        <footer className="border-t border-[var(--card-border)] px-4 sm:px-5 py-3 flex items-center gap-2">
          <span className="ml-auto" />
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="text-sm px-3 py-1.5 rounded-md border border-[var(--card-border)] hover:bg-[var(--card-border)]/60 disabled:opacity-40"
          >
            {result?.ok ? "閉じる" : "キャンセル"}
          </button>
          {!result?.ok && (
            <button
              type="button"
              onClick={onSend}
              disabled={busy || editedSlides.length === 0}
              className="text-sm font-bold px-4 py-1.5 rounded-md bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {busy && (
                <span
                  className="inline-block w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin"
                  aria-hidden="true"
                />
              )}
              <span>{busy ? "送信中…" : "送信"}</span>
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
