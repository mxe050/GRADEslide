#!/usr/bin/env node
// Step 16 (Phase 2-3): セクション 2 前半 (S42-S57) の narration 整流
//
//  既存 narration の topic がスライドの 1 つ後にずれていたため、
//  S46-S57 は narration を 1 スライド戻す形で realign する (S46 ← old S45,
//  S47 ← old S46, ...)。S42, S44, S45 は元 PPT 画像に基づく新しい narration を
//  書き起こす (slide042/044/045.jpg を直接読んで内容を反映)。
//
//  実行: cd web && node scripts/step16-realign-narrations-s42-s57.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SLIDES_JSON = path.resolve(__dirname, "..", "public", "data", "slides.json");
const data = JSON.parse(fs.readFileSync(SLIDES_JSON, "utf8"));

function get(id) {
  return data.slides.find((s) => s.id === id);
}

// 既存 narration を保存 (S45-S57)
const oldNar = {};
["S45","S46","S47","S48","S49","S50","S51","S52","S53","S54","S55","S56","S57"].forEach(
  id => { const s = get(id); if (s) oldNar[id] = s.narration; }
);

// (1) S42: 元 PPT 画像 (slide042.jpg) ベースの新 narration
const s42 = get("S42");
if (s42) {
  s42.narration =
    "ここから先は **GRADE アプローチを作成しているグループの主要メンバー** が中心となって運営する **INGUIDE (International Guideline Training and Certification Program — https://inguide.org/)** が公開している、ガイドラインパネリスト認定の必須知識です。\n\n" +
    "本スライド以降は同コースの **CERTIFIED GUIDELINE GROUP OR PANEL MEMBER** に準じて解説しますが、著作権の観点から、解説は **GIN-McMaster Guideline Development Checklist** (公開資料) を使った本スライド作成者の視点でお伝えします。\n\n" +
    "*情報の羅列が続いて少し苦行のような部分もありますが、作成委員・パネリストになる方には必須の知識ばかりです。*";
  s42.citationIds = ["panelGRADE", "iom2011", "coreGRADE0"];
}

// (2) S44: 元 PPT 画像 (slide044.jpg) ベースの新 narration
const s44 = get("S44");
if (s44) {
  s44.narration =
    "**診療ガイドラインは推奨文だけで成り立つものではありません**。EtD (Evidence-to-Decision) フレームワークでは、推奨に併記すべき要素として以下が挙げられています:\n\n" +
    "**説明書類 / 背景情報 / 正当性 (解説) / サブグループに関する検討事項 / 関連する可能性がある他の推奨**。\n\n" +
    "さらに、**実施にかかわる検討事項・監視と評価・研究上の優先事項** などの「その他」項目も含めて記載します。\n\n" +
    "「ただ推奨します」 と書くだけのガイドラインは、**信頼できないガイドラインの典型** です。";
  s44.citationIds = ["coreGRADE7", "etdSchunemann2016", "subgroupGRADE"];
}

// (3) S45: 元 PPT 画像 (slide045.jpg = 全体フローチャート) ベースの新 narration
const s45 = get("S45");
if (s45) {
  s45.narration =
    "これがガイドライン作成の **全体フローチャート** で、**GIN-McMaster Guideline Development Checklist** (https://cebgrade.mcmaster.ca/guidecheck.html) として公開されています。\n\n" +
    "**中央** にガイドライングループ (監視委員会・パネル・ワーキンググループ・関係者) が居り、**左側** に組織・予算・計画/トレーニングと利益相反、**右側** に効果評価・アウトカム重要度・価値観・リソース・公平性。**下流** で推奨作成 → 文言 → 報告 → 配布 → 評価 → 更新と進みます。\n\n" +
    "大量のステップに見えますが、**EBM の 5 ステップを「組織として」 透明性を担保しながら実行する形**、と捉えると見通しが良くなります。";
  s45.citationIds = ["panelGRADE", "iom2011", "coreGRADE0"];
}

// (4) S46-S57: narration を 1 スライド戻す (shift back by 1)
const SHIFT_PAIRS = [
  ["S46", "S45"],
  ["S47", "S46"],
  ["S48", "S47"],
  ["S49", "S48"],
  ["S50", "S49"],
  ["S51", "S50"],
  ["S52", "S51"],
  ["S53", "S52"],
  ["S54", "S53"],
  ["S55", "S54"],
  ["S56", "S55"],
  ["S57", "S56"],
];

for (const [target, source] of SHIFT_PAIRS) {
  const s = get(target);
  if (!s) continue;
  if (oldNar[source]) {
    s.narration = oldNar[source];
  }
}

data.meta.version = "0.12.0-step16-realign-s42-s57";

fs.writeFileSync(SLIDES_JSON, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log("Step 16 complete:");
console.log("  S42, S44, S45 → narrations rewritten from PPT images");
console.log("  S46-S57 → narrations shifted back by 1 (off-by-one fix)");
