#!/usr/bin/env node
// Step 15 (Phase 2-2): セクション 2 の card 型を slideImage に一括変換
//
// 目的:
//  - 既存の card narration はスライドのトピックと off-by-one でずれており
//    本文と解説が食い違っていた。
//  - 元 PPT の slideNNN.jpg を slideImage として採用することで、
//    本文(画像)と解説の不整合を解消し、原典忠実性を担保。
//  - narration の整流は次ステップ以降で行う。
//
//  対象 (text-heavy で原 PPT に意味あるレイアウトがあるもの):
//    S42, S44, S47-S57, S60-S62, S65, S74-S76, S78, S81, S88
//
//  実行: cd web && node scripts/step15-bulk-slideimage.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SLIDES_JSON = path.resolve(__dirname, "..", "public", "data", "slides.json");
const data = JSON.parse(fs.readFileSync(SLIDES_JSON, "utf8"));

const TARGETS = [
  "S42", "S44", "S47", "S48", "S49", "S50", "S51", "S52", "S53",
  "S54", "S55", "S56", "S57", "S60", "S61", "S62", "S65",
  "S74", "S75", "S76", "S78", "S81", "S88",
];

let converted = 0;
for (const id of TARGETS) {
  const s = data.slides.find((x) => x.id === id);
  if (!s) continue;
  if (s.visual.type !== "card") continue;
  const num = Number(id.slice(1));
  const file = `slide${String(num).padStart(3, "0")}.jpg`;
  const filePath = path.resolve(
    __dirname, "..", "public", "images", "slides-full", file
  );
  if (!fs.existsSync(filePath)) {
    console.warn(`  skip ${id}: ${file} not found`);
    continue;
  }
  s.visual = {
    type: "slideImage",
    data: {
      src: `/images/slides-full/${file}`,
      alt: s.title,
    },
  };
  converted += 1;
}

data.meta.version = "0.11.0-step15-bulk-slideimage";

fs.writeFileSync(SLIDES_JSON, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log(`Step 15 complete: converted ${converted}/${TARGETS.length} cards to slideImage`);
