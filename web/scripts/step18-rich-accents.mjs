#!/usr/bin/env node
// Step 18 (Phase 3-2): 残カードへ accent 配色を適用 + S80 narration 整流
//
//  - S7, S9, S10: info (青系) — 基礎知識の導入
//  - S30: warning (黄) — 「従来のSR」の限界を示すスライド
//  - S32: good (緑) — まとめスライド
//  - S36: info (青系) — 「推奨とは」 の説明
//  - S39: warning (黄) — 悪いガイドライン解説文の例示
//  - S40: critical (赤) — その問題点を批判的に分析
//  - S80: narration を Skip OK 注記に整流 (タイトルは「ここは流して
//    ください」 だが本文は WHO 分類になっていた)
//
//  実行: cd web && node scripts/step18-rich-accents.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SLIDES_JSON = path.resolve(__dirname, "..", "public", "data", "slides.json");
const data = JSON.parse(fs.readFileSync(SLIDES_JSON, "utf8"));

function get(id) { return data.slides.find((s) => s.id === id); }

const ACCENT_MAP = {
  S7: "info",
  S9: "info",
  S10: "info",
  S30: "warning",
  S32: "good",
  S36: "info",
  S39: "warning",
  S40: "critical",
};

let applied = 0;
for (const [id, accent] of Object.entries(ACCENT_MAP)) {
  const s = get(id);
  if (!s || s.visual.type !== "card") continue;
  s.visual.data.accent = accent;
  applied += 1;
}

// S80: タイトルが「ここは、こんな感じと、流してください。」 = Skip OK 注記なので、
//      narration もその意図に合わせる (旧 narration の WHO 分類内容は次の S81 へ移動)。
const s80 = get("S80");
const s81 = get("S81");
if (s80 && s81) {
  // S81 が現在の narration を引き継ぐ (元 S80 narration は WHO 分類を語っていた)
  if (s80.narration && s80.narration.includes("推奨文以外")) {
    s81.narration = s80.narration;
  }
  s80.narration =
    "*ここは、こんな感じだ、と流して読んでください。実際にガイドラインを作る場面で、困ったときだけ戻れば大丈夫です。* (元 PPT 作者の注記)\n\n" +
    "次のスライド以降は **WHO 文書を元にした、診療ガイドライン上の声明・推奨の分類** に関する詳細リファレンスです。**推奨 / Good Practice Statement / 実装上の考慮事項 / 非公式な推奨** など、ガイドライン作成側で使う用語を整理しています。";
}

data.meta.version = "0.14.0-step18-accents";

fs.writeFileSync(SLIDES_JSON, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log(`Step 18 complete: applied ${applied} accents + S80 narration realigned`);
