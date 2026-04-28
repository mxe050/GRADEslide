# 作業再開メモ (Step 2 完了時点)

最終更新: 2026-04-28
ターゲット GitHub リポジトリ: https://github.com/mxe050/GRADEslide (空、未連携)

## 現在の状態

- **Next.js 16.2.4 / React 19 / Tailwind v4** でプロジェクト初期化済み (`web/`)
- 第0部 (N1〜N6) + 第1〜3部 (S1〜S106) を **slides.json** に取り込み済み (合計 112 スライド)
- 主要改訂版 (S6/S8/S25/S33/S86/S99) は仕様書 5.2/5.3 から override 適用済み
- 自動抽出が苦手だった 19枚 (S12/S15/S16/S27/S31/S54/S63/S64/S66/S67/S68/S69/S71/S79/S81/S87/S91/S94/S103) は **TITLE_OVERRIDES** で人手調整済み (タイトルのみ差し替え、本文は自動生成のまま)
- 残り 87 枚は `pptx_work/extracted_output/extracted.json` から自動生成
  - Visual type 内訳: card 63 / table 22 / imageCard 15 / image 3 / quote 2 / list 1
- 画像 18枚を `web/public/images/slides/` にコピー済み
- ローカル dev server で動作確認済み (N1〜N6, S1, S6, S9, S25, S37, S86, S99, S106 全て 200)
- 開発サーバーは停止済み

## 完了したファイル一覧

### データ層
- `web/public/data/slides.json` — N1〜N6 + 引用文献データ (Sackett1996, Users' Guides 2015, IOM 2011, Core GRADE 1/2/4, ROBUST-RCT, Amrhein 2019)
- `web/src/lib/types.ts` — Slide / Visual 型 (card, table, comparison, quote, list, image, imageCard, imageComparison)
- `web/src/lib/slides.ts` — getSlideById / getNeighbors などのヘルパー
- `web/src/lib/store.ts` — Zustand ストア (fontSize / theme / presentMode / lastSlideId)

### UI コンポーネント
- `web/src/app/layout.tsx` — Noto Sans JP + テーマ
- `web/src/app/page.tsx` — `/` から N1 へ 307 リダイレクト
- `web/src/app/slide/[id]/page.tsx` — Server Component (params await), generateStaticParams
- `web/src/components/SlideView.tsx` — メインビュー、キーボード/スワイプ対応、講演モード切替
- `web/src/components/VisualPanel.tsx` — 8種のビジュアルレンダラー
- `web/src/components/NarrationPanel.tsx` — 解説 + warnings + 参考文献 + speakerNotes
- `web/src/components/NavBar.tsx` — 目次/最初/フォントサイズ/講演モード
- `web/src/components/NavFooter.tsx` — 前へ/次へ + 進捗
- `web/src/components/ProgressBar.tsx` / `TableOfContents.tsx` / `MarkdownText.tsx`

### 画像
- `web/public/images/intro/` に rct.jpg / rct-g.jpg / sr.jpg / sr-g.jpg / cpg.jpg / cpg-g.jpg / observational.jpg / observational-g.jpg / basic.jpg / basic-g.jpg
  (元の `intro/` のJapanese filename を ASCII に rename してコピー)
- `web/public/images/slides/` に slide{N}_shape{M}.{ext} を 18枚コピー (extracted_output/images から build-slides.mjs が転送)

### Step 2 で追加したファイル
- `web/scripts/build-slides.mjs` — extracted.json → S1〜S106 を slides.json に変換するビルドスクリプト
  - title 抽出 heuristic: 上位5シェイプをスコアリング（短い文・大きいフォント・「タイトル」名・上位置を優先、citation 末尾は除去）
  - VisualType 自動推定: table > imageCard > image > card の優先順
  - 改訂版 override (S6/S8/S25/S33/S86/S99) は REVISED_OVERRIDES、タイトルのみ改訂は TITLE_OVERRIDES (19件) に記載
  - 再実行: `cd web && node scripts/build-slides.mjs`

### Step 3a で追加したファイル (ダークモード手動切替)
- `web/src/components/ThemeSync.tsx` — store の theme を `<html data-theme>` に同期
- `web/src/app/layout.tsx` — pre-hydration script で localStorage を先読み (FOUC 防止)
- `web/src/app/globals.css` — `:root[data-theme="light"]`, `:root[data-theme="dark"]` トークンを追加
- `web/src/components/NavBar.tsx` — ThemeToggle (◐ system → ☀ light → ☾ dark でサイクル)

### Step 3b で追加したファイル (スライド遷移アニメ)
- `web/src/components/SlideView.tsx` — `AnimatePresence mode="wait"` + `motion.main`/`motion.div` で `key={slide.id}` 指定
  - 遷移: opacity + y 8px, 180ms easeOut (controlled, subtle)
  - 通常モード・講演モード両方に適用
  - prefers-reduced-motion は Framer Motion が自動配慮

### Step 3c で追加したファイル (用語集ポップアップ)
- `web/public/data/glossary.json` — GRADE 主要用語 19件 (GRADE, EBM, SR, NMA, RCT, 確実性, バイアス, 非一貫性, 非直接性, 不精確さ, 出版バイアス, PICO, 推奨の強さ, GPS, EtD, ADOLOPMENT, ROBUST-RCT, IOM 等)
- `web/src/lib/glossary.ts` — `splitTextByTerms` で長一致優先のマッチング
- `web/src/components/GlossaryTerm.tsx` — 点線下線ボタン + クリックでポップオーバー (Esc / 外クリックで閉じる、aria-expanded/aria-describedby)
- `web/src/components/MarkdownText.tsx` — react-markdown の p/li/td/th/strong/em カスタムレンダラーで `splitTextByTerms` を適用

### Step 3d で追加したファイル (ブックマーク UI)
- `web/src/components/NavBar.tsx` — 「続き (S{n})」ボタンを追加
  - `lastSlideId` が現在のスライドと違うとき *だけ* 表示
  - SSR 時は表示せず、Zustand persist の `useStoreHydrated()` (useSyncExternalStore) で hydration 完了後にフラッシュなしで現れる
  - lastSlideId は SlideView の useEffect で常時保存済み (Step 1 から動作)

### Step 3e で追加したファイル (講演者ノート別ウィンドウ)
- `web/src/app/notes/[id]/page.tsx` — `/notes/{id}` 用の Next ルート (generateStaticParams で全スライド)
- `web/src/components/NotesView.tsx` — ナレーション/警告/講演者ノートをシンプル表示
  - `BroadcastChannel("gradeslide-presenter")` を購読し、メインウィンドウでスライドが変わると `router.replace` で追従
- `web/src/components/SlideView.tsx` — 全モードで slide.id を BroadcastChannel に publish
  - 講演モード右上に「ノート ↗」ボタンを追加し、`window.open('/notes/{id}', 'gradeslide-notes', '...')` で別ウィンドウを開く

**使い方**: 講演モードに入って「ノート ↗」をクリック → 別ウィンドウでナレーションだけが見える。スライドを次/前に動かすと別ウィンドウも自動追従。

## 自宅で再開する手順

1. このフォルダで Claude Code を開く
2. ターミナルで:
   ```bash
   cd web
   # node_modules が壊れている / 同期が不完全な場合のみ:
   # cmd /c "npm install"
   cmd /c "npm run dev"
   ```
3. ブラウザで http://localhost:3000 (または表示された port) を開く
4. `/` が `/slide/N1` にリダイレクトされる

### キー操作
- `→` / `Space` : 次へ
- `←` : 前へ
- `T` : 目次を開く
- `P` または `F` : 講演モード切替
- `Esc` : 目次/講演モードを閉じる

## 既知のメモ・注意

- **Google Drive 配下なのでファイルシステムが遅い**: Next.js が初回コンパイルに 5〜10 分かかる場合あり (`/.next/dev` の slow filesystem warning)。気になるなら `C:\dev\GRADEslide` などDrive外にコピーして開発推奨。
- **node_modules は Drive 同期しない方が良い** (数万ファイル)。同期途中で止まる場合は `web/node_modules` を削除して `npm install` で再構築。
- **AGENTS.md / CLAUDE.md** が `web/` 直下にある (Next 16 のbreaking change警告)。Next 14 の感覚で書くと壊れるので `web/node_modules/next/dist/docs/` を参照。
- 内側の `.git` (web/.git) は削除済み。プロジェクトルートで git init していない。

## 次のステップ候補 (Step 3 以降)

仕様書: `new/claudecode-handoff-spec.md` (このフォルダ内)

### Step 2 で残した課題
- ✅ 切り詰めタイトル (S27/S64/S66/... 計19枚) は TITLE_OVERRIDES で対応済み (`Long titles (>40): 0`, `Truncated titles: 0`)
- imageCard の bullets が長すぎる/重複する場合あり (heuristic を要見直し)
- 仕様書 5.2/5.3 で書かれていない改訂スライドは未反映 (約30枚予定)
- 各スライドの **本文 (narration / bullets / table)** は自動抽出のままで未レビュー — 講演で使う場合は1枚ずつ確認推奨

### Step 3 案 (進捗)
- ✅ ダークモード手動切替トグル (Step 3a)
- ✅ スライド遷移 Framer Motion アニメ (Step 3b)
- ✅ 用語集ポップアップ (Step 3c) — 19用語、点線下線+クリックポップオーバー
- ✅ ブックマーク UI (Step 3d) — NavBar に「続き」ボタン
- ✅ 講演者ノート別ウィンドウ (Step 3e) — /notes/[id] + BroadcastChannel 同期

### Step 4 案
- coreGRADE/paper/*.pdf からの引用ポップアップ
- ブックマーク機能 (lastSlideId は実装済み、UI追加)
- GitHub repo 連携 (git init at root, remote add origin, push to mxe050/GRADEslide)
- Vercel / Netlify デプロイ
- Drive 配下が遅すぎる場合は `C:\dev\GRADEslide` にコピーして開発推奨 (RESUME.md 既知の注意 参照)

## 設定ファイル

- `.claude/settings.json` (今回追加) — PowerShell 読み取り系 cmdlet を許可済み
- `.claude/settings.local.json` (旧) — 個別の PowerShell コマンド許可
- `web/eslint.config.mjs` / `web/tsconfig.json` / `web/next.config.ts` — デフォルトのまま
