# 作業再開メモ

## Steps 10〜21 (G先生リネーム + 全面リッチ化, 2026-04-29)

### Step 10: G先生リネーム + イントロ刷新
- 「Guyatt先生 / ガイアット先生」 → **「G先生」**に全置換 (実在人物参照は
  「Gordon Guyatt 教授」/引用は「Guyatt GH」 のまま)
- イントロ N1〜N22 を **A薬講演の批判的吟味会話** で刷新 (座長/発表者/G先生)
- 4 タイプ × 4 スライド構成 (基礎研究 → RCT → SR/MA → CPG)

### Step 11: UI/UX 改善
- **マークダウン太字 (`strong`) の青下線除去**: linear-gradient 背景を撤去、青文字のみに
- **目次セクション**: 「0. 導入：AI-EBM先生に学ぶ」 → 「**0. 導入：G先生に学ぶ**」
  (intro slides の section と一致させて「Step 2 以降で追加予定」 プレースホルダー解消)
- **「本日のメニュー」 重複** (S2/S3) を統合 (S3 削除)
- **S31 テーブル**を slide031.jpg に完全一致するように修正 (3行×4列)
- **S12〜S29 + S34/35** を `slideImage` に変換 (元 PPT レンダリング画像を採用)
- **モバイルナビフッター固定**: `sticky` → `fixed inset-x-0 bottom-0` でアドレスバー
  伸縮による「ふにゃふにゃ」 を解消

### Step 12 (Phase 1): CSS 配色拡張 + プレースホルダー一掃
- **新カラー**: `critical` (赤) / `info` (青系) / `highlight` (橙) を light/dark 両テーマに追加
- `.markdown-body em` を accent=赤系に: `**bold(青)**` + `*em(赤)*` のメリハリ
- `.stage-callout--{critical,warning,good,info,highlight}` 5 系統の枠付きボックス追加
- markdown 内 `<mark>` を赤マーカー装飾
- `CardVisual.accent` に "critical" / "info" / "highlight" を追加
- 「（このスライドには解説テキストが含まれていません…）」 プレースホルダー 14 枚 +
  S93 (S92 と完全重複だった card) — 計 15 枚を、元 PPT のレンダリング画像
  (`/images/slides-full/slideNNN.jpg`) に差し替え (slideImage 型)
- 全 106 枚の rendered_slides をリポジトリ同梱

### Steps 13〜18 (Phase 2-3): 重複統合と narration 整流
- **Step 13**: 重複スライド統合 — S43 削除 (S38 に narration 統合)、
  S40 リタイトル、S58/S59 を slideImage 化、S96/S97 副題で差別化
- **Step 14**: S46 を 4 役割の 2 列テーブル化、S37/S80/S104/S106 を slideImage 化、
  S4=warning, S5=info の accent 適用
- **Step 15**: セクション 2 の card 23 枚 (S42, S44, S47-S57, S60-S62, S65, S74-S76, S78,
  S81, S88) を slideImage に一括変換 (text-heavy で原 PPT に意味あるレイアウト)
- **Step 16**: S42〜S57 narration の **off-by-one 整流** (各スライドで
  本文(画像)と解説のトピックが 1 つずれていた問題を解消)
- **Step 17**: S60〜S76 narration を再配置 (元 PPT 画像参照で hallucination なし)
- **Step 18**: 残カード 8 枚に accent 配色 (S7/S9/S10/S36=info、S30/S39=warning、
  S32=good、S40=critical) + S80 narration 整流

### Step 19 (Phase 4-1): モバイル可読性 — slideImage タップ拡大
- `SlideImageR` に zoomable オプション追加。タップで全画面 z-60 モーダルが開き、
  画像を 100vw + 自然比で表示 (Esc / ✕ / 背景タップで閉じる)
- 64 枚の slideImage 全部に適用 → スマホでも PPT の細かい本文を精読可能に

### Step 20 (Phase 2-5): セクション 3 の off-by-3 整流
- S82-S87 ではナレーションがスライドのトピックから 3 つ後の内容を解説していた
  (例: S82 タイトル「具体例」 ← narration「Remarks の話」)
- S82/S83/S84 を元 PPT 画像 (slide082-084.jpg) ベースで書き起こし、旧 narration を
  S85/S86/S87/S88/S90 へ移動して整列

### Step 21: 最終ポリッシュ
- N3 (G先生とは) に `accent=info` 適用

### 現在の構成 (v0.16.0)
- **総スライド数**: 126 (元 131 → S2/S3 統合で -1、S43 統合で -1、観察研究セクション削除で -3)
- **イントロ N1〜N22**: 22 枚 (4 タイプ × 4 + 冒頭 3 + 締め 3)
- **第1部 S1〜S40**: 39 枚 (S3 削除により)
- **第2部 S41〜S76**: 35 枚 (S43 削除により)
- **第3部 S77〜S106**: 30 枚

### Visual type 内訳
- slideImage: 64 (元 PPT 画像、タップで拡大可能)
- card: 18 (うち 8 枚に accent 配色)
- table: 15
- image: 11
- imageCard: 9
- comparison: 4
- list: 3
- quote: 2

### Migration スクリプト (再現性のため残置)
- `scripts/step11-restructure.mjs`
- `scripts/step12-fix-placeholders.mjs`
- `scripts/step13-merge-dups.mjs`
- `scripts/step14-rich-styling.mjs`
- `scripts/step15-bulk-slideimage.mjs`
- `scripts/step16-realign-narrations-s42-s57.mjs`
- `scripts/step17-realign-narrations-s60-s76.mjs`
- `scripts/step18-rich-accents.mjs`
- `scripts/step20-realign-section3.mjs`

## Step 9 (Guyatt 先生モノローグ + スマホ最適化, 2026-04-29)

- **作業フォルダを `C:\Users\yuasa\Desktop\GRADEslide` に移動** (Drive 同期負荷で
  Windows がフリーズする問題への対策)。Drive 配下のフォルダはバックアップ。
- **フォントサイズ A大/中/小 のバグ修正**: `.reading-stage` が自身に
  `--stage-scale: 1` を上書きしていたため、親要素 `.text-scale-*` が無効化されて
  いた → 削除して継承させた。NavBar も A小/中/大の 3 ボタン分離に変更。
- **配色・タイポを「学術大会で見やすい」基準に再設計**: globals.css 全面書き換え。
  原 PowerPoint の濃紺ヘッダーバンドを再現する `.stage-section-band` を追加、
  cqw + clamp() ベースのタイポは scale 変数で大中小を反映。
- **解説欄の会話形式を完全に廃止**: NarrationPanel から `parseDialogue` を削除し、
  Markdown を地の文として表示。
- **131 スライド全ての narration を speak.txt 講演をベースに書き直し**:
  - イントロ N1〜N4 を 「**ガイアット先生(架空の教育キャラ)が S1 へ繋ぐ短い前置き**」 に圧縮、
    N5〜N25 はオプション章扱いに narration を簡素化。
  - S1〜S40 (第1部 定義): EBM/SR/メタ分析/シンプソン/フォレストプロット/5要因 を speak.txt に従って解説。
  - S41〜S76 (第2部 作成): パネル構成/COI/PICO/アウトカム選定/推奨の方向と強さ。
  - S77〜S106 (第3部 推奨): EtD/SoF/MID/絶対効果/アウトカム重み付け定量化。
- **citations を 35 件に拡張**: Core GRADE 0〜7 全巻、Lima/Guyatt 2023、
  Schünemann 2016 EtD、Guyatt 2025 講演・QA、ROBINS-I、RoB 2、PRISMA 2020、
  Cochrane Handbook、IOM Trustworthy 2011、WHO Statement Taxonomy 等。
- **Drive 同期負荷の追加対策**:
  - `next.config.ts` で webpack の watchOptions に `node_modules`/`.next`/`.git` を ignore。
  - dev script を `cross-env NEXT_TELEMETRY_DISABLED=1 next dev` に変更してテレメトリの
    ネットワーク往復を停止。
  - `next build` は今後デフォルトでは実行しない方針(`npm run typecheck` で代替)。
- 旧 `web/.next/` (304MB / 1373 ファイル) を削除済み。
- 新規スクリプト: `web/scripts/rewrite-narrations.mjs`(再実行可能)。

## Step 4 (ビジュアル大改造)
- `pptx_work/sample.pptx` を PowerPoint COM (PowerShell) で 1600×900 JPEG に
  全 106 枚レンダリング → `web/public/images/slides-full/slide{NNN}.jpg`
- 新 VisualType **`slideImage`**: 画像のみフルブリード表示、タイトル文字オーバーレイなし
- 新 VisualType **`imagePair`**: 2枚の画像を横並びで表示、各下に小さなキャプションのみ
- `build-slides.mjs` を改修: S1〜S106 の visual を一律 `slideImage` に
- intro N1〜N6 を **N1〜N10** に再設計し `intro/` の 5 ペア画像を全部使用:
  - N1: 仮想症例 (text card / warning)
  - N2: 6つの確認 (table)
  - N3: AI-EBM 先生紹介 (text card)
  - N4: RCT 対比 (imagePair)
  - N5: SR 対比 (imagePair)
  - N6: 診療ガイドライン 対比 (imagePair)
  - N7: 観察研究 対比 (imagePair)
  - N8: 基礎研究 対比 (imagePair)
  - N9: 4 原則 (list)
  - N10: ロードマップ (list)
- 合計 **116 スライド** (intro 10 + S1〜S106)
- 講演モードでは画像のみ最大表示 (NarrationPanel は元から表示しない)

## 旧経緯メモ (Step 2 時点)

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
- ✅ 講演モード 16:9 余白調整 (Step 3f) — `width: min(100%, 100svh*16/9)` で portrait 対応 + 進捗バー

### Step 4a: GitHub 連携 完了
- ルート (`F:/.../GRADEslide`) に git init、初期コミットを main に push 済み
- リモート: https://github.com/mxe050/GRADEslide (PUBLIC)
- `.gitignore` 構成: `web/node_modules/`, `web/.next/`, `pptx_work/extracted_output/`, `pptx_work/sample.pptx`, `/intro/`, `新しいテキスト ドキュメント.txt` を除外

### Step 4b: Vercel デプロイ (Root Directory = `web` で設定すること)
**初回 import がうまくいかなかった原因**: vercel.json で `cd web && npm install` していたが、Vercel はフレームワーク検出時に **Root Directory の package.json** を直接読むため、ルートに package.json がないと "No Next.js version detected" エラー。
→ 解決策: vercel.json を削除 (commit c89a222)、Vercel ダッシュボードで Root Directory を `web` に設定する。

**ダッシュボードでの設定手順** (失敗した deployment から修正する場合):
1. プロジェクト → **Settings** → **Build and Deployment** → **Root Directory**
2. 値を `web` に変更して **Save**
3. Framework Preset が Next.js になっているか確認 (なっていなければ手動で選択)
4. 失敗した deployment ページの **Redeploy** (Build Cache は OFF) をクリック

**新規 import するなら**:
1. https://vercel.com/new → mxe050/GRADEslide を Import
2. **Configure Project** で **Root Directory** を `web` に設定
3. Framework Preset = Next.js (自動検出)
4. Deploy

**今後の更新フロー (修正作業が簡単な構成)**:
1. ローカルで編集して `git push`
2. Vercel が自動でデプロイ (Preview = PR、Production = main)
3. 一切ターミナル不要 ⇒ "修正作業が簡単"

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
