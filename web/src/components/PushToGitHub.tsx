"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useEditStore, mergeSlide, hasMeaningfulOverlay } from "@/lib/editStore";
import { getAllSlides, getAppData } from "@/lib/slides";
import type { Slide } from "@/lib/types";

/**
 * PushToGitHub — クライアントから直接 GitHub REST API を叩いて
 * slides.json を 1 ファイルだけ書き換える方式。
 *
 * なぜこの方式か:
 *   - Vercel 上で動かす必要がある (=サーバー側で git/fs は使えない)
 *   - Node 24 + Google Drive で `npm run dev` が起動しない場合がある
 *     (\\?\ extended-length path 問題) → dev API ルートも実用しづらい
 *
 * 安全策:
 *   - GitHub Fine-grained PAT を localStorage に保存。スコープは
 *     「Contents: Read and write」 + 対象リポジトリ 1 つだけ にする
 *   - PUT /repos/{owner}/{repo}/contents/{path} は **そのファイルだけ** を
 *     書き換える GitHub REST API。他のファイルは絶対に変わらない
 *   - 送信前に、現行ファイルの sha を GET で取得し PUT に同梱 →
 *     他者の変更を踏み潰さない (sha 不一致なら GitHub 側で 409)
 *   - 送信前に JSON 構造を検証 (slides 配列 / id 重複 / 必須フィールド)
 *   - 失敗時は localStorage の overlay は保持される (リトライ可)
 */

/* ----------- 設定 (このリポジトリ専用にハードコード) ----------- */
const GITHUB_OWNER = "mxe050";
const GITHUB_REPO = "GRADEslide";
const GITHUB_BRANCH = "main";
const FILE_PATH = "web/public/data/slides.json";
const PAT_KEY = "gradeslide-github-pat";

interface Props {
  className?: string;
}

type StepLog = { step: string; ok: boolean; detail?: string };
type ApiResult = {
  ok: boolean;
  commitHash?: string;
  htmlUrl?: string;
  error?: string;
  logs: StepLog[];
};

export function PushToGitHub({ className }: Props) {
  const overlays = useEditStore((s) => s.overlays);
  const clearAll = useEditStore((s) => s.clearAll);
  const overlayCount = Object.keys(overlays).length;

  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={overlayCount === 0}
        title={
          overlayCount === 0
            ? "編集がないため送信できません"
            : `${overlayCount} 件の編集を GitHub に送信`
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
          overlays={overlays}
          clearAll={clearAll}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

/* ============== モーダル本体 ============== */

function PushModal({
  overlays,
  clearAll,
  onClose,
}: {
  overlays: Record<string, unknown>;
  clearAll: () => void;
  onClose: () => void;
}) {
  // Hydrate PAT from localStorage on mount.
  const [pat, setPatState] = useState<string | null>(null);
  const [patHydrated, setPatHydrated] = useState(false);
  useEffect(() => {
    setPatState(typeof window !== "undefined" ? localStorage.getItem(PAT_KEY) : null);
    setPatHydrated(true);
  }, []);

  function handleSavePat(value: string) {
    if (typeof window !== "undefined") localStorage.setItem(PAT_KEY, value);
    setPatState(value);
  }
  function handleClearPat() {
    if (typeof window !== "undefined") localStorage.removeItem(PAT_KEY);
    setPatState(null);
  }

  // ESC closes when not busy
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

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
        {!patHydrated ? (
          <div className="px-5 py-12 text-center text-sm text-[var(--muted)]">
            読み込み中…
          </div>
        ) : !pat ? (
          <PatSetup
            onSave={handleSavePat}
            onClose={onClose}
          />
        ) : (
          <CommitFlow
            pat={pat}
            overlays={overlays as Record<string, import("@/lib/editStore").SlideOverlay>}
            onClearOverlays={clearAll}
            onClose={onClose}
            onChangePat={handleClearPat}
            onBusyChange={setBusy}
          />
        )}
      </div>
    </div>
  );
}

/* ============== PAT 初期設定画面 ============== */

function PatSetup({
  onSave,
  onClose,
}: {
  onSave: (value: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const [agree, setAgree] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const trimmed = value.trim();
  const looksValid =
    trimmed.startsWith("github_pat_") || trimmed.startsWith("ghp_") || trimmed.length >= 30;

  return (
    <>
      <header className="px-4 sm:px-5 py-3 border-b border-[var(--card-border)] flex items-center gap-2">
        <span className="text-base font-bold">🔑 初回設定: GitHub Personal Access Token</span>
        <span className="ml-auto" />
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-[var(--card-border)]/60"
          aria-label="閉じる"
        >
          ✕
        </button>
      </header>
      <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4 text-sm leading-relaxed">
        <p>
          編集内容を GitHub にコミットするために、**この PC のブラウザ** に
          1 度だけ GitHub の Personal Access Token (PAT) を保存します。
        </p>

        <section className="rounded-md border border-[var(--info-border)] bg-[var(--info-soft)] text-[var(--foreground)] px-3 py-3 text-[13px]">
          <h4 className="font-bold mb-1.5 text-[var(--info)]">📌 PAT の作り方 (推奨)</h4>
          <ol className="list-decimal pl-5 space-y-1">
            <li>
              <a
                href="https://github.com/settings/personal-access-tokens/new"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--primary)] underline font-semibold"
              >
                Fine-grained PAT 作成ページ
              </a>{" "}
              を開く
            </li>
            <li><strong>Token name</strong>: 任意 (例: "GRADEslide editor")</li>
            <li><strong>Expiration</strong>: 90 days など (短い方が安全)</li>
            <li>
              <strong>Repository access</strong> →{" "}
              <strong>Only select repositories</strong> →{" "}
              <code className="px-1 py-0.5 rounded bg-[var(--card)] text-xs">
                {GITHUB_OWNER}/{GITHUB_REPO}
              </code>{" "}
              のみを選択
            </li>
            <li>
              <strong>Repository permissions</strong> →{" "}
              <strong>Contents</strong> を{" "}
              <strong>「Read and write」</strong>{" "}
              に設定
            </li>
            <li>
              <strong>Generate token</strong> ボタンを押し、表示された{" "}
              <code className="px-1 py-0.5 rounded bg-[var(--card)] text-xs">
                github_pat_…
              </code>{" "}
              を下にコピペ
            </li>
          </ol>
          <p className="mt-2 text-[12px] text-[var(--muted)]">
            ※ 古い 「Classic PAT」 (
            <code className="px-1 py-0.5 rounded bg-[var(--card)] text-[11px]">ghp_…</code>
            ) でも動きます (scope: <code>repo</code>)。
          </p>
        </section>

        <section>
          <label className="block text-[11px] font-bold tracking-wider uppercase text-[var(--muted)] mb-1">
            PAT を貼り付け
          </label>
          <div className="flex items-stretch gap-1.5">
            <input
              ref={inputRef}
              type={show ? "text" : "password"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="github_pat_..."
              className="flex-1 rounded-md border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm font-mono focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/25"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="px-3 rounded-md border border-[var(--card-border)] hover:bg-[var(--card-border)]/60 text-xs"
              title={show ? "隠す" : "表示"}
            >
              {show ? "🙈" : "👁"}
            </button>
          </div>
          {trimmed.length > 0 && !looksValid && (
            <p className="mt-1 text-[11px] text-[var(--bad)]">
              形式が PAT らしくありません。`github_pat_` か `ghp_` で始まるはずです。
            </p>
          )}
        </section>

        <section className="rounded-md border border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-fg)] px-3 py-3 text-[12px] leading-relaxed">
          <strong>⚠ 保存前にご確認:</strong>
          <ul className="list-disc pl-5 mt-1 space-y-0.5">
            <li>
              PAT は **このブラウザの localStorage** に保存されます (この PC を共有していない前提)
            </li>
            <li>
              PAT が漏れたら GitHub の{" "}
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold"
              >
                Token 設定
              </a>{" "}
              で即座に Revoke できます
            </li>
            <li>
              スコープを上記 ({GITHUB_OWNER}/{GITHUB_REPO} の Contents だけ) に絞っているので、漏れても被害は **このリポジトリの書き換えだけ** に限定されます
            </li>
          </ul>
          <label className="flex items-start gap-2 mt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-0.5"
            />
            <span>上記を理解した上で、この PC のブラウザに PAT を保存することに同意します</span>
          </label>
        </section>
      </div>
      <footer className="border-t border-[var(--card-border)] px-4 sm:px-5 py-3 flex items-center gap-2">
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
          onClick={() => onSave(trimmed)}
          disabled={!agree || !looksValid}
          className="text-sm font-bold px-4 py-1.5 rounded-md bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          保存して続ける
        </button>
      </footer>
    </>
  );
}

/* ============== コミット送信フロー ============== */

function CommitFlow({
  pat,
  overlays,
  onClearOverlays,
  onClose,
  onChangePat,
  onBusyChange,
}: {
  pat: string;
  overlays: Record<string, import("@/lib/editStore").SlideOverlay>;
  onClearOverlays: () => void;
  onClose: () => void;
  onChangePat: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const editedSlides = useMemo<Slide[]>(() => {
    const all = getAllSlides();
    return all.filter((s) => hasMeaningfulOverlay(s, overlays[s.id]));
  }, [overlays]);

  const [commitMessage, setCommitMessage] = useState(() =>
    editedSlides.length === 1
      ? `edit: ${editedSlides[0].id} (${truncate(editedSlides[0].title, 40)})`
      : `edit: ${editedSlides.length} スライド更新`
  );

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);
  useEffect(() => onBusyChange(busy), [busy, onBusyChange]);

  async function handleSend() {
    setBusy(true);
    setResult(null);
    const logs: StepLog[] = [];
    const log = (step: string, ok: boolean, detail?: string) =>
      logs.push({ step, ok, detail });
    try {
      // 1. Build merged AppData
      const app = getAppData();
      const merged = {
        ...app,
        slides: getAllSlides().map((s) => mergeSlide(s, overlays[s.id])),
      };
      log("merge", true, `slides=${merged.slides.length}`);

      // 2. Validate locally
      const v = validateAppData(merged);
      if (!v.ok) {
        setResult({ ok: false, error: v.error, logs: [...logs, { step: "validate", ok: false, detail: v.error }] });
        setBusy(false);
        return;
      }
      log("validate", true, `slides=${v.slidesCount}`);

      // 3. Get current sha from GitHub
      log("github-get", false, "fetching current sha…");
      const headers = {
        Authorization: `Bearer ${pat}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      };
      const getRes = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}?ref=${GITHUB_BRANCH}&t=${Date.now()}`,
        { headers, cache: "no-store" }
      );
      logs.pop();
      if (!getRes.ok) {
        const text = await getRes.text();
        const msg =
          getRes.status === 401
            ? "PAT が無効か期限切れです。再設定してください。"
            : getRes.status === 404
              ? "リポジトリ / ファイルが見つかりません。"
              : `GitHub から現在のファイル取得に失敗 (${getRes.status})`;
        log("github-get", false, msg);
        setResult({ ok: false, error: msg + " — " + text.slice(0, 200), logs });
        setBusy(false);
        return;
      }
      const current = await getRes.json();
      const sha = current.sha as string;
      log("github-get", true, `sha=${sha.slice(0, 7)}`);

      // 4. Encode new content as base64 (UTF-8 safe)
      const json = JSON.stringify(merged, null, 2) + "\n";
      const utf8 = new TextEncoder().encode(json);
      let binary = "";
      for (let i = 0; i < utf8.length; i++) binary += String.fromCharCode(utf8[i]);
      const contentBase64 = btoa(binary);
      log("encode", true, `${json.length} chars`);

      // 5. PUT to GitHub
      const putRes = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`,
        {
          method: "PUT",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            message: commitMessage.trim() || `edit: ${editedSlides.length} スライド更新`,
            content: contentBase64,
            sha,
            branch: GITHUB_BRANCH,
          }),
        }
      );
      if (!putRes.ok) {
        const errText = await putRes.text();
        let parsedMsg = "";
        try {
          parsedMsg = JSON.parse(errText)?.message ?? "";
        } catch {
          /* ignore */
        }
        const head =
          putRes.status === 401
            ? "PAT が無効か権限不足です。"
            : putRes.status === 409
              ? "競合: 別の変更が先に commit されています。ページを再読み込みしてやり直してください。"
              : putRes.status === 422
                ? "GitHub に拒否されました (422)。"
                : `送信失敗 (${putRes.status})`;
        log("github-put", false, head + (parsedMsg ? " — " + parsedMsg : ""));
        setResult({ ok: false, error: head + (parsedMsg ? " — " + parsedMsg : ""), logs });
        setBusy(false);
        return;
      }
      const putData = await putRes.json();
      const commitHash = ((putData.commit?.sha as string) || "").slice(0, 7);
      const htmlUrl = (putData.commit?.html_url as string) || "";
      log("github-put", true, `commit=${commitHash}`);

      setResult({ ok: true, commitHash, htmlUrl, logs });
      onClearOverlays();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logs.push({ step: "exception", ok: false, detail: msg });
      setResult({ ok: false, error: "ネットワーク等のエラー: " + msg, logs });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="px-4 sm:px-5 py-3 border-b border-[var(--card-border)] flex items-center gap-2">
        <span className="text-base font-bold">🚀 GitHub に送信</span>
        <span className="text-xs text-[var(--muted)]">
          ({editedSlides.length} 件)
        </span>
        <span className="ml-auto" />
        <button
          type="button"
          onClick={onChangePat}
          disabled={busy}
          title="PAT を再設定"
          className="text-xs px-2 py-1 rounded-md hover:bg-[var(--card-border)]/60 disabled:opacity-40"
        >
          🔑 PAT
        </button>
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
        <section>
          <h4 className="text-[11px] font-bold tracking-wider uppercase text-[var(--muted)] mb-1.5">
            編集対象スライド
          </h4>
          <ul className="rounded-md border border-[var(--card-border)] bg-[var(--card)] divide-y divide-[var(--card-border)] max-h-48 overflow-y-auto">
            {editedSlides.length === 0 && (
              <li className="text-sm text-[var(--muted)] px-3 py-2">編集なし</li>
            )}
            {editedSlides.map((s) => (
              <li key={s.id} className="px-3 py-1.5 text-sm flex items-center gap-2">
                <span className="text-xs text-[var(--muted)] tabular-nums w-12">
                  {s.id}
                </span>
                <span className="truncate">{s.title}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <label className="block">
            <span className="block text-[11px] font-bold tracking-wider uppercase text-[var(--muted)] mb-1.5">
              コミットメッセージ
            </span>
            <input
              type="text"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              disabled={busy}
              className="w-full rounded-md border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm font-mono focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/25"
            />
          </label>
        </section>

        <section className="rounded-md border border-[var(--info-border)] bg-[var(--info-soft)] text-[var(--info)] px-3 py-2 text-[12px] leading-relaxed">
          <strong>安全のため</strong>: GitHub REST API で
          <code className="mx-0.5 px-1 rounded bg-[var(--card)]">{FILE_PATH}</code>
          1 ファイルだけ書き換えます。他のファイルは絶対に変わりません。送信前に現行ファイルの sha を取得し、competing commit があれば 409 で安全に止まります。
        </section>

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
                ? `✓ 送信成功 (${result.commitHash})`
                : "× エラー"}
            </div>
            {result.htmlUrl && (
              <div className="text-[12px]">
                <a
                  href={result.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  GitHub で commit を見る ↗
                </a>
              </div>
            )}
            {result.error && (
              <div className="text-[12px] whitespace-pre-wrap">{result.error}</div>
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
            onClick={handleSend}
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
    </>
  );
}

/* ----------- 検証 (サーバー側ロジックをクライアントに移植) ----------- */

function validateAppData(input: unknown): { ok: true; slidesCount: number } | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "appData が object ではありません。" };
  const obj = input as Record<string, unknown>;
  if (!obj.meta || typeof obj.meta !== "object") return { ok: false, error: "meta が欠落しています。" };
  if (!obj.citations || typeof obj.citations !== "object") return { ok: false, error: "citations が欠落しています。" };
  if (!Array.isArray(obj.slides)) return { ok: false, error: "slides が配列ではありません。" };
  const slides = obj.slides as Array<Record<string, unknown>>;
  if (slides.length === 0) return { ok: false, error: "slides が空です。" };
  const seen = new Set<string>();
  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    if (typeof s.id !== "string" || !s.id) return { ok: false, error: `slides[${i}].id が不正です。` };
    if (seen.has(s.id)) return { ok: false, error: `slides[${i}].id "${s.id}" が重複しています。` };
    seen.add(s.id);
    if (typeof s.title !== "string") return { ok: false, error: `${s.id}.title が string ではありません。` };
    if (typeof s.section !== "string") return { ok: false, error: `${s.id}.section が string ではありません。` };
    if (typeof s.narration !== "string") return { ok: false, error: `${s.id}.narration が string ではありません。` };
    if (typeof s.order !== "number") return { ok: false, error: `${s.id}.order が数値ではありません。` };
    if (!s.visual || typeof s.visual !== "object") return { ok: false, error: `${s.id}.visual が欠落しています。` };
    const v = s.visual as Record<string, unknown>;
    if (typeof v.type !== "string") return { ok: false, error: `${s.id}.visual.type が欠落しています。` };
    if (!v.data || typeof v.data !== "object") return { ok: false, error: `${s.id}.visual.data が欠落しています。` };
  }
  return { ok: true, slidesCount: slides.length };
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
