#!/usr/bin/env node
// Step 12 (Phase 1):
//  プレースホルダー本文を持つカードスライド (14 枚) と、
//  S93 (S92 と同タイトルでぐちゃぐちゃの card) を、元 PPT のレンダリング画像
//  (slides-full/slideNNN.jpg) を用いた slideImage に差し替える。
//
//  スライド本文を AI 生成すると hallucination のリスクがあるため、本ステップ
//  では「元 PPT そのままの画像」を確実な真実として採用する。narration は維持。
//
//  実行: cd web && node scripts/step12-fix-placeholders.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SLIDES_JSON = path.resolve(__dirname, "..", "public", "data", "slides.json");
const PLACEHOLDER_TEXT = "解説テキストが含まれていません";

const data = JSON.parse(fs.readFileSync(SLIDES_JSON, "utf8"));

// S{n} → slideNNN.jpg 変換
function pad3(n) {
  return String(n).padStart(3, "0");
}

const targetIds = new Set();

// (a) プレースホルダー body を持つ card
for (const slide of data.slides) {
  if (
    slide.visual?.type === "card" &&
    typeof slide.visual.data?.body === "string" &&
    slide.visual.data.body.includes(PLACEHOLDER_TEXT)
  ) {
    targetIds.add(slide.id);
  }
}

// (b) S93 (S92 と同タイトル、card で内容が断片的)
targetIds.add("S93");

let converted = 0;
for (const id of targetIds) {
  const slide = data.slides.find((x) => x.id === id);
  if (!slide || !id.startsWith("S")) continue;
  const num = Number(id.slice(1));
  if (!Number.isFinite(num)) continue;
  const file = `slide${pad3(num)}.jpg`;
  const filePath = path.resolve(__dirname, "..", "public", "images", "slides-full", file);
  if (!fs.existsSync(filePath)) {
    console.warn(`  skip ${id}: ${file} not found`);
    continue;
  }
  slide.visual = {
    type: "slideImage",
    data: {
      src: `/images/slides-full/${file}`,
      alt: slide.title,
    },
  };
  converted += 1;
}

data.meta.version = "0.8.0-step12-fix-placeholders";

fs.writeFileSync(SLIDES_JSON, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log(`Converted ${converted} placeholder/shoddy slides to slideImage`);
console.log(`Targets: ${[...targetIds].sort().join(", ")}`);
