/**
 * POST /api/save-and-push
 *
 * 安全に編集内容を slides.json に書き戻し、その 1 ファイルだけを git で
 * コミット & push する dev-only の Route Handler。
 *
 * 設計方針 (壊れない安全策):
 *   1. dev サーバー (NODE_ENV === 'development') のときだけ動作。本番では 403。
 *   2. 受信した JSON を厳密に検証 — slides 配列・ID・order・visual.type が揃っているか。
 *   3. 検証通過後、現行 slides.json を `slides.json.bak.<timestamp>` にバックアップ。
 *   4. アトミック書き込み: 一時ファイルへ書いてから rename。
 *   5. git add は **slides.json だけ**。他の作業中ファイルは混ぜない。
 *   6. `--force` / `--no-verify` 一切不使用。pre-commit フックがあれば走る。
 *   7. push はリモート設定がある場合のみ。失敗時は明確にエラーを返す。
 *   8. すべてのステップで詳細ログを返し、UI に表示できるようにする。
 */

import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SLIDES_PATH = path.join(process.cwd(), "public", "data", "slides.json");
const REPO_RELATIVE_SLIDES = "web/public/data/slides.json";

interface PushRequest {
  /** Merged AppData object — exactly what should be written to slides.json */
  appData: unknown;
  /** Optional commit message override. */
  commitMessage?: string;
  /** Slide IDs that were edited (for the commit body). */
  editedIds?: string[];
}

interface StepLog {
  step: string;
  ok: boolean;
  detail?: string;
}

export async function POST(request: Request) {
  const logs: StepLog[] = [];
  const log = (step: string, ok: boolean, detail?: string) => {
    logs.push({ step, ok, detail });
  };

  // ---- Guard: dev only -----------------------------------------------
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      {
        ok: false,
        error: "この API は開発環境 (npm run dev) でのみ動作します。",
        logs,
      },
      { status: 403 }
    );
  }

  // ---- Parse body ----------------------------------------------------
  let body: PushRequest;
  try {
    body = (await request.json()) as PushRequest;
  } catch {
    return NextResponse.json(
      { ok: false, error: "リクエスト JSON のパースに失敗しました。", logs },
      { status: 400 }
    );
  }
  log("parse-request", true);

  // ---- Validate appData shape ----------------------------------------
  const validation = validateAppData(body.appData);
  if (!validation.ok) {
    log("validate", false, validation.error);
    return NextResponse.json(
      { ok: false, error: validation.error, logs },
      { status: 422 }
    );
  }
  log("validate", true, `slides=${validation.slidesCount}`);

  // ---- Read current slides.json (sanity / for backup) ---------------
  let currentRaw: string;
  try {
    currentRaw = await fs.readFile(SLIDES_PATH, "utf-8");
  } catch (e) {
    log("read-current", false, asErr(e));
    return NextResponse.json(
      { ok: false, error: "現行 slides.json を読めませんでした。", logs },
      { status: 500 }
    );
  }
  log("read-current", true, `${currentRaw.length} bytes`);

  const newJson = JSON.stringify(body.appData, null, 2) + "\n";

  // No-op short-circuit: nothing actually changed
  if (currentRaw.replace(/\r\n/g, "\n") === newJson) {
    log("no-op", true, "差分なし");
    return NextResponse.json({ ok: true, noop: true, logs });
  }

  // ---- Backup --------------------------------------------------------
  const stamp = new Date()
    .toISOString()
    .replace(/[-:T]/g, "")
    .slice(0, 14); // YYYYMMDDHHMMSS
  const backupPath = SLIDES_PATH + ".bak." + stamp;
  try {
    await fs.writeFile(backupPath, currentRaw, "utf-8");
  } catch (e) {
    log("backup", false, asErr(e));
    return NextResponse.json(
      { ok: false, error: "バックアップに失敗しました。", logs },
      { status: 500 }
    );
  }
  log("backup", true, path.basename(backupPath));

  // ---- Atomic write (temp + rename) ----------------------------------
  const tmpPath = SLIDES_PATH + ".tmp." + stamp;
  try {
    await fs.writeFile(tmpPath, newJson, "utf-8");
    await fs.rename(tmpPath, SLIDES_PATH);
  } catch (e) {
    // Cleanup tmp file if it's still around
    await fs.unlink(tmpPath).catch(() => {});
    log("write", false, asErr(e));
    return NextResponse.json(
      { ok: false, error: "slides.json の書き込みに失敗しました。", logs },
      { status: 500 }
    );
  }
  log("write", true, `${newJson.length} bytes`);

  // ---- Git operations -------------------------------------------------
  // The dev server is started from the `web/` directory but the repo root
  // is one level up. Resolve repo root by walking up until we find `.git`.
  const repoRoot = await findRepoRoot(process.cwd());
  if (!repoRoot) {
    log("git-root", false, "リポジトリルート (.git) が見つかりません。");
    return NextResponse.json(
      {
        ok: false,
        error:
          "Git リポジトリが見つかりません。slides.json はローカルには保存されました。",
        logs,
      },
      { status: 500 }
    );
  }
  log("git-root", true, repoRoot);

  // Stage ONLY the slides.json file. This is critical: never run `git add .`
  // in case the user has other in-progress changes we shouldn't bundle.
  const addRes = runGit(repoRoot, ["add", "--", REPO_RELATIVE_SLIDES]);
  log("git-add", addRes.ok, addRes.detail);
  if (!addRes.ok) {
    return NextResponse.json(
      { ok: false, error: "git add に失敗しました。", logs },
      { status: 500 }
    );
  }

  // Check if there's actually anything to commit (defensive — covers the
  // case where the file content is identical at the byte level).
  const diffRes = runGit(repoRoot, [
    "diff",
    "--cached",
    "--quiet",
    "--",
    REPO_RELATIVE_SLIDES,
  ]);
  if (diffRes.ok) {
    // exit 0 from --quiet means NO diff (nothing staged).
    log("git-diff", true, "差分なし — コミットしません");
    return NextResponse.json({
      ok: true,
      noop: true,
      backup: path.basename(backupPath),
      logs,
    });
  }
  log("git-diff", true, "差分あり");

  // Build commit message
  const editedIds = (body.editedIds ?? []).filter((s) => typeof s === "string");
  const summary =
    editedIds.length > 0
      ? `${editedIds.length} スライド (${editedIds.slice(0, 8).join(", ")}${editedIds.length > 8 ? " …" : ""})`
      : "スライドを更新";
  const message =
    (body.commitMessage && body.commitMessage.trim()) ||
    `edit: ${summary}`;

  const commitRes = runGit(repoRoot, ["commit", "-m", message, "--", REPO_RELATIVE_SLIDES]);
  log("git-commit", commitRes.ok, commitRes.detail);
  if (!commitRes.ok) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "git commit に失敗しました (pre-commit フック等の可能性)。slides.json はローカルに保存済みです。",
        logs,
      },
      { status: 500 }
    );
  }

  // Capture the commit hash for the response.
  const hashRes = runGit(repoRoot, ["rev-parse", "--short", "HEAD"]);
  const commitHash = hashRes.ok ? hashRes.stdout.trim() : "";

  // Push (only if a remote tracking branch is configured).
  const upstreamRes = runGit(repoRoot, [
    "rev-parse",
    "--abbrev-ref",
    "--symbolic-full-name",
    "@{u}",
  ]);
  if (!upstreamRes.ok) {
    log("git-push", false, "upstream 未設定 — push はスキップしました");
    return NextResponse.json({
      ok: true,
      committed: true,
      pushed: false,
      commitHash,
      backup: path.basename(backupPath),
      logs,
    });
  }
  log("git-upstream", true, upstreamRes.stdout.trim());

  const pushRes = runGit(repoRoot, ["push"]);
  log("git-push", pushRes.ok, pushRes.detail);
  if (!pushRes.ok) {
    return NextResponse.json(
      {
        ok: false,
        committed: true,
        pushed: false,
        commitHash,
        error: "git push に失敗しました。手動で push し直してください。",
        logs,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    committed: true,
    pushed: true,
    commitHash,
    backup: path.basename(backupPath),
    logs,
  });
}

/* ------------------------------------------------------------------ */

interface ValidateResult {
  ok: boolean;
  error?: string;
  slidesCount?: number;
}

function validateAppData(input: unknown): ValidateResult {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "appData が object ではありません。" };
  }
  const obj = input as Record<string, unknown>;
  if (!obj.meta || typeof obj.meta !== "object") {
    return { ok: false, error: "meta が欠落しています。" };
  }
  if (!obj.citations || typeof obj.citations !== "object") {
    return { ok: false, error: "citations が欠落しています。" };
  }
  if (!Array.isArray(obj.slides)) {
    return { ok: false, error: "slides が配列ではありません。" };
  }
  const slides = obj.slides as Array<Record<string, unknown>>;
  if (slides.length === 0) {
    return { ok: false, error: "slides が空です。" };
  }
  // Check each slide minimally.
  const seenIds = new Set<string>();
  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    if (typeof s.id !== "string" || !s.id) {
      return { ok: false, error: `slides[${i}].id が不正です。` };
    }
    if (seenIds.has(s.id)) {
      return { ok: false, error: `slides[${i}].id "${s.id}" が重複しています。` };
    }
    seenIds.add(s.id);
    if (typeof s.title !== "string") {
      return { ok: false, error: `slides[${i}].title が string ではありません (${s.id}).` };
    }
    if (typeof s.section !== "string") {
      return { ok: false, error: `slides[${i}].section が string ではありません (${s.id}).` };
    }
    if (typeof s.narration !== "string") {
      return { ok: false, error: `slides[${i}].narration が string ではありません (${s.id}).` };
    }
    if (typeof s.order !== "number") {
      return { ok: false, error: `slides[${i}].order が数値ではありません (${s.id}).` };
    }
    if (!s.visual || typeof s.visual !== "object") {
      return { ok: false, error: `slides[${i}].visual が欠落しています (${s.id}).` };
    }
    const v = s.visual as Record<string, unknown>;
    if (typeof v.type !== "string") {
      return { ok: false, error: `slides[${i}].visual.type が欠落しています (${s.id}).` };
    }
    if (!v.data || typeof v.data !== "object") {
      return { ok: false, error: `slides[${i}].visual.data が欠落しています (${s.id}).` };
    }
  }
  return { ok: true, slidesCount: slides.length };
}

function runGit(cwd: string, args: string[]): { ok: boolean; detail: string; stdout: string; stderr: string } {
  const r = spawnSync("git", args, {
    cwd,
    encoding: "utf-8",
    windowsHide: true,
    timeout: 60_000,
  });
  const stdout = r.stdout ?? "";
  const stderr = r.stderr ?? "";
  const ok = r.status === 0;
  // Compose a one-line detail for logs without flooding.
  const detail =
    `git ${args.join(" ")} → ${r.status ?? "(no-status)"}` +
    (stderr.trim() ? ` | ${stderr.trim().split(/\r?\n/).slice(0, 2).join(" / ")}` : "") +
    (stdout.trim() && !stderr.trim() ? ` | ${stdout.trim().split(/\r?\n/).slice(0, 2).join(" / ")}` : "");
  return { ok, detail, stdout, stderr };
}

async function findRepoRoot(start: string): Promise<string | null> {
  let cur = start;
  for (let i = 0; i < 8; i++) {
    try {
      const stat = await fs.stat(path.join(cur, ".git"));
      if (stat.isDirectory() || stat.isFile()) return cur;
    } catch {
      /* not here */
    }
    const parent = path.dirname(cur);
    if (parent === cur) return null;
    cur = parent;
  }
  return null;
}

function asErr(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
