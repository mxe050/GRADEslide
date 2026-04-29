#!/usr/bin/env node
// Step 14 (Phase 3 第 1 弾): Rich styling 適用
//
//  - S4: AI vs PubMed の信頼性問いかけ → accent="warning"
//  - S5: EBM/SR/CPG の定義の重要性 → accent="info"
//  - S37: 元 PPT に漫画キャラと色付きボックスのリッチ設計 → slideImage
//  - S46: 4 役割の構造説明 → 2 列テーブル (役割 | 責任) で整理
//  - S80: 元 PPT 作者の「Skip OK」 詳細 → slideImage
//  - S104: MID forest plot 図解付き → slideImage
//  - S106: EBM 定義 + 矢印フローの最終まとめ → slideImage
//
//  実行: cd web && node scripts/step14-rich-styling.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SLIDES_JSON = path.resolve(__dirname, "..", "public", "data", "slides.json");
const data = JSON.parse(fs.readFileSync(SLIDES_JSON, "utf8"));

function get(id) {
  return data.slides.find((s) => s.id === id);
}

function toSlideImage(id) {
  const s = get(id);
  if (!s) return false;
  const num = Number(id.slice(1));
  const file = `slide${String(num).padStart(3, "0")}.jpg`;
  s.visual = {
    type: "slideImage",
    data: {
      src: `/images/slides-full/${file}`,
      alt: s.title,
    },
  };
  return true;
}

// (1) S4: warning accent
const s4 = get("S4");
if (s4 && s4.visual.type === "card") {
  s4.visual.data.accent = "warning";
}

// (2) S5: info accent
const s5 = get("S5");
if (s5 && s5.visual.type === "card") {
  s5.visual.data.accent = "info";
}

// (3) S37: slideImage
toSlideImage("S37");

// (4) S46: 2 列テーブル化
const s46 = get("S46");
if (s46) {
  s46.title = "1. 組織体制 — 4 つの役割分担";
  s46.visual = {
    type: "table",
    data: {
      headers: ["役割", "責任"],
      rows: [
        [
          "**統括委員会・監視委員会**",
          "作成全体の責任。コーディネーターを含む場合あり。**最終的な GL を承認**、guideline development group を編成。",
        ],
        [
          "**ガイドラインパネル**",
          "**患者・市民を含む** 専門知識のあるグループ。推奨を作成。一部は統括委員会と兼任。",
        ],
        [
          "**医療利用者と関係者**",
          "外部・内部から意見提供。パネルメンバー、または臨床疑問・アウトカム評価のみへ参加。",
        ],
        [
          "**ワーキンググループ**",
          "SR 班・特定トピックスの技術的専門家。**資料の作成** を担当。",
        ],
      ],
      caption:
        "全体を 'guideline development group' と総称する場合と、統括委員会のみを指す場合があり — 用語を見たら誰を指しているか確認すること",
    },
  };
}

// (5) S80: slideImage
toSlideImage("S80");

// (6) S104: slideImage
toSlideImage("S104");

// (7) S106: slideImage
toSlideImage("S106");

data.meta.version = "0.10.0-step14-rich-styling";

fs.writeFileSync(SLIDES_JSON, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log("Step 14 complete. Changes:");
console.log("  S4 → accent=warning");
console.log("  S5 → accent=info");
console.log("  S37, S80, S104, S106 → slideImage");
console.log("  S46 → 2-column table");
