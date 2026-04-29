#!/usr/bin/env node
// Step 13 (Phase 2 第 1 弾): 重複スライドの統合・差別化
//
//  - S38/S43: 同じ Lima/Guyatt 2023 比較表 → S43 を削除、narration を S38 に統合
//  - S39/S40: 「悪い解説文の例」 (S39) と「その問題点」 (S40)
//             → S40 タイトルを「— その問題点はここ」 に変更し、流れを明示
//  - S58/S59: 元 PPT 作者が「Skip OK」 と明示している詳細リファレンス
//             → slideImage に変換し、narration で optional 章であることを明示
//  - S96/S97: EtD framework (3) — 内容が異なるので副題で差別化
//
//  実行: cd web && node scripts/step13-merge-dups.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SLIDES_JSON = path.resolve(__dirname, "..", "public", "data", "slides.json");

const data = JSON.parse(fs.readFileSync(SLIDES_JSON, "utf8"));

function slideById(id) {
  return data.slides.find((s) => s.id === id);
}

// (1) S38: narration に S43 の補足を統合
const s38 = slideById("S38");
if (s38) {
  s38.narration =
    "**信頼できるガイドライン vs 信頼できないガイドライン** の 8 観点比較表 (Lima/Guyatt 2023) を見てください。\n\n" +
    "**信頼できる側**: 推奨が明確で実行可能 / 多様なステークホルダーで構成 / COI 開示・管理 / PICO で患者重要アウトカムを設定 / 最良の SR に基づく / 患者の価値観を明示的に配慮 / 確実性と推奨の強さを区別 / SoF 表で絶対リスクを提示。\n\n" +
    "**信頼できない側**: 推奨が曖昧 / 関係者 (患者など) の視点が欠落 / COI 不明 / 委員会の関心事だけ / 質の低い SR・GOBSAT / 価値観を無視 / アップサイドとダウンサイドのトレードオフを評価しない / 確実性が示されない or 相対リスクのみ。\n\n" +
    "推奨を提示する際には **正当性・サブグループ検討・実施に関わる事項・今後の研究課題** など多岐の情報を併記することも必須です。「ただ推奨します」 と書くだけのガイドラインは信頼できないものの典型 — **EtD 表 + Remarks/Justification を充実させる** ことが透明性確保の核心です。";
}

// (2) S43 を削除 (S38 に統合済み)
data.slides = data.slides.filter((s) => s.id !== "S43");

// (3) S40 タイトルを変更
const s40 = slideById("S40");
if (s40) {
  s40.title = "前ページの解説文の何が問題か — 批判的吟味";
}

// (4) S58 / S59 を slideImage に変換 (元 PPT 作者の「Skip OK」 意図を保持)
for (const id of ["S58", "S59"]) {
  const s = slideById(id);
  if (!s) continue;
  const num = Number(id.slice(1));
  const file = `slide${String(num).padStart(3, "0")}.jpg`;
  s.visual = {
    type: "slideImage",
    data: {
      src: `/images/slides-full/${file}`,
      alt: s.title,
    },
  };
}
// narration を「Skip OK」と明示するように差し替え
const s58 = slideById("S58");
if (s58) {
  s58.title = "診断検査について（参考） — 飛ばしてOKの詳細リファレンス";
  s58.narration =
    "*ここは、流して読んでください。実際にガイドラインを作る場面で、困ったときだけ戻れば大丈夫です。* (元 PPT 作者の注記)\n\n" +
    "**診断検査の疑問** は、「検査のために検査をする」 のではなく、検査結果に基づいて選ぶ治療やそれによって変わる **患者重要アウトカム** から考える必要があります。\n\n" +
    "診断検査の評価は **2 つの軸** : ① 検査精度そのもの (感度・特異度など) と確実性、② その検査を行うことが行わない場合に比べて (または A vs B 検査で) **予後・死亡率を変えるか** という臨床効果。**実際に ② のデータはほとんど無い** — そこが診断検査ガイドラインの難しさです。";
}
const s59 = slideById("S59");
if (s59) {
  s59.title = "診断検査について（参考） — 補足の方法論";
  s59.narration =
    "*前ページに続く詳細リファレンスです。困ったときだけ戻ってください。*\n\n" +
    "診断精度研究には **one-gate design / two-gate design** の区別があります。**新しい検査だけ評価** (one-gate) より **既存の参照検査と並行比較** (two-gate) のほうが現実的に近いが、研究設計が複雑になります。\n\n" +
    "実際の診療ガイドラインでは、「A 検査に対して B 検査を使うべきか (患者にとって重要なアウトカム)」 が基本問題で、その中に検査精度のメタ分析が組み込まれる構造になります。";
}

// (5) S96 / S97 のタイトル差別化
const s96 = slideById("S96");
if (s96) {
  s96.title = "Evidence to Decision framework（3） — 判断の集約";
}
const s97 = slideById("S97");
if (s97) {
  s97.title = "Evidence to Decision framework（3） — 推奨の方向性と投票";
}

// (6) order 再採番
data.slides.sort((a, b) => a.order - b.order);
data.slides.forEach((s, i) => {
  s.order = i + 1;
});

data.meta.version = "0.9.0-step13-merge-dups";

fs.writeFileSync(SLIDES_JSON, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log(`Step 13 complete: ${data.slides.length} slides total (S43 merged into S38)`);
