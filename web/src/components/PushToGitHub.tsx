"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useEditStore, mergeSlide, hasMeaningfulOverlay } from "@/lib/editStore";
import { getAllSlides, getAppData } from "@/lib/slides";
import type { Slide } from "@/lib/types";
import type { SlideOverlay } from "@/lib/editStore";

/**
 * PushToGitHub — クライアントから直接 GitHub REST API を叩いて
 * slides.json を 1 ファイルだけ書き換える方式。
 *
 * 安全策:
 *   - GitHub Fine-grained PAT を localStorage に保存 (key: gradeslide-github-pat)
 *   - スコープは「Contents: Read and write」 + 対象リポジトリ 1 つのみ → 漏洩時の被害は最小
 *   - PUT /repos/{owner}/{repo}/contents/{path} は **そのファイル 1 つだけ** を書き換える
 *   - 送信前に sha 取得 → 競合検出 (409) で安全に止まる
 *   - 送信前に JSON 構造を検証
 *   - 失敗時は localStorage の overlay を保持 → リトライ可
 *
 * UX:
 *   - 初回 / 期限切れ時 (401): 番号付きウィザードで手取り足取りガイド
 *   - コピーボタンで GitHub の入力欄に貼るだけ
 *   - 「テスト」 ボタンで保存前に PAT が動くか確認
 *   - 90 日ごとの更新もウィザードで完結
 */

/* ----------- 設定 (このリポジトリ専用にハードコード) ----------- */
const GITHUB_OWNER = "mxe050";
const GITHUB_REPO = "GRADEslide";
const GITHUB_BRANCH = "main";
const FILE_PATH = "web/public/data/slides.json";
const PAT_KEY = "gradeslide-github-pat";

const REPO_FULL = `${GITHUB_OWNER}/${GITHUB_REPO}`;
const TOKEN_NAME_DEFAULT = "GRADEslide editor";
const NEW_PAT_URL = "https://github.com/settings/personal-access-tokens/new";
const TOKEN_LIST_URL = "https://github.com/settings/tokens?type=beta";

interface Props {
  className?: string;
}

type StepLog = { step: string; ok: boolean; detail?: string };
type ApiResult = {
  ok: boolean;
  commitHash?: string;
  htmlUrl?: string;
  error?: string;
  errorKind?: "auth" | "permission" | "conflict" | "validation" | "network" | "other";
  logs: StepLog[];
};

/* ============== ボタン本体 ============== */

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

/* ============== モーダル ============== */

function PushModal({
  overlays,
  clearAll,
  onClose,
}: {
  overlays: Record<string, SlideOverlay>;
  clearAll: () => void;
  onClose: () => void;
}) {
  // PAT を localStorage から hydrate
  const [pat, setPatState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [forceWizard, setForceWizard] = useState(false);
  // Portal で document.body にマウントするため、SSR 時 / 初回レンダ時には
  // null を返す。マウント後に portalTarget を設定して描画開始。
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPatState(typeof window !== "undefined" ? localStorage.getItem(PAT_KEY) : null);
    setHydrated(true);
    setPortalTarget(document.body);

    // モーダルを開いている間、ページ本体のスクロールを止める。
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  function savePat(value: string) {
    if (typeof window !== "undefined") localStorage.setItem(PAT_KEY, value);
    setPatState(value);
    setForceWizard(false);
  }
  function clearPat() {
    if (typeof window !== "undefined") localStorage.removeItem(PAT_KEY);
    setPatState(null);
    setForceWizard(true);
  }

  const [busy, setBusy] = useState(false);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  if (!portalTarget) return null;

  const modalNode = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="GitHub に送信"
      // 圧倒的な z-index で他のすべての sticky / fixed 要素より上に。
      // Portal で document.body 直下にマウントするので、ページ内の
      // stacking context (NavBar 等) の影響を受けない。
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 9999,
        display: "flex",
      }}
    >
      {/* Backdrop — viewport 全体。タップで閉じる。 */}
      <button
        type="button"
        aria-label="閉じる"
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0, 0, 0, 0.55)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          border: "none",
          padding: 0,
          margin: 0,
          zIndex: 9999,
          cursor: "pointer",
        }}
      />
      {/*
        モーダル本体 — position:fixed で右端に貼り付け。
        flex 配置に頼らず top/right/bottom を直接指定して 100vh 確保。
      */}
      <aside
        className="bg-[var(--background)] shadow-2xl border-l border-[var(--card-border)] flex flex-col"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(100vw, 640px)",
          height: "100vh",
          zIndex: 10000,
        }}
      >
        {!hydrated ? (
          <div className="px-5 py-12 text-center text-sm text-[var(--muted)]">
            読み込み中…
          </div>
        ) : !pat || forceWizard ? (
          <PatWizard onSave={savePat} onClose={onClose} />
        ) : (
          <CommitFlow
            pat={pat}
            overlays={overlays}
            onClearOverlays={clearAll}
            onClose={onClose}
            onRenewPat={clearPat}
            onBusyChange={setBusy}
          />
        )}
      </aside>
    </div>
  );

  return createPortal(modalNode, portalTarget);
}

/* ============== PAT セットアップウィザード ============== */

function PatWizard({
  onSave,
  onClose,
}: {
  onSave: (value: string) => void;
  onClose: () => void;
}) {
  const [pasted, setPasted] = useState("");
  const [show, setShow] = useState(false);
  const [agree, setAgree] = useState(false);
  const [step, setStep] = useState(1); // 進行中ステップ。コピーや GitHub オープンで自動進行
  const [test, setTest] = useState<
    | { kind: "idle" }
    | { kind: "running" }
    | { kind: "ok"; rateRemaining?: string }
    | { kind: "error"; message: string }
  >({ kind: "idle" });
  const inputRef = useRef<HTMLInputElement | null>(null);

  const trimmed = pasted.trim();
  const looksValid =
    trimmed.startsWith("github_pat_") || trimmed.startsWith("ghp_") || trimmed.length >= 30;

  async function runTest() {
    if (!looksValid) return;
    setTest({ kind: "running" });
    try {
      const res = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}?ref=${GITHUB_BRANCH}&t=${Date.now()}`,
        {
          headers: {
            Authorization: `Bearer ${trimmed}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          cache: "no-store",
        }
      );
      const rateRemaining = res.headers.get("x-ratelimit-remaining") ?? undefined;
      if (res.ok) {
        setTest({ kind: "ok", rateRemaining });
      } else if (res.status === 401) {
        setTest({ kind: "error", message: "PAT が無効、または期限切れです。新しく作成し直してください。" });
      } else if (res.status === 403) {
        setTest({
          kind: "error",
          message:
            "権限不足 (403)。Fine-grained PAT の場合、Repository access に " +
            REPO_FULL +
            " が含まれているか / Permissions の Contents が「Read and write」 か を確認してください。",
        });
      } else if (res.status === 404) {
        setTest({
          kind: "error",
          message:
            "リポジトリ / ファイルが見つかりません (404)。Repository access の選択でこのリポジトリが入っているか確認してください。",
        });
      } else {
        const txt = await res.text();
        setTest({ kind: "error", message: `エラー (${res.status}): ${txt.slice(0, 160)}` });
      }
    } catch (e) {
      setTest({
        kind: "error",
        message: "ネットワークエラー: " + (e instanceof Error ? e.message : String(e)),
      });
    }
  }

  function focusInput() {
    setStep(5);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  return (
    <>
      <header className="shrink-0 bg-[var(--card)]/80 backdrop-blur px-4 sm:px-5 py-3 border-b border-[var(--card-border)] flex items-center gap-2">
        <span className="text-base font-bold">🔑 GitHub PAT のセットアップ</span>
        <span className="ml-auto text-xs text-[var(--muted)]">90 日に 1 回</span>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-[var(--card-border)]/60"
          aria-label="閉じる"
        >
          ✕
        </button>
      </header>

      <div
        className="px-4 sm:px-5 py-4 space-y-4 text-sm leading-relaxed"
        style={{ flex: "1 1 0%", minHeight: 0, overflowY: "auto" }}
      >
        {/* Intro */}
        <section className="rounded-lg border border-[var(--info-border)] bg-[var(--info-soft)] text-[var(--foreground)] px-4 py-3">
          <h4 className="font-bold text-[var(--info)] mb-1.5">
            ❓ PAT (Personal Access Token) って何ですか？
          </h4>
          <p className="text-[13px]">
            GitHub に書き込みするための <strong>「専用のカギ」</strong> です。アカウントのパスワードよりずっと安全で、
            <strong>「このリポジトリのファイルを更新する」 という権限だけ</strong> に絞ったカギを作って使います。
          </p>
          <ul className="mt-2 text-[12px] list-disc pl-5 space-y-0.5 text-[var(--muted)]">
            <li>アカウントには触れません (パスワード変更や課金などはできません)</li>
            <li>万一漏れても <code className="px-1 bg-[var(--card)] rounded">{REPO_FULL}</code> のファイル書換だけ。コミット履歴で全部見えるので revert も可能</li>
            <li>下のリンクからいつでも取り消せます (Revoke)</li>
            <li>90 日に 1 回、ここでもう一度作り直すだけ</li>
          </ul>
        </section>

        {/* Step 1 */}
        <StepBlock
          n={1}
          title="GitHub の作成ページを開く"
          active={step >= 1}
          done={step > 1}
        >
          <a
            href={NEW_PAT_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setStep(Math.max(step, 2))}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-bold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
          >
            🔗 GitHub の PAT 作成ページを開く
          </a>
          <p className="mt-2 text-[12px] text-[var(--muted)]">
            別タブで GitHub が開きます。GitHub にログインしていない場合は先にログインしてください。
          </p>
        </StepBlock>

        {/* Step 2: Token name */}
        <StepBlock
          n={2}
          title="Token name (名前) に貼り付け"
          active={step >= 2}
          done={step > 2}
        >
          <p className="text-[13px] mb-1.5">
            GitHub の <strong>Token name</strong> 欄に、下のテキストをコピーして貼り付けてください:
          </p>
          <CopyRow value={TOKEN_NAME_DEFAULT} onCopied={() => setStep(Math.max(step, 3))} />
        </StepBlock>

        {/* Step 3: Expiration */}
        <StepBlock
          n={3}
          title="Expiration (有効期限) を 90 days に"
          active={step >= 3}
          done={step > 3}
        >
          <p className="text-[13px]">
            プルダウンから <strong>「90 days」</strong> を選びます (お好みで他の期間でも OK)。
          </p>
        </StepBlock>

        {/* Step 4: Repository access + Permissions */}
        <StepBlock
          n={4}
          title="リポジトリと権限を設定"
          active={step >= 4}
          done={step > 4}
        >
          <ol className="list-decimal pl-5 space-y-2 text-[13px]">
            <li>
              <strong>Repository access</strong> →{" "}
              <strong>「Only select repositories」</strong> をチェック
            </li>
            <li>
              <strong>Select repositories</strong> の検索欄に下の名前を貼り付け、出てきた候補をクリック:
              <div className="mt-1.5">
                <CopyRow value={REPO_FULL} />
              </div>
            </li>
            <li>
              <strong>Permissions</strong> セクションの右上にある{" "}
              <strong>「+ Add permissions」</strong> ボタンをクリック
            </li>
            <li>
              開いた選択画面で <strong>「Contents」</strong> を探して選択 →{" "}
              アクセスを <strong>「Read and write」</strong> に設定して追加
              <p className="text-[11px] text-[var(--muted)] mt-0.5">
                ※ 「Metadata: Read-only」 が自動で追加されますが、それは正常です (Contents の依存権限)。
                そのままでも OK で、消せません。
              </p>
            </li>
          </ol>
          <button
            type="button"
            onClick={() => setStep(Math.max(step, 5))}
            className="mt-3 text-xs px-3 py-1.5 rounded-md border border-[var(--card-border)] hover:bg-[var(--card-border)]/60"
          >
            設定できた → 次へ
          </button>
        </StepBlock>

        {/* Step 5: Generate + Paste */}
        <StepBlock
          n={5}
          title="Generate token を押して、表示されたトークンをここに貼り付け"
          active={step >= 5}
        >
          <p className="text-[13px] mb-1.5">
            ページ下の <strong>「Generate token」</strong> ボタンを押すと、
            <code className="mx-0.5 px-1 rounded bg-[var(--card)] text-xs">github_pat_…</code>
            で始まる長い文字列が表示されます。
          </p>
          <p className="text-[12px] text-[var(--bad)] font-bold mb-1.5">
            ⚠ この画面を閉じると 2 度と表示されません。今すぐコピーしてここに貼り付けてください。
          </p>
          <div className="flex items-stretch gap-1.5">
            <input
              ref={inputRef}
              type={show ? "text" : "password"}
              value={pasted}
              onChange={(e) => {
                setPasted(e.target.value);
                setTest({ kind: "idle" });
              }}
              onFocus={focusInput}
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
              形式が PAT らしくありません。github_pat_ か ghp_ で始まる文字列をそのまま貼り付けてください。
            </p>
          )}

          {/* Test */}
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={runTest}
              disabled={!looksValid || test.kind === "running"}
              className="text-xs px-3 py-1.5 rounded-md border border-[var(--card-border)] hover:bg-[var(--card-border)]/60 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
            >
              {test.kind === "running" && (
                <span
                  className="inline-block w-3 h-3 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin"
                  aria-hidden="true"
                />
              )}
              <span>動作テスト</span>
            </button>
            <span className="text-[11px] text-[var(--muted)]">
              GitHub に読み取りリクエストを 1 回送って動くか確認します (書き込みません)
            </span>
          </div>
          {test.kind === "ok" && (
            <p className="mt-2 text-[12px] rounded-md border border-[var(--good)] bg-[var(--good-soft)]/50 text-[var(--good)] px-2 py-1.5">
              ✓ 動作確認 OK。下の同意チェック → 「保存」 で完了です。
              {test.rateRemaining && (
                <span className="ml-1 text-[10px] opacity-70">
                  (rate limit 残り {test.rateRemaining})
                </span>
              )}
            </p>
          )}
          {test.kind === "error" && (
            <p className="mt-2 text-[12px] rounded-md border border-[var(--bad)] bg-[var(--bad-soft)]/50 text-[var(--bad)] px-2 py-1.5">
              × {test.message}
            </p>
          )}
        </StepBlock>

        {/* Agreement */}
        <section className="rounded-md border border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-fg)] px-3 py-3 text-[12px] leading-relaxed">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              この PC のブラウザの localStorage に PAT を保存することに同意します。
              <span className="ml-1 text-[11px] opacity-80">
                (この PC を他人と共有していない前提)
              </span>
            </span>
          </label>
        </section>

        <p className="text-[11px] text-[var(--muted)]">
          90 日後に期限が切れたら、もう一度このウィザードが出てきます。同じ手順で更新するだけ。
          <br />
          いつでも{" "}
          <a
            href={TOKEN_LIST_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--primary)] underline"
          >
            Token 一覧 ↗
          </a>{" "}
          から Revoke できます。
        </p>
      </div>

      <footer className="shrink-0 bg-[var(--card)]/95 backdrop-blur border-t border-[var(--card-border)] px-4 sm:px-5 py-3 flex items-center gap-2">
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
          disabled={!agree || !looksValid || test.kind === "error"}
          title={
            !looksValid
              ? "PAT を貼り付けてください"
              : test.kind === "error"
                ? "テストでエラーが出ています — 解消してください"
                : !agree
                  ? "同意チェックを入れてください"
                  : "PAT を保存して送信画面へ"
          }
          className="text-sm font-bold px-4 py-1.5 rounded-md bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          保存して続ける
        </button>
      </footer>
    </>
  );
}

/* ----------- ウィザード補助コンポーネント ----------- */

function StepBlock({
  n,
  title,
  active,
  done,
  children,
}: {
  n: number;
  title: string;
  active: boolean;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={
        "rounded-lg border p-3 sm:p-4 transition " +
        (done
          ? "border-[var(--good)] bg-[var(--good-soft)]/30"
          : active
            ? "border-[var(--primary)] bg-[var(--card)]"
            : "border-[var(--card-border)] bg-[var(--card)] opacity-70")
      }
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className={
            "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold " +
            (done
              ? "bg-[var(--good)] text-white"
              : active
                ? "bg-[var(--primary)] text-white"
                : "bg-[var(--card-border)] text-[var(--muted)]")
          }
        >
          {done ? "✓" : n}
        </span>
        <h4 className="text-sm font-bold">{title}</h4>
      </div>
      <div className="pl-8">{children}</div>
    </section>
  );
}

function CopyRow({
  value,
  onCopied,
}: {
  value: string;
  onCopied?: () => void;
}) {
  const [done, setDone] = useState(false);
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      onCopied?.();
      setTimeout(() => setDone(false), 1500);
    } catch {
      // fallback: select the input so user can Ctrl+C
    }
  }
  return (
    <div className="inline-flex items-stretch gap-1.5 max-w-full">
      <code className="flex-1 min-w-0 px-2 py-1.5 rounded-md bg-[var(--card)] border border-[var(--card-border)] text-[13px] font-mono truncate">
        {value}
      </code>
      <button
        type="button"
        onClick={handleCopy}
        className={
          "shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold border transition " +
          (done
            ? "bg-[var(--good)] text-white border-[var(--good)]"
            : "bg-[var(--primary)] text-white border-[var(--primary)] hover:bg-[var(--primary-hover)]")
        }
      >
        {done ? "✓ コピー済" : "📋 コピー"}
      </button>
    </div>
  );
}

/* ============== コミット送信フロー ============== */

function CommitFlow({
  pat,
  overlays,
  onClearOverlays,
  onClose,
  onRenewPat,
  onBusyChange,
}: {
  pat: string;
  overlays: Record<string, SlideOverlay>;
  onClearOverlays: () => void;
  onClose: () => void;
  onRenewPat: () => void;
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

      // 2. Validate
      const v = validateAppData(merged);
      if (!v.ok) {
        setResult({
          ok: false,
          errorKind: "validation",
          error: v.error,
          logs: [...logs, { step: "validate", ok: false, detail: v.error }],
        });
        setBusy(false);
        return;
      }
      log("validate", true, `slides=${v.slidesCount}`);

      // 3. Get current sha
      const headers = {
        Authorization: `Bearer ${pat}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      };
      const getRes = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}?ref=${GITHUB_BRANCH}&t=${Date.now()}`,
        { headers, cache: "no-store" }
      );
      if (!getRes.ok) {
        if (getRes.status === 401) {
          log("github-get", false, "401 Unauthorized");
          setResult({
            ok: false,
            errorKind: "auth",
            error: "PAT が無効、または期限切れです (90 日経過した可能性があります)。",
            logs,
          });
          setBusy(false);
          return;
        }
        const text = await getRes.text();
        log("github-get", false, `${getRes.status}`);
        setResult({
          ok: false,
          errorKind: getRes.status === 403 ? "permission" : "other",
          error: `現在のファイル取得に失敗 (${getRes.status}): ${text.slice(0, 200)}`,
          logs,
        });
        setBusy(false);
        return;
      }
      const current = await getRes.json();
      const sha = current.sha as string;
      log("github-get", true, `sha=${sha.slice(0, 7)}`);

      // 4. Encode
      const json = JSON.stringify(merged, null, 2) + "\n";
      const utf8 = new TextEncoder().encode(json);
      let binary = "";
      for (let i = 0; i < utf8.length; i++) binary += String.fromCharCode(utf8[i]);
      const contentBase64 = btoa(binary);
      log("encode", true, `${json.length} chars`);

      // 5. PUT
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
        if (putRes.status === 401) {
          log("github-put", false, "401 Unauthorized");
          setResult({
            ok: false,
            errorKind: "auth",
            error: "PAT が無効、または期限切れです。",
            logs,
          });
        } else if (putRes.status === 409) {
          log("github-put", false, "409 Conflict");
          setResult({
            ok: false,
            errorKind: "conflict",
            error:
              "競合: 別の変更が先に commit されています。ページを再読み込みしてやり直してください。",
            logs,
          });
        } else if (putRes.status === 422) {
          log("github-put", false, `422 ${parsedMsg}`);
          setResult({
            ok: false,
            errorKind: "validation",
            error: `GitHub に拒否されました (422): ${parsedMsg}`,
            logs,
          });
        } else if (putRes.status === 403) {
          log("github-put", false, `403 ${parsedMsg}`);
          setResult({
            ok: false,
            errorKind: "permission",
            error: `権限不足 (403): ${parsedMsg || "PAT の Contents 権限が Read and write になっているか確認してください。"}`,
            logs,
          });
        } else {
          log("github-put", false, `${putRes.status}`);
          setResult({
            ok: false,
            errorKind: "other",
            error: `送信失敗 (${putRes.status}): ${parsedMsg || errText.slice(0, 200)}`,
            logs,
          });
        }
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
      setResult({ ok: false, errorKind: "network", error: "ネットワーク等のエラー: " + msg, logs });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="shrink-0 bg-[var(--card)]/80 backdrop-blur px-4 sm:px-5 py-3 border-b border-[var(--card-border)] flex items-center gap-2">
        <span className="text-base font-bold">🚀 GitHub に送信</span>
        <span className="text-xs text-[var(--muted)]">
          ({editedSlides.length} 件)
        </span>
        <span className="ml-auto" />
        <button
          type="button"
          onClick={onRenewPat}
          disabled={busy}
          title="PAT を作り直す (90 日に 1 回)"
          className="text-xs px-2 py-1 rounded-md hover:bg-[var(--card-border)]/60 disabled:opacity-40 inline-flex items-center gap-1"
        >
          🔑 PAT を更新
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

      <div
        className="px-4 sm:px-5 py-4 space-y-4"
        style={{ flex: "1 1 0%", minHeight: 0, overflowY: "auto" }}
      >
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
          1 ファイルだけ書き換えます。他のファイルは絶対に変わりません。送信前に現行 sha を取得し、競合があれば 409 で安全に止まります。
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
              {result.ok ? `✓ 送信成功 (${result.commitHash})` : "× エラー"}
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
            {/* PAT 関連エラー時はウィザードへ誘導 */}
            {result.errorKind === "auth" && (
              <button
                type="button"
                onClick={onRenewPat}
                className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
              >
                🔑 新しい PAT を作る
              </button>
            )}
            {result.errorKind === "permission" && (
              <button
                type="button"
                onClick={onRenewPat}
                className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
              >
                🔑 PAT を作り直す (権限を確認)
              </button>
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

      <footer className="shrink-0 bg-[var(--card)]/95 backdrop-blur border-t border-[var(--card-border)] px-4 sm:px-5 py-3 flex items-center gap-2">
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

/* ----------- 検証 ----------- */

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
