# 診療ガイドライン学習Webアプリ 開発仕様書 v1.0

> このドキュメントは、Claude Code に直接渡してアプリ開発を依頼するための仕様書です。
> 必要なすべての情報（要件、データ構造、スライド内容、実装ヒント）を含みます。

---

## 0. プロジェクト概要

### 目的
GRADEアプローチに基づく **診療ガイドラインの定義・作成・推奨決定** を学ぶインタラクティブWebアプリを開発する。

### 利用シーン
1. **スマホでの自学習**：通勤中・隙間時間に1スライドずつ学ぶ
2. **PC での講演**：会場で 16:9 全画面表示してプレゼンに使う
3. **PC での復習**：講演後の自学習でスライドと解説を読む

### コンテンツ構成
- 全体 **約 112 スライド**（既存 106 + 新規導入 N1〜N6）
- 構成：
  - 第0部：導入（AI-EBM先生による対比）
  - 第1部：診療ガイドラインの定義を「なぜ？」から理解
  - 第2部：診療ガイドライン作成プロセス
  - 第3部：推奨決定の深い考察

---

## 1. 機能要件

### 1.1 必須機能（MVP）

| # | 機能 | 詳細 |
|---|---|---|
| F1 | スライド表示 | 1スライド1画面の縦スクロール（スマホ）／全画面（PC講演） |
| F2 | 次へボタン | スマホで親指が届く下部に大きく配置 |
| F3 | 戻るボタン | 同様に下部に配置 |
| F4 | 目次表示 | ハンバーガーメニューで全スライドリスト表示、タップでジャンプ |
| F5 | 最初に戻るボタン | 1スライド目に即ジャンプ |
| F6 | 進捗バー | 上部に薄く表示（現在 / 全体） |
| F7 | レスポンシブ対応 | スマホ縦 / PC通常 / PC 16:9 講演モード |
| F8 | キーボード操作 | PC：← → / Space / Esc（目次） |

### 1.2 推奨機能（Phase 2）

| # | 機能 | 詳細 |
|---|---|---|
| F9 | スワイプ対応 | スマホで左右スワイプで前後移動 |
| F10 | ダークモード | システム設定追従＋手動切替 |
| F11 | フォントサイズ調整 | 3段階（小・中・大） |
| F12 | ブックマーク | 「ここまで読んだ」を localStorage に保存、次回再開 |
| F13 | 用語集ポップアップ | GRADE用語にホバー／タップで定義表示 |
| F14 | 講演モード切替 | PCで「講演モード」ボタン → 16:9全画面、講演者ノート別画面 |

### 1.3 非対応スコープ（v1 では作らない）
- ユーザー認証・アカウント
- 進捗の他デバイス同期
- クイズ・テスト機能
- コメント・SNS共有

---

## 2. UI/UX 設計

### 2.1 デバイス分岐

| 表示環境 | レイアウト | 用途 |
|---|---|---|
| スマホ縦 (< 768px) | **縦長レイアウト** | 自学習 |
| PC通常 (>= 768px、通常表示) | **読書レイアウト** | 復習・じっくり読む |
| PC講演モード (16:9 フルスクリーン) | **講演レイアウト** | 会場プレゼン |

### 2.2 スマホレイアウト（デフォルト）

```
┌─────────────────────────────┐
│ ━━━━━━━░░░░░░░░░░░░ (進捗バー)│  ← 上部に薄く
├─────────────────────────────┤
│ ☰ 目次          🏠 最初      │  ← 上部固定バー
├─────────────────────────────┤
│                             │
│   [ ビジュアル領域 ]          │  ← 上半分：図・表・要約
│   タイトル                    │     スライドのまとめ
│   ┌───────────────────┐     │
│   │ 表 / 図 / カード    │     │
│   │ ※スワイプで拡大可 │     │
│   └───────────────────┘     │
│                             │
├─────────────────────────────┤
│                             │
│   [ 解説テキスト領域 ]        │  ← 下半分：読み物テキスト
│   読みやすい本文              │     講演で語る内容
│   ・ポイント                 │     スクロール可
│   ・補足                     │
│                             │
├─────────────────────────────┤
│  [ ◀ 前へ ]    [ 次へ ▶ ]    │  ← 下部固定：大きなタップ領域
└─────────────────────────────┘
```

**設計原則**
- ビジュアル領域：画面の上 40〜50%、固定高さ（スクロールしない）
- 解説テキスト領域：残り、内部スクロール可能
- ナビボタン：高さ 56px 以上（指で押しやすい）、画面下部固定

### 2.3 PC通常モード（読書）

```
┌──────────────────────────────────────────────────┐
│ ━━━━━━━━━━━━━━░░░░░░░░░░░░░░░░░░░░ (進捗バー)      │
├──────────────────────────────────────────────────┤
│ ☰ 目次  ◀ 前へ          スライド N3 / 112    次へ ▶ 🏠│
├──────────────────────────────────────────────────┤
│                            │                       │
│                            │                       │
│   [ ビジュアル領域 ]        │   [ 解説テキスト ]      │
│   （左 60%）                │   （右 40%）          │
│                            │                       │
│                            │                       │
│                            │                       │
└──────────────────────────────────────────────────┘
```

**設計原則**
- 横並び 2カラム（左：ビジュアル、右：解説）
- 講演モード切替ボタンを右上に

### 2.4 PC講演モード（16:9 全画面）

```
┌──────────────────────────────────────────────────┐
│                                                  │
│                                                  │
│         [ ビジュアル領域 のみ表示 ]              │
│         （PowerPoint風の 16:9 スライド）          │
│                                                  │
│                                                  │
│                                                  │
│                                                  │
│                                                  │
│                              N3 / 112  → 次へ    │
└──────────────────────────────────────────────────┘
```

**設計原則**
- ビジュアル領域のみ表示、余白を黒で埋める
- 解説テキストは別ウィンドウ（講演者ノート）として開ける
- キーボードで操作（→ / ←）
- マウスを動かしたときだけ右下にナビ表示

### 2.5 共通コンポーネント

| コンポーネント | 役割 |
|---|---|
| `<SlideContainer>` | スライド全体ラッパー |
| `<VisualPanel>` | ビジュアル領域（上／左） |
| `<NarrationPanel>` | 解説テキスト領域（下／右） |
| `<NavBar>` | 上部バー（目次・最初に戻る） |
| `<NavFooter>` | 下部バー（前へ・次へ） |
| `<ProgressBar>` | 進捗バー |
| `<TableOfContents>` | 目次モーダル |
| `<VisualRenderer>` | ビジュアルタイプ別レンダラー |

---

## 3. 技術スタック推奨

### 3.1 フレームワーク
- **Next.js 14+ (App Router)** または **Astro**
- 静的サイト生成（SSG）で配信を軽量化
- 認証不要・データ更新不要なので、サーバサイド機能は最小限

### 3.2 スタイリング
- **Tailwind CSS**（必須）
- ベース：mobile-first、ブレークポイント `md:` (768px)、`lg:` (1024px)
- 16:9 講演モード用カスタムクラス

### 3.3 状態管理
- **Zustand** または **React Context**
- 管理する状態：
  - 現在のスライドID
  - 目次モーダルの開閉
  - 講演モードのオン／オフ
  - 表示設定（フォントサイズ、ダークモード）

### 3.4 アニメーション
- **Framer Motion**（推奨）
- スライド遷移：左右スライドアニメーション
- モーダル開閉：fade + scale

### 3.5 データ
- **静的JSONファイル**（`/public/data/slides.json`）として配置
- ビルド時に読み込み、ランタイムで参照

### 3.6 デプロイ先候補
- Vercel（Next.js なら自然）
- Netlify
- Cloudflare Pages
- GitHub Pages（Astroなら）

---

## 4. データ構造

### 4.1 スライドスキーマ（TypeScript）

```typescript
type SlideId = string; // "N1", "S1", "S46" など

type VisualType = 
  | 'card'        // タイトル + 箇条書き／カード（デフォルト）
  | 'table'       // 表（汎用）
  | 'comparison'  // 2列比較表（信頼できる/できない、RCT/RCTG など）
  | 'quote'       // 引用ブロック（定義など）
  | 'list'        // 番号付き／なしリスト
  | 'image'       // 画像 + キャプション
  | 'forest'      // フォレストプロット（カスタム描画）
  | 'sof';        // SoF表（カスタム描画）

interface CardVisual {
  type: 'card';
  data: {
    heading?: string;
    bullets?: string[];   // markdown対応
    body?: string;        // markdown対応、bullets と排他
  };
}

interface TableVisual {
  type: 'table';
  data: {
    headers: string[];
    rows: string[][];
    caption?: string;
  };
}

interface ComparisonVisual {
  type: 'comparison';
  data: {
    leftHeader: string;
    rightHeader: string;
    rows: { left: string; right: string }[];
    caption?: string;
  };
}

interface QuoteVisual {
  type: 'quote';
  data: {
    text: string;
    citation?: string;
  };
}

interface ListVisual {
  type: 'list';
  data: {
    ordered: boolean;
    items: { text: string; subItems?: string[] }[];
  };
}

interface ImageVisual {
  type: 'image';
  data: {
    src: string;
    alt: string;
    caption?: string;
  };
}

type Visual = CardVisual | TableVisual | ComparisonVisual | QuoteVisual | ListVisual | ImageVisual;

interface Slide {
  id: SlideId;
  order: number;
  section: string;          // "0. 導入" / "1. 定義の理解" など
  title: string;
  visual: Visual;
  narration: string;        // markdown, 解説テキスト
  speakerNotes?: string;    // 講演者ノート
  warnings?: string[];      // 重要な注意（要確認事項など）
}

interface AppData {
  meta: {
    title: string;
    version: string;
    sections: { id: string; title: string; startSlideId: SlideId }[];
  };
  slides: Slide[];
}
```

### 4.2 セクション一覧

```json
{
  "sections": [
    { "id": "intro", "title": "0. 導入：AI-EBM先生に学ぶ", "startSlideId": "N1" },
    { "id": "definition", "title": "1. 診療ガイドラインの定義を理解", "startSlideId": "S1" },
    { "id": "creation", "title": "2. 診療ガイドライン作成を学ぶ", "startSlideId": "S41" },
    { "id": "recommendation", "title": "3. 推奨決定の深い考察", "startSlideId": "S77" }
  ]
}
```

---

## 5. スライドデータ（実装用 JSON）

### 5.1 第0部：導入（N1〜N6） — 完全版

```json
[
  {
    "id": "N1",
    "order": 1,
    "section": "0. 導入：AI-EBM先生に学ぶ",
    "title": "想像してみてください — こんな講演に出会ったら？",
    "visual": {
      "type": "card",
      "data": {
        "heading": "演題：「X薬の革新的な臨床効果」",
        "bullets": [
          "最新の Phase III RCT (Yuasa et al., 2024) にて、X薬は対照群と比較し**有意な無増悪生存期間（PFS）の延長**を認めた",
          "**HR 0.65** (95%CI 0.52–0.81), **P < 0.001**",
          "副作用は管理可能、QOL も維持された",
          "**結論：X薬は新たな標準治療となるべきである**"
        ]
      }
    },
    "narration": "ある学会のシンポジウムで、こんなスライドが出てきました。最新の第III相試験で有意な効果が示されたX薬。\n\nあなたは、この講演を聞いてどう反応しますか？\n\n「効果あり、すぐに使おう」と思うでしょうか？それとも、何か違和感を持つでしょうか？",
    "speakerNotes": "聴衆に問いかけて5〜10秒、考える時間をとる"
  },
  {
    "id": "N2",
    "order": 2,
    "section": "0. 導入：AI-EBM先生に学ぶ",
    "title": "「効果あり」と即断してよいか — 6つの確認",
    "visual": {
      "type": "table",
      "data": {
        "headers": ["#", "確認すべき問い"],
        "rows": [
          ["1", "この**1つのRCTだけ**で判断してよいか？"],
          ["2", "この結果を**支持しない／反対する研究**は本当に存在しないか？"],
          ["3", "このRCT自体に**バイアス**はないか？（ランダム化、盲検化、脱落、追跡期間…）"],
          ["4", "**患者にとって重要なアウトカム**が評価されているか？（PFSは代替指標。OS、QOLは？）"],
          ["5", "効果（益）だけで、**害**はどう評価されたか？"],
          ["6", "コスト・**患者の価値観**・実行可能性は考慮されているか？"]
        ]
      }
    },
    "narration": "もしこれら6つの確認に答えられないとすれば、その講演は **エビデンスの「点」を見せられているだけ** です。\n\n単一のRCTがどれだけ「有意」であっても、それは全体の中の1つに過ぎません。反対する研究があれば、結論は変わるかもしれない。バイアスがあれば、結果は信用できないかもしれない。\n\n本当に意味のある臨床判断には、これらすべてに答えられる枠組みが必要です。"
  },
  {
    "id": "N3",
    "order": 3,
    "section": "0. 導入：AI-EBM先生に学ぶ",
    "title": "もし AI-EBM 先生が同じ講演をするなら",
    "visual": {
      "type": "card",
      "data": {
        "heading": "演題：「X薬の臨床的価値：体系的評価と推奨」",
        "bullets": [
          "**エビデンスの総体**：体系的検索で4本のRCTを同定（Aihara, Nangou, Yuasa, Tange）／メタ分析 HR 0.85 (95%CI 0.72–1.01)",
          "**エビデンスの確実性（GRADE）**：効果（益）= 中、害 = 高（G3以上の有害事象が10%増加）",
          "**患者にとって重要なアウトカム**：PFSのみではなく、OS・QOL・有害事象 すべてを評価",
          "**推奨**：益と害のバランス、患者価値観のばらつきを考慮し、**特定の患者集団に条件付きで提案（弱い推奨）**"
        ]
      }
    },
    "narration": "では、同じテーマを EBM の大家が語るとどうなるでしょうか？\n\n**AI-EBM先生は、本セッション専用に設定した架空の教育用キャラクターです。** EBM・GRADEアプローチの公開された原則を体現していますが、実在の特定の人物を表すものではありません。\n\nAI-EBM先生は、単一のRCTではなく、すべてのRCTを集めたメタ分析の結果を示します。さらに、エビデンスの確実性、害、患者の価値観まで踏み込んで、構造化された推奨にたどり着きます。",
    "speakerNotes": "AI-EBM先生のキャラクター紹介時に、必ず「架空」と明言する",
    "warnings": ["AI-EBM先生は架空の教育用キャラクター。実在の特定の人物を表すものではない"]
  },
  {
    "id": "N4",
    "order": 4,
    "section": "0. 導入：AI-EBM先生に学ぶ",
    "title": "RCT.jpg と RCTG.jpg — その本質的な違い",
    "visual": {
      "type": "comparison",
      "data": {
        "leftHeader": "RCT.jpg の講演",
        "rightHeader": "RCTG.jpg の講演（AI-EBM先生）",
        "rows": [
          { "left": "**単一 RCT**", "right": "**エビデンス総体**（SR + メタ分析）" },
          { "left": "確実性に言及なし", "right": "**GRADE で 5 要因を体系的に評価**" },
          { "left": "効果のみ", "right": "**益と害の両方**" },
          { "left": "価値観に言及なし", "right": "**患者価値観・意向** を組み込み" },
          { "left": "「標準治療となるべき」と断定", "right": "**方向と強さ** を明示（条件付きの提案）" },
          { "left": "講師の主観", "right": "**再現可能なプロセス**" }
        ]
      }
    },
    "narration": "6つの観点で対比してみましょう。エビデンスの扱い、確実性、アウトカム、価値観、推奨の構造、透明性 — すべてが本質的に違います。\n\nなぜ、こんなに違うのか？答えは EBM の本質にあります。"
  },
  {
    "id": "N5",
    "order": 5,
    "section": "0. 導入：AI-EBM先生に学ぶ",
    "title": "ポイント：AI-EBM 先生の講演に込められた EBM の核心",
    "visual": {
      "type": "list",
      "data": {
        "ordered": true,
        "items": [
          {
            "text": "**エビデンスは「点」ではなく「総体」で評価する**",
            "subItems": [
              "1つのRCTは絶対ではない",
              "系統的なレビューで、反対する研究まで含めて統合する"
            ]
          },
          {
            "text": "**エビデンスの確実性を体系的に評価する**",
            "subItems": [
              "「効果あり／なし」ではなく「どれくらい確かか」を評価",
              "GRADE アプローチが世界標準"
            ]
          },
          {
            "text": "**エビデンスだけでは臨床決断はできない**",
            "subItems": [
              "益と害のバランス、患者の価値観・意向、コスト、実行可能性まで考慮",
              "これは EBM の基本原則の一つ"
            ]
          },
          {
            "text": "**プロセスは再現可能で透明であるべき**",
            "subItems": [
              "個人の意見ではなく、構造化された方法で",
              "誰が再評価しても、同じ結論に近づける"
            ]
          }
        ]
      }
    },
    "narration": "AI-EBM先生の講演に込められた EBM の核心は、この4原則です。\n\nそれぞれ、本日の講演で詳しく扱っていきます。今は、「これらの4つが大切なんだ」というイメージを持ってください。"
  },
  {
    "id": "N6",
    "order": 6,
    "section": "0. 導入：AI-EBM先生に学ぶ",
    "title": "それでは、これがどのような発想から生まれたのか？",
    "visual": {
      "type": "list",
      "data": {
        "ordered": true,
        "items": [
          { "text": "**EBM の本質** から、診療ガイドラインの定義を **「なぜ？」** から理解する" },
          { "text": "その理解の上で、診療ガイドラインの **作成プロセス** を学ぶ" },
          { "text": "推奨を決定する際の **深い考察** を共有する" }
        ]
      }
    },
    "narration": "これらの4原則は、単なる GRADE のルールではありません。すべて EBM の本質から導かれています。\n\n本日の講演では、「ふーん、そうなんだ」ではなく、「なるほど、だからそうなのか」という理解を目指します。\n\nそれでは、本編に入っていきましょう。"
  }
]
```

### 5.2 第1部抜粋（既存スライドの改訂版）— 主要スライド

```json
[
  {
    "id": "S6",
    "order": 12,
    "section": "1. 診療ガイドラインの定義を理解",
    "title": "EBMとは？",
    "visual": {
      "type": "quote",
      "data": {
        "text": "根拠に基づく医療（EBM）とは、個々の患者のケアに関する意思決定において、現在得られる最良の根拠を、良心的に、明示的に、そして思慮深く用いることである。",
        "citation": "Sackett DL, Rosenberg WM, Gray JA, Haynes RB, Richardson WS. BMJ 1996;312(7023):71-2."
      }
    },
    "narration": "EBMの古典的な定義です。ポイントは「個々の患者」「最良の根拠」「思慮深く」の3つ。\n\n「最良の根拠」とは何か、「思慮深く用いる」とはどういうことか — これを理解することが、診療ガイドラインを理解する出発点です。"
  },
  {
    "id": "S8",
    "order": 14,
    "section": "1. 診療ガイドラインの定義を理解",
    "title": "EBMの3つの基本原則",
    "visual": {
      "type": "list",
      "data": {
        "ordered": true,
        "items": [
          { "text": "最適な臨床決断には入手可能な最適なエビデンス、理想的には**システマティックレビュー**のエビデンスを必要とする" },
          { "text": "EBMは、エビデンスが信頼できるかどうか、すなわち診断検査・予後・治療選択肢についてどれほど確信をおけるものかを提供する" },
          { "text": "**エビデンスだけでは臨床決断をするのに決して十分ではない**" }
        ]
      }
    },
    "narration": "EBMの3つの基本原則。これは Users' Guides to the Medical Literature 第3版（2015）に明記されているものです。\n\n特に3つ目の「エビデンスだけでは十分ではない」が重要です。患者の価値観、コスト、実行可能性まで考えなければ、本当の臨床決断はできません。",
    "speakerNotes": "AI を使ったハルシネーションがある検索より、PubMed で SR を直接検索する方が確実、という補足が原スライドにある"
  },
  {
    "id": "S25",
    "order": 31,
    "section": "1. 診療ガイドラインの定義を理解",
    "title": "エビデンスの確実性を下げる5要因",
    "visual": {
      "type": "table",
      "data": {
        "headers": ["要因", "概念", "もし〜だったら"],
        "rows": [
          ["研究の限界 (risk of bias)", "limitation, risk of bias", "そのアウトカムの結果を構成する論文にバイアスが多く存在していたら"],
          ["非一貫性 (inconsistency)", "inconsistency", "論文間で結果が異なっていれば"],
          ["非直接性 (indirectness)", "indirectness", "想定した臨床の疑問の患者層と、選択した論文の患者層が異なっていれば"],
          ["不精確さ (imprecision)", "imprecision", "症例数の小さな精確でないデータばかりなら"],
          ["出版バイアス (publication bias)", "publication bias", "有意差がなく報告されなかった論文や、都合が悪く書かれなかったアウトカムが多そうなら"]
        ]
      }
    },
    "narration": "エビデンスの確実性を下げる5要因。これがGRADEアプローチの中核です。\n\nそれぞれの要因について、5つの「もし〜だったら」を考えていきます。これらをチェックすることで、「単なるメタ分析の結果」ではなく「どれくらい信頼できる結果か」を評価できます。"
  },
  {
    "id": "S33",
    "order": 39,
    "section": "1. 診療ガイドラインの定義を理解",
    "title": "診療ガイドラインの定義（IOM／HMD 2011）",
    "visual": {
      "type": "quote",
      "data": {
        "text": "診療ガイドラインとは、システマティックレビューによって得られたエビデンスと、代替的なケア選択肢の利益と害の評価に基づいて、患者ケアを最適化することを意図した推奨を含む記述である。",
        "citation": "Health and Medicine Division of the National Academies (旧 Institute of Medicine, IOM), 2011"
      }
    },
    "narration": "これが現在世界的に使われている診療ガイドラインの定義です。「ふーん、そうなんだ」ではなく、「なるほど、だからそうなのか」と理解できるように、ここまで一緒に考えてきました。\n\nキーワードは「システマティックレビュー」「利益と害の評価」「患者ケアの最適化」「推奨」。これらすべてに、必然的な理由があります。",
    "warnings": ["この定義に従っていないものは「信頼できない診療ガイドライン」となる"]
  }
]
```

### 5.3 第3部抜粋：推奨決定の深い考察

```json
[
  {
    "id": "S86",
    "order": 92,
    "section": "3. 推奨決定の深い考察",
    "title": "Good Practice Statement (GPS) の5要件",
    "visual": {
      "type": "table",
      "data": {
        "headers": ["#", "評価質問", "ポイント"],
        "rows": [
          ["1", "エビデンス収集・要約が、パネルの限られた時間の使い方として効率が悪いか？", "倫理的・人権的に代替案が選ばれない場合など"],
          ["2", "そのメッセージは実際の医療行為に必要か？", "パネルが必要性の根拠を文書中に示しているか"],
          ["3", "関連するすべてのアウトカムを考えても、**正味で大きなプラスの効果**を持つか", "正式な推奨手順を経なくても、健康その他のEtD基準にプラスの影響があるか"],
          ["4", "間接的なエビデンスを結びつける明確な根拠が文書化されているか", "推論の根拠が示されている"],
          ["5", "声明は明確で実行可能か", "何を・どこで・誰がするかが明示されている"]
        ],
        "caption": "GPSは5要件すべてを満たす必要がある"
      }
    },
    "narration": "Good Practice Statement、略してGPSは、エビデンスの確実性や推奨の強さの正式評価には適さないが、明確に必要な行動を示す声明です。\n\n発行するには、ここに示す5要件をすべて満たす必要があります。逆に言えば、信頼できるエビデンスベースのガイドラインなら、非公式な推奨は完全に避けられるはずです。"
  },
  {
    "id": "S99",
    "order": 105,
    "section": "3. 推奨決定の深い考察",
    "title": "「有意差なし」≠「差がない」",
    "visual": {
      "type": "table",
      "data": {
        "headers": ["解釈", "評価"],
        "rows": [
          ["「効果がない」と表現する", "✗ 誤り（\"差がない\"と等しい）"],
          ["「差があるとは言えない」", "△ 正確だが情報量が小さい"],
          ["「点推定では20%効果あり、稀に3%悪化〜48%効果の可能性が残る」と議論する", "◎ GRADEで推奨される姿勢"]
        ],
        "caption": "仮想例：新薬 vs プラセボ、リスク比 1.20（95%CI: −3% 〜 +48%）、P=0.091"
      }
    },
    "narration": "P値至上主義からの脱却が、近年の重要なテーマです。「有意差がない」ことは「差がない」ことを意味しません。\n\n帰無仮説を棄却できなくても、治療がアウトカムに影響しないとは言えない。点推定値と95%信頼区間の幅を見て、臨床的に意味のある効果があり得るかを議論する — これがGRADEで推奨される姿勢です。\n\n参考：Amrhein V, et al. Nature 2019; \"Scientists rise up against statistical significance\""
  }
]
```

### 5.4 残りスライドのデータ生成方針

すべての 112 スライドを完全に書き出すと冗長なため、以下の方針で実装する：

1. **新規 N1〜N6** ：上記 5.1 にすべて記載
2. **既存スライドのうち改訂版があるもの** （約30枚）：本仕様書の元になった改訂案ドキュメント（別アーティファクト「診療ガイドラインスライド改訂案（全106枚）」）から JSON 化する
3. **残りの既存スライド** （約76枚）：オリジナルの PowerPoint JSON（`extracted.json`）から `narration` を生成し、`visual` を type 推定で構築

### 5.5 データ生成の実装ヒント（Claude Code 向け）

```typescript
// scripts/build-slides.ts （Claude Codeに作成を依頼）
// 1. extracted.json を読み込み
// 2. 改訂版がある slide_index は revision-doc から JSON 化
// 3. 改訂版がない slide_index は extracted.json の text_frame から narration 抽出、
//    table があれば visual.type='table', 段落主体なら visual.type='card' とする
// 4. 結果を public/data/slides.json に書き出し
```

---

## 6. 実装ガイド

### 6.1 ディレクトリ構造（Next.js App Router の例）

```
/
├── app/
│   ├── layout.tsx              // 全体レイアウト
│   ├── page.tsx                // ルート → スライド1へリダイレクト
│   ├── slide/
│   │   └── [id]/
│   │       └── page.tsx        // 各スライドページ
│   ├── present/
│   │   └── [id]/
│   │       └── page.tsx        // 講演モード（PC用）
│   └── globals.css
├── components/
│   ├── SlideContainer.tsx
│   ├── VisualPanel.tsx
│   ├── VisualRenderer/
│   │   ├── CardVisual.tsx
│   │   ├── TableVisual.tsx
│   │   ├── ComparisonVisual.tsx
│   │   ├── QuoteVisual.tsx
│   │   ├── ListVisual.tsx
│   │   └── ImageVisual.tsx
│   ├── NarrationPanel.tsx
│   ├── NavBar.tsx
│   ├── NavFooter.tsx
│   ├── ProgressBar.tsx
│   └── TableOfContents.tsx
├── lib/
│   ├── slides.ts               // データ取得関数
│   └── store.ts                // Zustand ストア
├── public/
│   ├── data/
│   │   └── slides.json
│   └── images/
│       └── [既存PowerPointから抽出した画像]
├── scripts/
│   └── build-slides.ts         // データ生成スクリプト
└── package.json
```

### 6.2 主要コンポーネントの責務

#### `<SlideContainer>` （スマホ／PC通常モード）
```tsx
<SlideContainer>
  <ProgressBar current={order} total={total} />
  <NavBar />
  <main className="flex flex-col md:flex-row">
    <VisualPanel slide={slide} />     {/* 上 or 左 */}
    <NarrationPanel slide={slide} />  {/* 下 or 右 */}
  </main>
  <NavFooter prevId={prevId} nextId={nextId} />
</SlideContainer>
```

#### `<VisualRenderer>` （ビジュアルタイプ別ディスパッチ）
```tsx
function VisualRenderer({ visual }: { visual: Visual }) {
  switch (visual.type) {
    case 'card':       return <CardVisual data={visual.data} />;
    case 'table':      return <TableVisual data={visual.data} />;
    case 'comparison': return <ComparisonVisual data={visual.data} />;
    case 'quote':      return <QuoteVisual data={visual.data} />;
    case 'list':       return <ListVisual data={visual.data} />;
    case 'image':      return <ImageVisual data={visual.data} />;
  }
}
```

### 6.3 ナビゲーションの実装ヒント

- **次へ／戻る**：`router.push('/slide/' + nextId)`、Framer Motion で水平スライド
- **目次**：モーダルで全スライドリスト、セクション折りたたみ可
- **キーボード**：`useKeyboardShortcut` カスタムフックで `→` / `←` / `Space` をリスニング
- **スワイプ**：`react-swipeable` パッケージなど

### 6.4 講演モード（16:9）の実装ヒント

- Fullscreen API：`document.documentElement.requestFullscreen()`
- アスペクト比固定：CSS `aspect-ratio: 16 / 9` または `padding-top: 56.25%`
- ルート：`/present/[id]` で別レイアウト（NarrationPanel を表示しない）
- Esc で講演モード終了

---

## 7. 開発フェーズ提案

### Phase 1: MVP（1〜2週間）
- スマホレイアウトのみ
- N1〜N6 + 主要改訂スライド（〜30枚）のデータ
- 基本ナビゲーション（次／戻る／目次／最初に戻る）
- 進捗バー
- ビジュアルタイプ：card, table, comparison, quote, list

### Phase 2: PC対応（1週間）
- PC通常モード（読書レイアウト）
- 残りのスライドデータ作成（オリジナルから自動生成 + 手動調整）
- キーボードショートカット
- 画像対応

### Phase 3: 講演モード（1週間）
- PC 16:9 講演モード
- 講演者ノート別ウィンドウ
- フルスクリーン対応

### Phase 4: 拡張（任意）
- ダークモード
- フォントサイズ調整
- ブックマーク
- 用語集

---

## 8. 重要な注意事項（Claude Code への申し送り）

### 8.1 コンテンツの著作権・正確性
- GRADEアプローチの内容は **公式日本語訳（Minds／コクラン）** の用語を遵守
- 引用は元スライドにあるもののみ。**新たな主張・引用を追加しない**

### 8.2 AI-EBM 先生について
- 本セッション専用の **架空の教育用キャラクター**
- 実在の特定の人物を表すものではない
- スライド N3 で必ず「架空」と明示
- 画像・アイコンを使う場合、特定の実在人物を連想させるものにしない

### 8.3 仮想例の数値の取り扱い
- N3 の「HR 0.85」「4本のRCT」などは **教育用の仮想例**
- 既存スライド20〜23 の Yuasa et al. などの仮想例と整合させてある
- 実データでないことを明示

### 8.4 警告事項の表示
- スライドデータの `warnings` フィールドは目立つように表示（例：黄色背景）

### 8.5 既存スライドの「役割の曖昧さ」
- 既存スライド46〜52 で「the guideline development group」が曖昧
- このアプリでは、改訂版ドキュメントに従い「⚠ 原文では曖昧。要確認」と注記表示

---

## 9. 参考資料

### 元データ
- 元 PowerPoint 抽出 JSON：`extracted.json`（106 スライド）
- 改訂案ドキュメント：別アーティファクト「診療ガイドラインスライド改訂案（全106枚）」
- 抽出画像：`extracted_output/images/` 配下

### GRADE関連の参考リンク（解説で使う場合）
- Minds ガイドラインライブラリ：https://minds.jcqhc.or.jp/
- GRADE Working Group：https://www.gradeworkinggroup.org/
- GIN-McMaster Guideline Development Checklist：https://cebgrade.mcmaster.ca/guidecheck.html
- Lima JP, et al. *Fam Med Community Health* 2023;11(4):e002437.

### EBM 古典文献
- Sackett DL, et al. *BMJ* 1996;312(7023):71-2.
- Users' Guides to the Medical Literature, 3rd Edition (2015)

---

## 10. Claude Code への依頼テンプレート

以下を Claude Code に貼り付けて実装を依頼してください：

````
このリポジトリで、診療ガイドラインGRADE学習Webアプリを作りたい。

仕様書は `spec.md`（このドキュメントを保存したもの）に記載。
要件まとめ：
- Next.js 14 + Tailwind + Zustand + Framer Motion
- スマホ／PC通常／PC 16:9講演モードの3レイアウト対応
- N1〜N6 と主要改訂スライドを `public/data/slides.json` に格納
- 全112スライドへの拡張は Phase 2 以降

まず Phase 1 の MVP として、以下を実装してください：
1. プロジェクト初期化（Next.js, Tailwind, Zustand）
2. スライドデータの型定義（`lib/types.ts`）
3. 仕様書の 5.1, 5.2, 5.3 の JSON を `public/data/slides.json` として配置
4. 主要コンポーネント：SlideContainer, VisualPanel, NarrationPanel, NavBar, NavFooter, ProgressBar, TableOfContents
5. ビジュアルレンダラー：card, table, comparison, quote, list
6. ルーティング：`/slide/[id]`
7. スマホレイアウトを優先実装

完成後に動作確認できるよう、`npm run dev` で起動できる状態にしてください。
````

---

*この仕様書は、診療ガイドラインのGRADEアプローチをスマホで学べるWebアプリ実現のための技術仕様です。コンテンツの正確性・教育的価値を最優先に設計してください。*
